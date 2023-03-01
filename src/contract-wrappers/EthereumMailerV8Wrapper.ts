import { BigNumber, ethers } from 'ethers';
import { YlideMailerV8, YlideMailerV8__factory } from '@ylide/ethereum-contracts';
import { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import { IMessageContent, IMessageCorruptedContent, Uint256 } from '@ylide/sdk';
import { BlockNumberRingBufferIndex } from '../controllers/misc/BlockNumberRingBufferIndex';
import {
	MessageContentEvent,
	MailPushEvent,
	BroadcastPushEvent,
	MailPushEventObject,
	BroadcastPushEventObject,
	MessageContentEventObject,
} from '@ylide/ethereum-contracts/lib/YlideMailerV8';
import {
	bnToUint256,
	EVM_CONTRACT_TO_NETWORK,
	EVM_NAMES,
	IEventPosition,
	IEVMEnrichedEvent,
	IEVMEvent,
	IEVMMailerContractLink,
	IEVMMessage,
} from '../misc';
import { decodeEvmMsgId, encodeEvmMsgId } from '../misc/evmMsgId';
import SmartBuffer from '@ylide/smart-buffer';
import { TypedEvent, TypedEventFilter } from '@ylide/ethereum-contracts/lib/common';
import { ethersEventToInternalEvent, EventParsed } from '../controllers/helpers/ethersHelper';
import { decodeContentId } from '../misc/contentId';
import { EthereumContentReader, GenericMessageContentEventObject } from '../controllers/helpers/EthereumContentReader';
import { ContractCache } from './ContractCache';
import { LogDescription } from '@ethersproject/abi';

export class EthereumMailerV8Wrapper {
	public readonly cache: ContractCache<YlideMailerV8>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlideMailerV8__factory, blockchainReader);
	}

	static async deploy(signer: ethers.Signer, from: string) {
		const factory = new YlideMailerV8__factory(signer);
		return (await factory.deploy()).address;
	}

	mailPushLogToEvent(log: {
		log: ethers.providers.Log;
		logDescription: ethers.utils.LogDescription;
	}): IEVMEvent<MailPushEventObject> {
		return {
			blockNumber: log.log.blockNumber,
			blockHash: log.log.blockHash,

			transactionHash: log.log.transactionHash,
			transactionIndex: log.log.transactionIndex,

			logIndex: log.log.logIndex,

			eventName: log.logDescription.name,
			topics: log.log.topics,
			data: log.log.data,

			parsed: log.logDescription.args as unknown as MailPushEventObject,
		};
	}

	broadcastPushLogToEvent(log: {
		log: ethers.providers.Log;
		logDescription: ethers.utils.LogDescription;
	}): IEVMEvent<BroadcastPushEventObject> {
		return {
			blockNumber: log.log.blockNumber,
			blockHash: log.log.blockHash,

			transactionHash: log.log.transactionHash,
			transactionIndex: log.log.transactionIndex,

			logIndex: log.log.logIndex,

			eventName: log.logDescription.name,
			topics: log.log.topics,
			data: log.log.data,

			parsed: log.logDescription.args as unknown as BroadcastPushEventObject,
		};
	}

	validateMessage(mailer: IEVMMailerContractLink, message: IEVMMessage | null) {
		if (!message) {
			return;
		}
		try {
			const decodedId = decodeEvmMsgId(message.msgId);
			if (decodedId.contractId === mailer.id) {
				return;
			}
		} catch (e) {
			// ignore
		}
		throw new Error('Invalid message: not from this contract');
	}

	processMailPushEvent(mailer: IEVMMailerContractLink, event: IEVMEnrichedEvent<MailPushEventObject>): IEVMMessage {
		return {
			isBroadcast: false,
			feedId: bnToUint256(event.event.parsed.feedId),
			msgId: encodeEvmMsgId(
				false,
				mailer.id,
				event.event.blockNumber,
				event.event.transactionIndex,
				event.event.logIndex,
			),
			createdAt: event.block.timestamp,
			senderAddress: event.tx.from,
			recipientAddress: bnToUint256(event.event.parsed.recipient),
			blockchain: EVM_NAMES[EVM_CONTRACT_TO_NETWORK[mailer.id]],
			key: SmartBuffer.ofHexString(event.event.parsed.key.replace('0x', '')).bytes,
			$$meta: {
				contentId: bnToUint256(event.event.parsed.contentId),
				index: BlockNumberRingBufferIndex.decodeIndexValue(
					bnToUint256(event.event.parsed.previousFeedEventsIndex),
				),
				...event,
			},
		};
	}

	processBroadcastPushEvent(
		mailer: IEVMMailerContractLink,
		event: IEVMEnrichedEvent<BroadcastPushEventObject>,
	): IEVMMessage {
		return {
			isBroadcast: true,
			feedId: bnToUint256(event.event.parsed.feedId),
			msgId: encodeEvmMsgId(
				true,
				mailer.id,
				event.event.blockNumber,
				event.event.transactionIndex,
				event.event.logIndex,
			),
			createdAt: event.block.timestamp,
			senderAddress: event.tx.from,
			recipientAddress: '0'.repeat(64) as Uint256,
			blockchain: EVM_NAMES[EVM_CONTRACT_TO_NETWORK[mailer.id]],
			key: new Uint8Array(0),
			$$meta: {
				contentId: bnToUint256(event.event.parsed.contentId),
				index: BlockNumberRingBufferIndex.decodeIndexValue(
					bnToUint256(event.event.parsed.previousFeedEventsIndex),
				),
				...event,
			},
		};
	}

	async retrieveHistoryDesc<T extends TypedEvent>(
		mailer: IEVMMailerContractLink,
		getBaseIndex: () => Promise<number[]>,
		getFilter: (contract: YlideMailerV8) => TypedEventFilter<T>,
		processEvent: (event: IEVMEnrichedEvent<EventParsed<T>>) => IEVMMessage,
		fromMessage: IEVMMessage | null,
		includeFromMessage: boolean,
		toMessage: IEVMMessage | null,
		includeToMessage: boolean,
		limit: number | null,
	): Promise<IEVMMessage[]> {
		this.validateMessage(mailer, fromMessage);
		this.validateMessage(mailer, toMessage);

		const parseFull = (e: T): IEventPosition & { index: number[] } => {
			return {
				blockNumber: e.blockNumber,
				transactionIndex: e.transactionIndex,
				logIndex: e.logIndex,
				index: BlockNumberRingBufferIndex.decodeIndexValue(bnToUint256(e.args.previousFeedEventsIndex)),
			};
		};

		return await this.cache.contractOperation(mailer, async (contract, provider, blockLimit) => {
			const preparedEvents = await BlockNumberRingBufferIndex.readIndexedEntries({
				parseFull,

				getBaseIndex,
				queryEntries: async (fromB, toB) => await contract.queryFilter(getFilter(contract), fromB, toB),

				getLastBlockNumber: () => provider.getBlockNumber(),

				blockLimit,

				fromEntry: fromMessage ? { ...fromMessage.$$meta.event, index: fromMessage.$$meta.index } : null,
				includeFromEntry: includeFromMessage,
				toEntry: toMessage ? { ...toMessage.$$meta.event, index: toMessage.$$meta.index } : null,
				includeToEntry: includeToMessage,

				limit: limit || undefined,
				divider: 128,
			});

			const enrichedEvents = await this.blockchainReader.enrichEvents<EventParsed<T>>(
				preparedEvents.map(g => ethersEventToInternalEvent(g)),
			);
			const messages = enrichedEvents.map(e => processEvent(e));
			return messages;
		});
	}

	async getRecipientToMailIndex(
		mailer: IEVMMailerContractLink,
		feedId: Uint256,
		recipient: Uint256,
	): Promise<number[]> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.getMailingFeedRecipientIndex(`0x${feedId}`, `0x${recipient}`);
			const index = bnToUint256(bn);
			return BlockNumberRingBufferIndex.decodeIndexValue(index);
		});
	}

	async getRecipientMessagesCount(
		mailer: IEVMMailerContractLink,
		feedId: Uint256,
		recipient: Uint256,
	): Promise<number> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.getMailingFeedRecipientMessagesCount(`0x${feedId}`, `0x${recipient}`);
			return bn.toNumber();
		});
	}

	async createBroadcastFeed(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		isPublic: boolean,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt; feedId: Uint256 | null }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.createBroadcastFeed(isPublic, { from });
		const receipt = await tx.wait();
		const feedId = receipt.events?.[0].args?.feedId ? bnToUint256(receipt.events?.[0].args?.feedId) : null;
		return { tx, receipt, feedId };
	}

	async createMailingFeed(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt; feedId: Uint256 | null }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.createMailingFeed({ from });
		const receipt = await tx.wait();
		const feedId = receipt.events?.[0].args?.feedId ? bnToUint256(receipt.events?.[0].args?.feedId) : null;
		return { tx, receipt, feedId };
	}

	async changeBroadcastFeedPublicity(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		isPublic: boolean,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.changeBroadcastFeedPublicity(`0x${feedId}`, isPublic, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async transferBroadcastFeedOwnership(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		newOwner: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.transferBroadcastFeedOwnership(`0x${feedId}`, newOwner, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async addBroadcastFeedWriter(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		writer: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.addBroadcastFeedWriter(`0x${feedId}`, writer, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async removeBroadcastFeedWriter(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		writer: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.removeBroadcastFeedWriter(`0x${feedId}`, writer, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async getBroadcastFeedMessageIndex(mailer: IEVMMailerContractLink, feedId: Uint256): Promise<number[]> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [owner, isPublic, messagesIndex, messagesCount] = await contract.functions.broadcastFeeds(
				`0x${feedId}`,
			);
			const index = bnToUint256(messagesIndex);
			return BlockNumberRingBufferIndex.decodeIndexValue(index);
		});
	}

	async getBroadcastFeedMessagesCount(mailer: IEVMMailerContractLink, feedId: Uint256): Promise<number> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [owner, isPublic, messagesIndex, messagesCount] = await contract.functions.broadcastFeeds(
				`0x${feedId}`,
			);
			return messagesCount.toNumber();
		});
	}

	async getMailingFeedParams(
		mailer: IEVMMailerContractLink,
		feedId: Uint256,
	): Promise<{ owner: string; beneficiary: string; recipientFee: BigNumber }> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [owner, beneficiary, recipientFee] = await contract.functions.mailingFeeds(`0x${feedId}`);
			return {
				owner,
				beneficiary,
				recipientFee: recipientFee.div('1000000000000000000'),
			};
		});
	}

	async getBroadcastFeedOwner(mailer: IEVMMailerContractLink, feedId: Uint256): Promise<string> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [owner, messagesIndex, messagesCount] = await contract.functions.broadcastFeeds(feedId);
			return owner;
		});
	}

	async isBroadcastFeedWriter(mailer: IEVMMailerContractLink, feedId: Uint256, address: string): Promise<boolean> {
		return await this.cache.contractOperation(mailer, async contract => {
			return await contract.isBroadcastFeedWriter(`0x${feedId}`, address);
		});
	}

	async isMailingFeedRecipient(
		mailer: IEVMMailerContractLink,
		feedId: Uint256,
		recipient: Uint256,
	): Promise<boolean> {
		return await this.cache.contractOperation(mailer, async contract => {
			return await contract.isMailingFeedRecipient(`0x${feedId}`, `0x${recipient}`);
		});
	}

	async getOwner(mailer: IEVMMailerContractLink): Promise<string> {
		return await this.cache.contractOperation(mailer, async contract => {
			return await contract.owner();
		});
	}

	async setOwner(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		owner: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.transferOwnership(owner, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async setMailingFeedOwner(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		owner: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.transferMailingFeedOwnership(`0x${feedId}`, owner, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async setMailingFeedBeneficiary(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		beneficiary: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.setMailingFeedBeneficiary(`0x${feedId}`, beneficiary, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async getBenificiary(mailer: IEVMMailerContractLink): Promise<string> {
		return await this.cache.contractOperation(mailer, async contract => {
			return await contract.beneficiary();
		});
	}

	async setBenificiary(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		beneficiary: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.setBeneficiary(beneficiary, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async getFees(
		mailer: IEVMMailerContractLink,
	): Promise<{ contentPartFee: BigNumber; recipientFee: BigNumber; broadcastFee: BigNumber }> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [contentPartFee] = await contract.functions.contentPartFee();
			const [recipientFee] = await contract.functions.recipientFee();
			const [broadcastFee] = await contract.functions.broadcastFee();

			return {
				contentPartFee: contentPartFee.div(BigNumber.from('1000000000000000000')),
				recipientFee: recipientFee.div(BigNumber.from('1000000000000000000')),
				broadcastFee: broadcastFee.div(BigNumber.from('1000000000000000000')),
			};
		});
	}

	async setFees(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		fees: { contentPartFee: BigNumber; recipientFee: BigNumber; broadcastFee: BigNumber },
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.setFees(
			fees.contentPartFee.mul(BigNumber.from('1000000000000000000')),
			fees.recipientFee.mul(BigNumber.from('1000000000000000000')),
			fees.broadcastFee.mul(BigNumber.from('1000000000000000000')),
			{ from },
		);
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async setMailingFeedFees(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		fees: { recipientFee: BigNumber },
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.setMailingFeedFees(
			`0x${feedId}`,
			fees.recipientFee.mul(BigNumber.from('1000000000000000000')),
			{ from },
		);
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async getPrices(
		mailer: IEVMMailerContractLink,
	): Promise<{ broadcastFeedCreationPrice: BigNumber; mailingFeedCreationPrice: BigNumber }> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [broadcastFeedCreationPrice] = await contract.functions.broadcastFeedCreationPrice();
			const [mailingFeedCreationPrice] = await contract.functions.mailingFeedCreationPrice();

			return {
				broadcastFeedCreationPrice: broadcastFeedCreationPrice.div(BigNumber.from('1000000000000000000')),
				mailingFeedCreationPrice: mailingFeedCreationPrice.div(BigNumber.from('1000000000000000000')),
			};
		});
	}

	async setPrices(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		prices: { broadcastFeedCreationPrice: BigNumber; mailingFeedCreationPrice: BigNumber },
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.setPrices(
			prices.broadcastFeedCreationPrice.mul(BigNumber.from('1000000000000000000')),
			prices.mailingFeedCreationPrice.mul(BigNumber.from('1000000000000000000')),
			{ from },
		);
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async sendSmallMail(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		uniqueId: number,
		recipient: Uint256,
		key: Uint8Array,
		content: Uint8Array,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.sendSmallMail(feedId, uniqueId, `0x${recipient}`, key, content, { from });
		const receipt = await tx.wait();
		const logs = receipt.logs.map(l => ({
			log: l,
			logDescription: contract.interface.parseLog(l),
		}));
		const mailPushEvents = logs
			.filter(l => l.logDescription.name === 'MailPush')
			.map(l => this.mailPushLogToEvent(l));
		const enriched = await this.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages };
	}

	async sendBulkMail(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		uniqueId: number,
		recipients: Uint256[],
		keys: Uint8Array[],
		content: Uint8Array,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.sendBulkMail(
			feedId,
			uniqueId,
			recipients.map(r => `0x${r}`),
			keys,
			content,
			{ from },
		);
		const receipt = await tx.wait();
		const logs = receipt.logs.map(l => ({
			log: l,
			logDescription: contract.interface.parseLog(l),
		}));
		const mailPushEvents = logs
			.filter(l => l.logDescription.name === 'MailPush')
			.map(l => this.mailPushLogToEvent(l));
		const enriched = await this.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages };
	}

	async addMailRecipients(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		uniqueId: number,
		firstBlockNumber: number,
		partsCount: number,
		blockCountLock: number,
		recipients: Uint256[],
		keys: Uint8Array[],
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.addMailRecipients(
			feedId,
			uniqueId,
			firstBlockNumber,
			partsCount,
			blockCountLock,
			recipients.map(r => `0x${r}`),
			keys,
			{ from },
		);
		const receipt = await tx.wait();
		const logs = receipt.logs.map(l => ({
			log: l,
			logDescription: contract.interface.parseLog(l),
		}));
		const mailPushEvents = logs
			.filter(l => l.logDescription.name === 'MailPush')
			.map(l => this.mailPushLogToEvent(l));
		const enriched = await this.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages };
	}

	async sendBroadcast(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		uniqueId: number,
		content: Uint8Array,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		broadcastPushEvents: IEVMEvent<BroadcastPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.sendBroadcast(`0x${feedId}`, uniqueId, content, { from });
		const receipt = await tx.wait();
		const logs = receipt.logs.map(l => ({
			log: l,
			logDescription: contract.interface.parseLog(l),
		}));
		const broadcastPushEvents = logs
			.filter(l => l.logDescription.name === 'BroadcastPush')
			.map(l => this.broadcastPushLogToEvent(l));
		const enriched = await this.blockchainReader.enrichEvents<BroadcastPushEventObject>(broadcastPushEvents);
		const messages = enriched.map(e => this.processBroadcastPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), broadcastPushEvents, messages };
	}

	async sendBroadcastHeader(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		uniqueId: number,
		firstBlockNumber: number,
		partsCount: number,
		blockCountLock: number,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		broadcastPushEvents: IEVMEvent<BroadcastPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.sendBroadcastHeader(
			`0x${feedId}`,
			uniqueId,
			firstBlockNumber,
			partsCount,
			blockCountLock,
			{ from },
		);
		const receipt = await tx.wait();
		const logs = receipt.logs.map(l => ({
			log: l,
			logDescription: contract.interface.parseLog(l),
		}));
		const broadcastPushEvents = logs
			.filter(l => l.logDescription.name === 'BroadcastPush')
			.map(l => this.broadcastPushLogToEvent(l));
		const enriched = await this.blockchainReader.enrichEvents<BroadcastPushEventObject>(broadcastPushEvents);
		const messages = enriched.map(e => this.processBroadcastPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), broadcastPushEvents, messages };
	}

	async sendMessageContentPart(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		uniqueId: number,
		firstBlockNumber: number,
		blockCountLock: number,
		parts: number,
		partIdx: number,
		content: Uint8Array,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
	}> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.sendMessageContentPart(
			uniqueId,
			firstBlockNumber,
			blockCountLock,
			parts,
			partIdx,
			content,
			{ from },
		);
		const receipt = await tx.wait();
		const logs = receipt.logs
			.map(l => {
				try {
					return contract.interface.parseLog(l);
				} catch (err) {
					return;
				}
			})
			.filter(l => !!l) as LogDescription[];
		return { tx, receipt, logs };
	}

	async getMailPushEvent(
		mailer: IEVMMailerContractLink,
		blockNumber: number,
		txIndex: number,
		logIndex: number,
	): Promise<IEVMMessage | null> {
		return await this.cache.contractOperation(mailer, async (contract, provider) => {
			const events = await contract.queryFilter(contract.filters.MailPush(), blockNumber, blockNumber);
			const event = events.find(
				e => e.blockNumber === blockNumber && e.transactionIndex === txIndex && e.logIndex === logIndex,
			);
			if (!event) {
				return null;
			}
			const [enriched] = await this.blockchainReader.enrichEvents<MailPushEventObject>([
				ethersEventToInternalEvent(event),
			]);
			return this.processMailPushEvent(mailer, enriched);
		});
	}

	async getBroadcastPushEvent(
		mailer: IEVMMailerContractLink,
		blockNumber: number,
		txIndex: number,
		logIndex: number,
	): Promise<IEVMMessage | null> {
		return await this.cache.contractOperation(mailer, async (contract, provider) => {
			const events: BroadcastPushEvent[] = await contract.queryFilter(
				contract.filters.BroadcastPush(),
				blockNumber,
				blockNumber,
			);
			const event = events.find(
				e => e.blockNumber === blockNumber && e.transactionIndex === txIndex && e.logIndex === logIndex,
			);
			if (!event) {
				return null;
			}
			const [enriched] = await this.blockchainReader.enrichEvents<BroadcastPushEventObject>([
				ethersEventToInternalEvent(event),
			]);
			return this.processBroadcastPushEvent(mailer, enriched);
		});
	}

	async retrieveMailHistoryDesc(
		mailer: IEVMMailerContractLink,
		feedId: Uint256,
		recipient: Uint256,
		fromMessage: IEVMMessage | null,
		includeFromMessage: boolean,
		toMessage: IEVMMessage | null,
		includeToMessage: boolean,
		limit: number | null,
	): Promise<IEVMMessage[]> {
		const getBaseIndex: () => Promise<number[]> = async () =>
			this.getRecipientToMailIndex(mailer, feedId, recipient);
		const getFilter = (contract: YlideMailerV8) => contract.filters.MailPush(`0x${recipient}`, `0x${feedId}`);
		const processEvent = (event: IEVMEnrichedEvent<MailPushEventObject>) =>
			this.processMailPushEvent(mailer, event);
		return await this.retrieveHistoryDesc<MailPushEvent>(
			mailer,
			getBaseIndex,
			getFilter,
			processEvent,
			fromMessage,
			includeFromMessage,
			toMessage,
			includeToMessage,
			limit,
		);
	}

	async retrieveBroadcastHistoryDesc(
		mailer: IEVMMailerContractLink,
		feedId: Uint256,
		fromMessage: IEVMMessage | null,
		includeFromMessage: boolean,
		toMessage: IEVMMessage | null,
		includeToMessage: boolean,
		limit: number | null,
	): Promise<IEVMMessage[]> {
		const getBaseIndex: () => Promise<number[]> = () => this.getBroadcastFeedMessageIndex(mailer, feedId);
		const getFilter = (contract: YlideMailerV8) => contract.filters.BroadcastPush(null, feedId);
		const processEvent = (event: IEVMEnrichedEvent<BroadcastPushEventObject>) =>
			this.processBroadcastPushEvent(mailer, event);
		return await this.retrieveHistoryDesc<BroadcastPushEvent>(
			mailer,
			getBaseIndex,
			getFilter,
			processEvent,
			fromMessage,
			includeFromMessage,
			toMessage,
			includeToMessage,
			limit,
		);
	}

	processMessageContentEvent(args: MessageContentEventObject): GenericMessageContentEventObject {
		return {
			contentId: args.contentId.toHexString().replace('0x', '').padStart(64, '0'),
			sender: args.sender,
			parts: args.parts,
			partIdx: args.partIdx,
			content: args.content,
		};
	}

	async retrieveMessageContent(
		mailer: IEVMMailerContractLink,
		message: IEVMMessage,
	): Promise<IMessageContent | IMessageCorruptedContent | null> {
		return await this.cache.contractOperation(mailer, async (contract, provider, blockLimit) => {
			const decodedContentId = decodeContentId(message.$$meta.contentId);
			const events: MessageContentEvent[] = [];
			for (
				let i = decodedContentId.blockNumber;
				i <= decodedContentId.blockNumber + decodedContentId.blockCountLock;
				i += blockLimit
			) {
				const newEvents = await contract.queryFilter(
					contract.filters.MessageContent('0x' + message.$$meta.contentId),
					i,
					Math.min(i + blockLimit, decodedContentId.blockNumber + decodedContentId.blockCountLock),
				);
				events.push(...newEvents);
				if (events.length >= decodedContentId.partsCount) {
					break;
				}
			}
			events.sort((a, b) => a.args.partIdx - b.args.partIdx);
			const enrichedEvents = await this.blockchainReader.enrichEvents(
				events.map(e => ethersEventToInternalEvent(e, this.processMessageContentEvent.bind(this))),
			);
			const content = EthereumContentReader.processMessageContent(message.msgId, enrichedEvents);
			return EthereumContentReader.verifyMessageContent(message, content);
		});
	}

	async getTerminationBlock(mailer: IEVMMailerContractLink): Promise<number> {
		return await this.cache.contractOperation(mailer, async (contract, provider) => {
			const terminationBlock = await contract.terminationBlock();
			return terminationBlock.toNumber();
		});
	}
}
