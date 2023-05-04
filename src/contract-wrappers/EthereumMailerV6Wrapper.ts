import type { LogDescription } from '@ethersproject/abi';
import type { YlideMailerV6 } from '@ylide/ethereum-contracts';
import { YlideMailerV6__factory } from '@ylide/ethereum-contracts';
import type { TypedEvent, TypedEventFilter } from '@ylide/ethereum-contracts/lib/common';
import type {
	MailContentEvent,
	MailContentEventObject,
	MailPushEvent,
	MailPushEventObject,
} from '@ylide/ethereum-contracts/lib/contracts/YlideMailerV6';
import type { IMessageContent, IMessageCorruptedContent, Uint256 } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import type { ethers } from 'ethers';
import { BigNumber } from 'ethers';
import type { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import type { GenericMessageContentEventObject } from '../controllers/helpers/EthereumContentReader';
import { EthereumContentReader } from '../controllers/helpers/EthereumContentReader';
import type { EventParsed } from '../controllers/helpers/ethersHelper';
import { ethersEventToInternalEvent } from '../controllers/helpers/ethersHelper';
import { BlockNumberRingBufferIndex } from '../controllers/misc/BlockNumberRingBufferIndex';
import { EVM_CONTRACT_TO_NETWORK, EVM_NAMES } from '../misc/constants';
import { decodeEvmMsgId, encodeEvmMsgId } from '../misc/evmMsgId';
import type {
	ConnectorEventCallback,
	ConnectorEventInfo,
	IEVMEnrichedEvent,
	IEVMEvent,
	IEVMMailerContractLink,
	IEVMMessage,
} from '../misc/types';
import { ConnectorEventEnum, ConnectorEventState } from '../misc/types';
import type { IEventPosition } from '../misc/utils';
import { ContractCache } from './ContractCache';

export class EthereumMailerV6Wrapper {
	public readonly cache: ContractCache<YlideMailerV6>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlideMailerV6__factory, blockchainReader);
	}

	static async deploy(signer: ethers.Signer, from: string) {
		const factory = new YlideMailerV6__factory(signer);
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
			feedId: '0000000000000000000000000000000000000000000000000000000000000000' as Uint256,
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
				contentId: event.event.parsed.msgId.toHexString().replace('0x', '').padStart(64, '0') as Uint256,
				index: BlockNumberRingBufferIndex.decodeIndexValue(
					event.event.parsed.mailList.toHexString().replace('0x', '').padStart(64, '0') as Uint256,
				),
				...event,
			},
		};
	}

	async retrieveHistoryDesc<T extends TypedEvent>(
		mailer: IEVMMailerContractLink,
		getBaseIndex: () => Promise<number[]>,
		getFilter: (contract: YlideMailerV6) => TypedEventFilter<T>,
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
					e.args.mailList.toHexString().replace('0x', '').padStart(64, '0') as Uint256,
				),
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

	async getRecipientToMailIndex(mailer: IEVMMailerContractLink, recipient: Uint256): Promise<number[]> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.recipientToPushIndex(`0x${recipient}`);
			const index = bn.toHexString().replace('0x', '').padStart(64, '0') as Uint256;
			return BlockNumberRingBufferIndex.decodeIndexValue(index);
		});
	}

	async getSenderToBroadcastIndex(mailer: IEVMMailerContractLink, sender: string): Promise<number[]> {
		return await this.cache.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.senderToBroadcastIndex(sender);
			const index = bn.toHexString().replace('0x', '').padStart(64, '0') as Uint256;
			return BlockNumberRingBufferIndex.decodeIndexValue(index);
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

	async getBeneficiary(mailer: IEVMMailerContractLink): Promise<string> {
		return await this.cache.contractOperation(mailer, async contract => {
			return await contract.beneficiary();
		});
	}

	async setBeneficiary(
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

	async getFees(mailer: IEVMMailerContractLink): Promise<{ contentPartFee: BigNumber; recipientFee: BigNumber }> {
		//  broadcastFee: BigNumber
		return await this.cache.contractOperation(mailer, async contract => {
			const [contentPartFee] = await contract.functions.contentPartFee();
			const [recipientFee] = await contract.functions.recipientFee();
			// const [broadcastFee] = await contract.functions.broadcastFee();

			return {
				contentPartFee: contentPartFee.div(BigNumber.from('1000000000000000000')),
				recipientFee: recipientFee.div(BigNumber.from('1000000000000000000')),
				// broadcastFee: broadcastFee.div(BigNumber.from('1000000000000000000')),
			};
		});
	}

	async setFees(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		fees: { contentPartFee: BigNumber; recipientFee: BigNumber },
		//  broadcastFee: BigNumber
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.setFees(
			fees.contentPartFee.mul(BigNumber.from('1000000000000000000')),
			fees.recipientFee.mul(BigNumber.from('1000000000000000000')),
			// fees.broadcastFee.mul(BigNumber.from('1000000000000000000')),
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
		options: {
			cb?: ConnectorEventCallback;
			info?: ConnectorEventInfo;
		} = {},
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const contract = this.cache.getContract(mailer.address, signer);
		options.cb?.({
			kind: ConnectorEventEnum.SMALL_MAIL,
			state: ConnectorEventState.SIGNING,
		});
		const tx = await contract.sendSmallMail(uniqueId, `0x${recipient}`, key, content, { from });
		options.cb?.({
			kind: ConnectorEventEnum.SMALL_MAIL,
			state: ConnectorEventState.PENDING,
		});
		const receipt = await tx.wait();
		options.cb?.({
			kind: ConnectorEventEnum.SMALL_MAIL,
			state: ConnectorEventState.MINED,
		});
		options.cb?.({
			kind: ConnectorEventEnum.SMALL_MAIL,
			state: ConnectorEventState.FETCHING,
		});
		const logs = receipt.logs
			.map(l => {
				try {
					return {
						log: l,
						logDescription: contract.interface.parseLog(l),
					};
				} catch (err) {
					return {
						log: l,
						logDescription: null,
					};
				}
			})
			.filter(
				(l): l is { log: ethers.providers.Log; logDescription: ethers.utils.LogDescription } =>
					l.logDescription !== null,
			);
		const mailPushEvents = logs
			.filter(l => l.logDescription.name === 'MailPush')
			.map(l =>
				this.mailPushLogToEvent({
					log: l.log,
					logDescription: l.logDescription,
				}),
			);
		const enriched = await this.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		options.cb?.({
			kind: ConnectorEventEnum.SMALL_MAIL,
			state: ConnectorEventState.READY,
		});
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
		options: {
			cb?: ConnectorEventCallback;
			info?: ConnectorEventInfo;
		} = {},
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		options.cb?.({
			kind: ConnectorEventEnum.BULK_MAIL,
			state: ConnectorEventState.SIGNING,
		});
		const contract = this.cache.getContract(mailer.address, signer);
		const tx = await contract.sendBulkMail(
			uniqueId,
			recipients.map(r => `0x${r}`),
			keys,
			content,
			{ from },
		);
		options.cb?.({
			kind: ConnectorEventEnum.BULK_MAIL,
			state: ConnectorEventState.PENDING,
		});
		const receipt = await tx.wait();
		options.cb?.({
			kind: ConnectorEventEnum.BULK_MAIL,
			state: ConnectorEventState.MINED,
		});
		options.cb?.({
			kind: ConnectorEventEnum.BULK_MAIL,
			state: ConnectorEventState.FETCHING,
		});
		const logs = receipt.logs
			.map(l => {
				try {
					return {
						log: l,
						logDescription: contract.interface.parseLog(l),
					};
				} catch (err) {
					return {
						log: l,
						logDescription: null,
					};
				}
			})
			.filter(
				(l): l is { log: ethers.providers.Log; logDescription: ethers.utils.LogDescription } =>
					l.logDescription !== null,
			);
		const mailPushEvents = logs
			.filter(l => l.logDescription.name === 'MailPush')
			.map(l =>
				this.mailPushLogToEvent({
					log: l.log,
					logDescription: l.logDescription,
				}),
			);
		const enriched = await this.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		options.cb?.({
			kind: ConnectorEventEnum.BULK_MAIL,
			state: ConnectorEventState.READY,
		});
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages };
	}

	async addMailRecipients(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		uniqueId: number,
		initTime: number,
		recipients: Uint256[],
		keys: Uint8Array[],
		options: {
			cb?: ConnectorEventCallback;
			info?: ConnectorEventInfo;
			nonce?: number;
		} = {},
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		options.cb?.({
			kind: ConnectorEventEnum.ADD_MAIL_RECIPIENTS,
			state: ConnectorEventState.SIGNING,
			info: options.info,
		});
		const contract = this.cache.getContract(mailer.address, signer);
		const populatedTx = await contract.populateTransaction.addRecipients(
			uniqueId,
			initTime,
			recipients.map(r => `0x${r}`),
			keys,
			{ from, nonce: options.nonce },
		);
		options.cb?.({
			kind: ConnectorEventEnum.ADD_MAIL_RECIPIENTS,
			state: ConnectorEventState.PENDING,
			info: options.info,
		});
		const tx = await signer.sendTransaction(populatedTx);
		const receipt = await tx.wait();
		options.cb?.({
			kind: ConnectorEventEnum.ADD_MAIL_RECIPIENTS,
			state: ConnectorEventState.MINED,
			info: options.info,
		});
		options.cb?.({
			kind: ConnectorEventEnum.ADD_MAIL_RECIPIENTS,
			state: ConnectorEventState.FETCHING,
			info: options.info,
		});
		const logs = receipt.logs
			.map(l => {
				try {
					return {
						log: l,
						logDescription: contract.interface.parseLog(l),
					};
				} catch (err) {
					return {
						log: l,
						logDescription: null,
					};
				}
			})
			.filter(
				(l): l is { log: ethers.providers.Log; logDescription: ethers.utils.LogDescription } =>
					l.logDescription !== null,
			);
		const mailPushEvents = logs
			.filter(l => l.logDescription.name === 'MailPush')
			.map(l =>
				this.mailPushLogToEvent({
					log: l.log,
					logDescription: l.logDescription,
				}),
			);
		const enriched = await this.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		options.cb?.({
			kind: ConnectorEventEnum.ADD_MAIL_RECIPIENTS,
			state: ConnectorEventState.READY,
			info: options.info,
		});
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages };
	}

	async sendMessageContentPart(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		uniqueId: number,
		initTime: number,
		parts: number,
		partIdx: number,
		content: Uint8Array,
		options: {
			cb?: ConnectorEventCallback;
			info?: ConnectorEventInfo;
			nonce?: number;
		} = {},
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
	}> {
		options.cb?.({
			kind: ConnectorEventEnum.MESSAGE_CONTENT_PART,
			state: ConnectorEventState.SIGNING,
			info: options.info,
		});
		const contract = this.cache.getContract(mailer.address, signer);
		const populatedTx = await contract.populateTransaction.sendMultipartMailPart(
			uniqueId,
			initTime,
			parts,
			partIdx,
			content,
			{ from, nonce: options.nonce },
		);
		options.cb?.({
			kind: ConnectorEventEnum.MESSAGE_CONTENT_PART,
			state: ConnectorEventState.PENDING,
			info: options.info,
		});
		const tx = await signer.sendTransaction(populatedTx);
		const receipt = await tx.wait();
		options.cb?.({
			kind: ConnectorEventEnum.MESSAGE_CONTENT_PART,
			state: ConnectorEventState.MINED,
			info: options.info,
		});
		const logs = receipt.logs
			.map(l => {
				try {
					return contract.interface.parseLog(l);
				} catch (err) {
					return null;
				}
			})
			.filter(l => !!l) as LogDescription[];
		options.cb?.({
			kind: ConnectorEventEnum.MESSAGE_CONTENT_PART,
			state: ConnectorEventState.READY,
			info: options.info,
		});
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
		const getFilter = (contract: YlideMailerV6) => contract.filters.MailPush(`0x${recipient}`);
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

	processMessageContentEvent(args: MailContentEventObject): GenericMessageContentEventObject {
		return {
			contentId: args.msgId.toHexString().replace('0x', '').padStart(64, '0'),
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
			// const decodedContentId = decodeContentId(message.$$meta.contentId);
			const events: MailContentEvent[] = [];
			const partsCount = 0;
			for (let i = message.$$meta.block.number; i >= mailer.creationBlock; i -= blockLimit) {
				const newEvents = await contract.queryFilter(
					contract.filters.MailContent('0x' + message.$$meta.contentId),
					Math.max(i - blockLimit, mailer.creationBlock),
					i,
				);
				events.push(...newEvents);
				if (events.length && events[0].args.parts <= events.length) {
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
}
