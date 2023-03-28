import {
	IYlidePayStake__factory,
	IYlideTokenAttachment,
	IYlideTokenAttachment__factory,
	YlideStreamSablierV1__factory,
} from '@mock/ethereum-contracts/typechain-types';
import {
	IYlidePayStake,
	TokenAttachmentEventObject,
} from '@mock/ethereum-contracts/typechain-types/contracts/interfaces/IYlidePayStake';
import {
	MailingFeedJoinedEvent,
	MailingFeedJoinedEventObject,
	MailPushEvent,
	MailPushEventObject,
	YlideMailerV9,
} from '@mock/ethereum-contracts/typechain-types/contracts/YlideMailerV9';
import {
	TokenAttachmentEventObject as TokenAttachmentEventObjectStream,
	YlideStreamSablierV1,
} from '@mock/ethereum-contracts/typechain-types/contracts/YlideStreamSablierV1';
import type { Uint256 } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { BigNumber, ethers } from 'ethers';
import { EthereumBlockchainReader } from '../../controllers';
import {
	convertLogInternalToInternalEvent,
	ethersEventToInternalEvent,
	parseReceiptToLogInternal,
	parseTokenAttachmentEvent,
	parseTokenAttachmentEventStream,
} from '../../controllers/helpers/ethersHelper';
import { BlockNumberRingBufferIndex } from '../../controllers/misc/BlockNumberRingBufferIndex';
import { EVM_CONTRACT_TO_NETWORK, EVM_NAMES } from '../../misc/constants';
import { encodeEvmMsgId } from '../../misc/evmMsgId';
import {
	IEVMEnrichedEvent,
	IEVMEvent,
	IEVMMailerContractLink,
	IEVMMessage,
	LogInternal,
	Payment,
	TokenAttachmentContractType,
	TokenAttachmentEventParsed,
} from '../../misc/types';
import { bnToUint256, IEventPosition } from '../../misc/utils';
import { EthereumPayV1Wrapper } from '../EthereumPayV1Wrapper';
import { EthereumStakeV1Wrapper } from '../EthereumStakeV1Wrapper';
import { EthereumStreamSablierV1Wrapper } from '../EthereumStreamSablierWrapper';
import type { EthereumMailerV9Wrapper } from './EthereumMailerV9Wrapper';
import { parseOutLogs } from './utils';

export class EthereumMailerV9WrapperMailing {
	public readonly payWrapper: EthereumPayV1Wrapper;
	public readonly stakeWrapper: EthereumStakeV1Wrapper;
	public readonly streamSablierWrapper: EthereumStreamSablierV1Wrapper;

	constructor(
		public readonly wrapper: EthereumMailerV9Wrapper,
		public readonly blockchainReader: EthereumBlockchainReader,
	) {
		this.payWrapper = new EthereumPayV1Wrapper(blockchainReader);
		this.stakeWrapper = new EthereumStakeV1Wrapper(blockchainReader);
		this.streamSablierWrapper = new EthereumStreamSablierV1Wrapper(blockchainReader);
	}

	async processMailPushEvent(
		mailer: IEVMMailerContractLink,
		event: IEVMEnrichedEvent<MailPushEventObject>,
	): Promise<IEVMMessage> {
		let tokenAttachmentType: number | undefined;
		let tokenAttachmentEvent: TokenAttachmentEventParsed | undefined;

		const contentId = event.event.parsed.contentId;

		const tokenAttachmentAddress = event.event.parsed.tokenAttachment;

		if (tokenAttachmentAddress !== ethers.constants.AddressZero) {
			const tokenAttachmentContract = new ethers.Contract(
				tokenAttachmentAddress,
				IYlideTokenAttachment__factory.createInterface(),
			) as IYlideTokenAttachment;

			tokenAttachmentType = await tokenAttachmentContract.contractType();
			switch (tokenAttachmentType) {
				case TokenAttachmentContractType.Pay:
				case TokenAttachmentContractType.Stake:
					const payStake = new ethers.Contract(
						tokenAttachmentAddress,
						IYlidePayStake__factory.createInterface(),
					) as IYlidePayStake;
					tokenAttachmentEvent = await payStake
						.queryFilter(payStake.filters.TokenAttachment(contentId), event.block.hash)
						.then(events => parseTokenAttachmentEvent(events[0]));
					break;
				case TokenAttachmentContractType.StreamSablier:
					const streamSablier = new ethers.Contract(
						tokenAttachmentAddress,
						YlideStreamSablierV1__factory.createInterface(),
					) as YlideStreamSablierV1;
					tokenAttachmentEvent = await streamSablier
						.queryFilter(streamSablier.filters.TokenAttachment(contentId), event.block.hash)
						.then(events => parseTokenAttachmentEventStream(events[0]));
					break;
				default:
					throw new Error('Unknown token attachment contract type');
			}
		}

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
				contentId: bnToUint256(contentId),
				index: BlockNumberRingBufferIndex.decodeIndexValue(
					bnToUint256(event.event.parsed.previousFeedEventsIndex),
				),
				tokenAttachmentType,
				tokenAttachmentEvent,
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
			tx = await this.sendBulkMailWithToken({
				paymentType,
				mailer,
				signer,
				from,
				feedId,
				uniqueId,
				recipients,
				keys,
				content,
				payments,
			});
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
		const enriched = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = await Promise.all(enriched.map(e => this.processMailPushEvent(mailer, e)));

		const tokenAttachmentEvents = this.getTokenAttachmentEvents(paymentType, logs);

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
			tx = await this.addMailRecipientsWithToken({
				paymentType,
				mailer,
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
		const enriched = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = await Promise.all(enriched.map(e => this.processMailPushEvent(mailer, e)));

		const tokenAttachmentEvents = this.getTokenAttachmentEvents(paymentType, logs);

		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages, tokenAttachmentEvents };
	}

	private async sendBulkMailWithToken({
		paymentType,
		mailer,
		signer,
		from,
		feedId,
		uniqueId,
		recipients,
		keys,
		content,
		payments,
	}: {
		paymentType: TokenAttachmentContractType;
		mailer: IEVMMailerContractLink;
		signer: ethers.Signer;
		from: string;
		feedId: Uint256;
		uniqueId: number;
		recipients: Uint256[];
		keys: Uint8Array[];
		content: Uint8Array;
		payments: Payment[];
	}) {
		const { contract, contractAddress } = this.getTokenAttachmentContract(paymentType, mailer);
		return contract.sendBulkMailWithToken({
			contractAddress,
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

	private getTokenAttachmentContract(paymentType: TokenAttachmentContractType, mailer: IEVMMailerContractLink) {
		let contract: EthereumPayV1Wrapper | EthereumStakeV1Wrapper | EthereumStreamSablierV1Wrapper | undefined;
		let contractAddress = '';
		if (paymentType === TokenAttachmentContractType.Pay) {
			if (!mailer.ylidePayContract) {
				throw new Error('Mailer has no ylidePayContract');
			}
			contractAddress = mailer.ylidePayContract;
			contract = this.payWrapper;
		} else if (paymentType === TokenAttachmentContractType.Stake) {
			if (!mailer.ylideStakeContract) {
				throw new Error('Mailer has no ylidePayContract');
			}
			contractAddress = mailer.ylideStakeContract;
			contract = this.stakeWrapper;
		} else if (paymentType === TokenAttachmentContractType.StreamSablier) {
			if (!mailer.ylideStreamSablierContract) {
				throw new Error('Mailer has no ylideStreamSablierContract');
			}
			contractAddress = mailer.ylideStreamSablierContract;
			contract = this.streamSablierWrapper;
		}
		if (!contract) {
			throw new Error('Contract not found');
		}
		return { contract, contractAddress };
	}

	private async addMailRecipientsWithToken({
		paymentType,
		mailer,
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
	}: {
		paymentType: TokenAttachmentContractType;
		mailer: IEVMMailerContractLink;
		signer: ethers.Signer;
		from: string;
		feedId: Uint256;
		uniqueId: number;
		firstBlockNumber: number;
		partsCount: number;
		blockCountLock: number;
		recipients: Uint256[];
		keys: Uint8Array[];
		payments: Payment[];
	}) {
		const { contract, contractAddress } = this.getTokenAttachmentContract(paymentType, mailer);
		return contract.addMailRecipientsWithToken({
			contractAddress,
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

	private getTokenAttachmentEvents(paymentType: TokenAttachmentContractType | undefined, logs: LogInternal[]) {
		if (!paymentType) {
			return [];
		}
		if (paymentType === TokenAttachmentContractType.StreamSablier) {
			return convertLogInternalToInternalEvent<TokenAttachmentEventObjectStream>(logs, 'TokenAttachment');
		} else {
			return convertLogInternalToInternalEvent<TokenAttachmentEventObject>(logs, 'TokenAttachment');
		}
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

	retrieveMailHistoryDesc(
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
		return this.wrapper.retrieveHistoryDesc<MailPushEvent>(
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
