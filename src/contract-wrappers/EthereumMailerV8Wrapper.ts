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
} from '@ylide/ethereum-contracts/lib/YlideMailerV8';
import {
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
import { EthereumContentReader } from '../controllers/helpers/EthereumContentReader';
import { ContractCache } from './ContractCache';

export class EthereumMailerV8Wrapper {
	private readonly cache: ContractCache<YlideMailerV8>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlideMailerV8__factory, blockchainReader);
	}

	// private async getMessageContentEvents(
	// 	mailer: IEVMMailerContractLink,
	// 	contentId: Uint256,
	// 	fromBlock?: number,
	// 	toBlock?: number,
	// ): Promise<MessageContentEvent[]> {
	// 	return await this.cache.contractOperation(mailer, async contract => {
	// 		return await contract.queryFilter(contract.filters.MessageContent('0x' + contentId), fromBlock, toBlock);
	// 	});
	// }

	// private async getMailPushEvents(
	// 	mailer: IEVMMailerContractLink,
	// 	recipient: Uint256 | null,
	// 	sender: string | null,
	// 	fromBlock?: number,
	// 	toBlock?: number,
	// ): Promise<MailPushEvent[]> {
	// 	return await this.cache.contractOperation(mailer, async contract => {
	// 		return await contract.queryFilter(
	// 			contract.filters.MailPush(recipient ? `0x${recipient}` : null, sender),
	// 			fromBlock,
	// 			toBlock,
	// 		);
	// 	});
	// }

	// private async getBroadcastPushEvents(
	// 	mailer: IEVMMailerContractLink,
	// 	sender: string | null,
	// 	fromBlock?: number,
	// 	toBlock?: number,
	// ): Promise<BroadcastPushEvent[]> {
	// 	return await this.cache.contractOperation(mailer, async contract => {
	// 		return await contract.queryFilter(contract.filters.BroadcastPush(sender), fromBlock, toBlock);
	// 	});
	// }

	private mailPushLogToEvent(log: {
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

	private broadcastPushLogToEvent(log: {
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

	private validateMessage(mailer: IEVMMailerContractLink, message: IEVMMessage | null) {
		if (!message) {
			return;
		}
		try {
			const decodedId = decodeEvmMsgId(message.msgId);
			if (decodedId.contractId === mailer.id) {
				return;
			}
		} catch (e) {}
		throw new Error('Invalid message: not from this contract');
	}

	private processMailPushEvent(
		mailer: IEVMMailerContractLink,
		event: IEVMEnrichedEvent<MailPushEventObject>,
	): IEVMMessage {
		return {
			isBroadcast: false,
			msgId: encodeEvmMsgId(
				false,
				mailer.id,
				event.event.blockNumber,
				event.event.transactionIndex,
				event.event.logIndex,
			),
			createdAt: event.block.timestamp,
			senderAddress: event.tx.from,
			recipientAddress: event.event.parsed.recipient.toHexString().replace('0x', '').padStart(64, '0') as Uint256,
			blockchain: EVM_NAMES[EVM_CONTRACT_TO_NETWORK[mailer.id]],
			key: SmartBuffer.ofHexString(event.event.parsed.key.replace('0x', '')).bytes,
			$$meta: {
				contentId: event.event.parsed.contentId.toHexString().replace('0x', '').padStart(64, '0') as Uint256,
				index: BlockNumberRingBufferIndex.decodeIndexValue(
					event.event.parsed.previousEventsIndex.toHexString().replace('0x', '').padStart(64, '0') as Uint256,
				),
				...event,
			},
		};
	}

	private processBroadcastPushEvent(
		mailer: IEVMMailerContractLink,
		event: IEVMEnrichedEvent<BroadcastPushEventObject>,
	): IEVMMessage {
		return {
			isBroadcast: true,
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
				contentId: event.event.parsed.contentId.toHexString().replace('0x', '').padStart(64, '0') as Uint256,
				index: BlockNumberRingBufferIndex.decodeIndexValue(
					event.event.parsed.previousEventsIndex.toHexString().replace('0x', '').padStart(64, '0') as Uint256,
				),
				...event,
			},
		};
	}

	private async retrieveHistoryDesc<T extends TypedEvent>(
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
				index: BlockNumberRingBufferIndex.decodeIndexValue(
					e.args.previousEventsIndex.toHexString().replace('0x', '').padStart(64, '0') as Uint256,
				),
			};
		};

		return await this.cache.contractOperation(mailer, async (contract, provider, blockLimit) => {
			const preparedEvents = await BlockNumberRingBufferIndex.readIndexedEntries({
				parseFull,

				getBaseIndex,
				queryEntries: async (fromB, toB) => await contract.queryFilter(getFilter(contract), fromB, toB),

				blockLimit,

				fromEntry: fromMessage ? { ...fromMessage.$$meta.event, index: fromMessage.$$meta.index } : null,
				includeFromEntry: includeFromMessage,
				toEntry: toMessage ? { ...toMessage.$$meta.event, index: toMessage.$$meta.index } : null,
				includeToEntry: includeToMessage,

				limit: limit || undefined,
				divider: 128,
			});

			const enrichedEvents = await this.blockchainReader.enrichEvents<T>(
				preparedEvents.map(g => ethersEventToInternalEvent(g)),
			);
			const messages = enrichedEvents.map(e => processEvent(e));
			return messages;
		});
	}

	async getRecipientToMailIndex(mailer: IEVMMailerContractLink, recipient: Uint256): Promise<number[]> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.recipientToMailIndex(`0x${recipient}`);
			const index = bn.toHexString().replace('0x', '').padStart(64, '0') as Uint256;
			return BlockNumberRingBufferIndex.decodeIndexValue(index);
		});
	}

	async getRecipientMessagesCount(mailer: IEVMMailerContractLink, recipient: Uint256): Promise<number> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.recipientMessagesCount(`0x${recipient}`);
			return bn.toNumber();
		});
	}

	async getSenderToBroadcastIndex(mailer: IEVMMailerContractLink, sender: string): Promise<number[]> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.senderToBroadcastIndex(sender);
			const index = bn.toHexString().replace('0x', '').padStart(64, '0') as Uint256;
			return BlockNumberRingBufferIndex.decodeIndexValue(index);
		});
	}

	async getBroadcastSenderMessagesCount(mailer: IEVMMailerContractLink, sender: string): Promise<number> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.broadcastMessagesCount(sender);
			return bn.toNumber();
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

	async sendSmallMail(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
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
		const tx = await contract.sendSmallMail(uniqueId, `0x${recipient}`, key, content, { from });
		const receipt = await tx.wait();
		const logs = receipt.logs.map(l => ({
			log: l,
			logDescription: contract.interface.parseLog(l),
		}));
		const mailPushEvents = logs
			.filter(l => l.logDescription.name === 'MailPush')
			.map(l => this.mailPushLogToEvent(l));
		const enriched = await this.blockchainReader.enrichEvents<MailPushEvent>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages };
	}

	async sendBulkMail(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
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
		const enriched = await this.blockchainReader.enrichEvents<MailPushEvent>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages };
	}

	async addMailRecipients(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
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
		const enriched = await this.blockchainReader.enrichEvents<MailPushEvent>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages };
	}

	async sendBroadcast(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
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
		const tx = await contract.sendBroadcast(uniqueId, content, { from });
		const receipt = await tx.wait();
		const logs = receipt.logs.map(l => ({
			log: l,
			logDescription: contract.interface.parseLog(l),
		}));
		const broadcastPushEvents = logs
			.filter(l => l.logDescription.name === 'BroadcastPush')
			.map(l => this.broadcastPushLogToEvent(l));
		const enriched = await this.blockchainReader.enrichEvents<BroadcastPushEvent>(broadcastPushEvents);
		const messages = enriched.map(e => this.processBroadcastPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), broadcastPushEvents, messages };
	}

	async sendBroadcastHeader(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
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
		const tx = await contract.sendBroadcastHeader(uniqueId, firstBlockNumber, partsCount, blockCountLock, { from });
		const receipt = await tx.wait();
		const logs = receipt.logs.map(l => ({
			log: l,
			logDescription: contract.interface.parseLog(l),
		}));
		const broadcastPushEvents = logs
			.filter(l => l.logDescription.name === 'BroadcastPush')
			.map(l => this.broadcastPushLogToEvent(l));
		const enriched = await this.blockchainReader.enrichEvents<BroadcastPushEvent>(broadcastPushEvents);
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
		const logs = receipt.logs.map(l => contract.interface.parseLog(l));
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
			const [enriched] = await this.blockchainReader.enrichEvents<MailPushEvent>([
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
			const events = await contract.queryFilter(contract.filters.BroadcastPush(), blockNumber, blockNumber);
			const event = events.find(
				e => e.blockNumber === blockNumber && e.transactionIndex === txIndex && e.logIndex === logIndex,
			);
			if (!event) {
				return null;
			}
			const [enriched] = await this.blockchainReader.enrichEvents<BroadcastPushEvent>([
				ethersEventToInternalEvent(event),
			]);
			return this.processBroadcastPushEvent(mailer, enriched);
		});
	}

	async retrieveMailHistoryDesc(
		mailer: IEVMMailerContractLink,
		recipient: Uint256,
		fromMessage: IEVMMessage | null,
		includeFromMessage: boolean,
		toMessage: IEVMMessage | null,
		includeToMessage: boolean,
		limit: number | null,
	): Promise<IEVMMessage[]> {
		const getBaseIndex: () => Promise<number[]> = async () => this.getRecipientToMailIndex(mailer, recipient);
		const getFilter = (contract: YlideMailerV8) => contract.filters.MailPush(`0x${recipient}`);
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
		sender: string,
		fromMessage: IEVMMessage | null,
		includeFromMessage: boolean,
		toMessage: IEVMMessage | null,
		includeToMessage: boolean,
		limit: number | null,
	): Promise<IEVMMessage[]> {
		const getBaseIndex: () => Promise<number[]> = () => this.getSenderToBroadcastIndex(mailer, sender);
		const getFilter = (contract: YlideMailerV8) => contract.filters.BroadcastPush(sender);
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

	async retrieveMessageContent(
		mailer: IEVMMailerContractLink,
		message: IEVMMessage,
	): Promise<IMessageContent | IMessageCorruptedContent | null> {
		return await this.cache.contractOperation(mailer, async (contract, provider, blockLimit) => {
			const decodedContentId = decodeContentId(message.$$meta.contentId);
			const events: MessageContentEvent[] = [];
			for (
				let i = decodedContentId.blockNumber;
				i < decodedContentId.blockNumber + decodedContentId.blockCountLock;
				i += blockLimit
			) {
				const newEvents = await await contract.queryFilter(
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
			const enrichedEvents = await this.blockchainReader.enrichEvents<MessageContentEvent>(
				events.map(e => ethersEventToInternalEvent(e)),
			);
			const content = EthereumContentReader.processMessageContent(message.msgId, enrichedEvents);
			return EthereumContentReader.verifyMessageContent(message, content);
		});
	}
}
