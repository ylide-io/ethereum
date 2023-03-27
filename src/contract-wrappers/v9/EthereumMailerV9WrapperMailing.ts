import type { Uint256 } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { BigNumber, ethers } from 'ethers';
import {
	convertLogInternalToInternalEvent,
	ethersEventToInternalEvent,
	ethersLogToInternalEvent,
	parseReceiptToLogInternal,
} from '../../controllers/helpers/ethersHelper';
import { BlockNumberRingBufferIndex } from '../../controllers/misc/BlockNumberRingBufferIndex';
import { EVM_CONTRACT_TO_NETWORK, EVM_NAMES } from '../../misc/constants';
import { encodeEvmMsgId } from '../../misc/evmMsgId';
import {
	IEVMEnrichedEvent,
	IEVMEvent,
	IEVMMailerContractLink,
	IEVMMessage,
	Payment,
	TokenAttachmentContractType,
} from '../../misc/types';
import { bnToUint256, IEventPosition } from '../../misc/utils';
import { EthereumPayV1Wrapper } from '../EthereumPayV1Wrapper';
import { EthereumStakeV1Wrapper } from '../EthereumStakeV1Wrapper';
import { EthereumStreamSablierV1Wrapper } from '../EthereumStreamSablierWrapper';
import type { EthereumMailerV9Wrapper } from './EthereumMailerV9Wrapper';
import {
	MailingFeedJoinedEvent,
	MailingFeedJoinedEventObject,
	MailPushEvent,
	MailPushEventObject,
	YlideMailerV9,
} from './mock/contracts/YlideMailerV9';
import { TokenAttachmentEventObject } from './mock/contracts/interfaces/IYlidePayStake';
import { TokenAttachmentEventObject as TokenAttachmentEventObjectStream } from './mock/contracts/YlideStreamSablierV1';
import { parseOutLogs } from './utils';

export class EthereumMailerV9WrapperMailing {
	constructor(
		public readonly wrapper: EthereumMailerV9Wrapper,
		public readonly payWrapper: EthereumPayV1Wrapper,
		public readonly stakeWrapper: EthereumStakeV1Wrapper,
		public readonly streamSablierWrapper: EthereumStreamSablierV1Wrapper,
	) {
		//
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

	async createMailingFeed(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		uniqueId: Uint256,
		value: ethers.BigNumber,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		events: { log: ethers.providers.Log; logDescription: ethers.utils.LogDescription }[];
		feedId: Uint256 | null;
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.createMailingFeed(`0x${uniqueId}`, { from, value });
		const receipt = await tx.wait();
		const {
			byName: { MailingFeedCreated: events },
		} = parseOutLogs(contract, receipt.logs);
		const feedId = events[0]?.logDescription.args?.feedId
			? bnToUint256(events[0]?.logDescription.args?.feedId)
			: null;
		return { tx, receipt, events, feedId };
	}

	async getMailingFeedParams(
		mailer: IEVMMailerContractLink,
		feedId: Uint256,
	): Promise<{ owner: string; beneficiary: string; recipientFee: BigNumber }> {
		return await this.wrapper.cache.contractOperation(mailer, async contract => {
			const [owner, beneficiary, recipientFee] = await contract.functions.mailingFeeds(`0x${feedId}`);
			return {
				owner,
				beneficiary,
				recipientFee,
			};
		});
	}

	async setMailingFeedOwner(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		owner: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
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
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.setMailingFeedBeneficiary(`0x${feedId}`, beneficiary, { from });
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
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.setMailingFeedFees(`0x${feedId}`, fees.recipientFee, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async getRecipientToMailIndex(
		mailer: IEVMMailerContractLink,
		feedId: Uint256,
		recipient: Uint256,
	): Promise<number[]> {
		return await this.wrapper.cache.contractOperation(mailer, async contract => {
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
		return await this.wrapper.cache.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.getMailingFeedRecipientMessagesCount(`0x${feedId}`, `0x${recipient}`);
			return bn.toNumber();
		});
	}

	async getRecipientToJoinMailingFeedIndex(mailer: IEVMMailerContractLink, recipient: Uint256): Promise<number[]> {
		return await this.wrapper.cache.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.recipientToMailingFeedJoinEventsIndex(`0x${recipient}`);
			const index = bnToUint256(bn);
			return BlockNumberRingBufferIndex.decodeIndexValue(index);
		});
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
		value: ethers.BigNumber,
		payments?: Payment[],
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
		tokenAttachmentEvents: IEVMEvent<TokenAttachmentEventObject>[] | IEVMEvent<TokenAttachmentEventObjectStream>[];
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		let tx: ethers.ContractTransaction = {} as ethers.ContractTransaction;
		const paymentType = payments?.[0].type;
		if (paymentType) {
			if (paymentType === TokenAttachmentContractType.Pay) {
				if (!mailer.ylidePayContract) {
					throw new Error('Mailer has no ylidePayContract');
				}
				tx = await this.payWrapper.sendBulkMailWithToken({
					contractAddress: mailer.ylidePayContract,
					signer,
					from,
					feedId,
					uniqueId,
					recipients,
					keys,
					content,
					payments,
				});
			} else if (paymentType === TokenAttachmentContractType.Stake) {
				if (!mailer.ylideStakeContract) {
					throw new Error('Mailer has no ylidePayContract');
				}
				tx = await this.stakeWrapper.sendBulkMailWithToken({
					contractAddress: mailer.ylideStakeContract,
					signer,
					from,
					feedId,
					uniqueId,
					recipients,
					keys,
					content,
					payments,
				});
			} else if (paymentType === TokenAttachmentContractType.StreamSablier) {
				if (!mailer.ylideStreamSablierContract) {
					throw new Error('Mailer has no ylideStreamSablierContract');
				}
				tx = await this.streamSablierWrapper.sendBulkMailWithToken({
					contractAddress: mailer.ylideStreamSablierContract,
					signer,
					from,
					feedId,
					uniqueId,
					recipients,
					keys,
					content,
					payments,
				});
			}
		} else {
			tx = await contract['sendBulkMail(uint256,uint256,uint256[],bytes[],bytes)'](
				`0x${feedId}`,
				uniqueId,
				recipients.map(r => `0x${r}`),
				keys,
				content,
				{ from, value },
			);
		}
		const receipt = await tx.wait();
		const logs = parseReceiptToLogInternal(contract, receipt);
		const mailPushEvents = convertLogInternalToInternalEvent<MailPushEventObject>(logs, 'MailPush');

		let tokenAttachmentEvents:
			| IEVMEvent<TokenAttachmentEventObject>[]
			| IEVMEvent<TokenAttachmentEventObjectStream>[] = [];

		if (paymentType) {
			if (paymentType === TokenAttachmentContractType.StreamSablier) {
				tokenAttachmentEvents = convertLogInternalToInternalEvent<TokenAttachmentEventObjectStream>(
					logs,
					'TokenAttachment',
				);
			} else {
				tokenAttachmentEvents = convertLogInternalToInternalEvent<TokenAttachmentEventObject>(
					logs,
					'TokenAttachment',
				);
			}
		}

		const enriched = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages, tokenAttachmentEvents };
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
		value: ethers.BigNumber,
		payments?: Payment[],
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
		tokenAttachmentEvents: IEVMEvent<TokenAttachmentEventObject>[] | IEVMEvent<TokenAttachmentEventObjectStream>[];
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		let tx: ethers.ContractTransaction = {} as ethers.ContractTransaction;
		const paymentType = payments?.[0].type;
		if (paymentType) {
			if (paymentType === TokenAttachmentContractType.Pay) {
				if (!mailer.ylidePayContract) {
					throw new Error('Mailer has no ylidePayContract');
				}
				tx = await this.payWrapper.addMailRecipientsWithToken({
					contractAddress: mailer.ylidePayContract,
					signer,
					from,
					feedId,
					uniqueId,
					firstBlockNumber,
					partsCount,
					blockCountLock,
					recipients,
					keys,
					payments,
				});
			} else if (paymentType === TokenAttachmentContractType.Stake) {
				if (!mailer.ylideStakeContract) {
					throw new Error('Mailer has no ylideStakeContract');
				}
				tx = await this.stakeWrapper.addMailRecipientsWithToken({
					contractAddress: mailer.ylidePayContract,
					signer,
					from,
					feedId,
					uniqueId,
					firstBlockNumber,
					partsCount,
					blockCountLock,
					recipients,
					keys,
					payments,
				});
			} else if (paymentType === TokenAttachmentContractType.StreamSablier) {
				if (!mailer.ylideStreamSablierContract) {
					throw new Error('Mailer has no ylideStreamSablierContract');
				}
				tx = await this.streamSablierWrapper.addMailRecipientsWithToken({
					contractAddress: mailer.ylideStreamSablierContract,
					signer,
					from,
					feedId,
					uniqueId,
					firstBlockNumber,
					partsCount,
					blockCountLock,
					recipients,
					keys,
					payments,
				});
			}
		} else {
			tx = await contract['addMailRecipients(uint256,uint256,uint256,uint16,uint16,uint256[],bytes[])'](
				`0x${feedId}`,
				uniqueId,
				firstBlockNumber,
				partsCount,
				blockCountLock,
				recipients.map(r => `0x${r}`),
				keys,
				{ from, value },
			);
		}

		const receipt = await tx.wait();
		const logs = parseReceiptToLogInternal(contract, receipt);
		const mailPushEvents = convertLogInternalToInternalEvent<MailPushEventObject>(logs, 'MailPush');

		let tokenAttachmentEvents:
			| IEVMEvent<TokenAttachmentEventObject>[]
			| IEVMEvent<TokenAttachmentEventObjectStream>[] = [];

		if (paymentType) {
			if (paymentType === TokenAttachmentContractType.StreamSablier) {
				tokenAttachmentEvents = convertLogInternalToInternalEvent<TokenAttachmentEventObjectStream>(
					logs,
					'TokenAttachment',
				);
			} else {
				tokenAttachmentEvents = convertLogInternalToInternalEvent<TokenAttachmentEventObject>(
					logs,
					'TokenAttachment',
				);
			}
		}

		const enriched = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages, tokenAttachmentEvents };
	}

	async getMailPushEvent(
		mailer: IEVMMailerContractLink,
		blockNumber: number,
		txIndex: number,
		logIndex: number,
	): Promise<IEVMMessage | null> {
		return await this.wrapper.cache.contractOperation(mailer, async (contract, provider) => {
			const events = await contract.queryFilter(contract.filters.MailPush(), blockNumber, blockNumber);
			const event = events.find(
				e => e.blockNumber === blockNumber && e.transactionIndex === txIndex && e.logIndex === logIndex,
			);
			if (!event) {
				return null;
			}
			const [enriched] = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>([
				ethersEventToInternalEvent(event),
			]);
			return this.processMailPushEvent(mailer, enriched);
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
		const getFilter = (contract: YlideMailerV9) => contract.filters.MailPush(`0x${recipient}`, `0x${feedId}`);
		const processEvent = (event: IEVMEnrichedEvent<MailPushEventObject>) =>
			this.processMailPushEvent(mailer, event);
		return await this.wrapper.retrieveHistoryDesc<MailPushEvent>(
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

	async retrieveJoinMailFeedsHistoryDesc(
		mailer: IEVMMailerContractLink,
		recipient: Uint256,
		fromMessage: IEVMEvent<MailingFeedJoinedEventObject> | null,
		includeFromMessage: boolean,
		toMessage: IEVMEvent<MailingFeedJoinedEventObject> | null,
		includeToMessage: boolean,
		limit: number | null,
	): Promise<IEVMEvent<MailingFeedJoinedEventObject>[]> {
		const getBaseIndex: () => Promise<number[]> = async () =>
			this.getRecipientToJoinMailingFeedIndex(mailer, recipient);
		const getFilter = (contract: YlideMailerV9) => contract.filters.MailingFeedJoined(null, `0x${recipient}`);

		const parseFull = (e: MailingFeedJoinedEvent): IEventPosition & { index: number[] } => {
			return {
				blockNumber: e.blockNumber,
				transactionIndex: e.transactionIndex,
				logIndex: e.logIndex,
				index: BlockNumberRingBufferIndex.decodeIndexValue(bnToUint256(e.args.previousFeedJoinEventsIndex)),
			};
		};

		const parseSmall = (e: IEVMEvent<MailingFeedJoinedEventObject>): IEventPosition & { index: number[] } => {
			return {
				blockNumber: e.blockNumber,
				transactionIndex: e.transactionIndex,
				logIndex: e.logIndex,
				index: BlockNumberRingBufferIndex.decodeIndexValue(bnToUint256(e.parsed.previousFeedJoinEventsIndex)),
			};
		};

		return await this.wrapper.cache.contractOperation(mailer, async (contract, provider, blockLimit) => {
			const result = await BlockNumberRingBufferIndex.readIndexedEntries<MailingFeedJoinedEvent>({
				parseFull,

				getBaseIndex,
				queryEntries: async (fromB, toB) => await contract.queryFilter(getFilter(contract), fromB, toB),

				getLastBlockNumber: () => provider.getBlockNumber(),

				blockLimit,

				fromEntry: fromMessage ? parseSmall(fromMessage) : null,
				includeFromEntry: includeFromMessage,
				toEntry: toMessage ? parseSmall(toMessage) : null,
				includeToEntry: includeToMessage,

				limit: limit || undefined,
				divider: 128,
			});

			return result.map(e => ({
				...ethersEventToInternalEvent(e),
			}));
		});
	}
}
