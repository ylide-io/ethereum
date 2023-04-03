import { IYlideMailer, YlideMailerV9, YlidePayV1__factory } from '@ylide/ethereum-contracts';
import {
	ContentRecipientsEvent,
	MailPushEvent,
	MailPushEventObject,
	MailingFeedJoinedEvent,
	MailingFeedJoinedEventObject,
} from '@ylide/ethereum-contracts/lib/contracts/YlideMailerV9';
import {
	TokenAttachmentEvent,
	TokenAttachmentEventObject,
	YlidePayV1,
} from '@ylide/ethereum-contracts/lib/contracts/YlidePayV1';
import { Uint256, YlideCore, hexToUint256 } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { BigNumber, BigNumberish, TypedDataDomain, ethers } from 'ethers';
import {
	ethersEventToInternalEvent,
	ethersLogToInternalEvent,
	parseTokenAttachmentEvent,
} from '../../controllers/helpers/ethersHelper';
import { BlockNumberRingBufferIndex } from '../../controllers/misc/BlockNumberRingBufferIndex';
import { AddMailRecipientsTypes, EVM_CONTRACT_TO_NETWORK, EVM_NAMES, SendBulkMailTypes } from '../../misc/constants';
import { encodeEvmMsgId } from '../../misc/evmMsgId';
import type { IEVMEnrichedEvent, IEVMEvent, IEVMMailerContractLink, IEVMMessage, Payment } from '../../misc/types';
import { IEventPosition, bnToUint256 } from '../../misc/utils';
import { EthereumPayV1Wrapper } from '../EthereumPayV1Wrapper';
import type { EthereumMailerV9Wrapper } from './EthereumMailerV9Wrapper';
import { getMultipleEvents, parseOutLogs } from './utils';

export class EthereumMailerV9WrapperMailing {
	public readonly payWrapper: EthereumPayV1Wrapper;

	constructor(public readonly wrapper: EthereumMailerV9Wrapper) {
		this.payWrapper = new EthereumPayV1Wrapper(wrapper.blockchainReader);
	}

	processMailPushEvent(
		mailer: IEVMMailerContractLink,
		event: IEVMEnrichedEvent<MailPushEventObject>,
		tokenAttachment: TokenAttachmentEventObject[] = [],
	): IEVMMessage {
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
				tokenAttachment,
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
		signatureArgs?: IYlideMailer.SignatureArgsStruct,
		payments?: Payment,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		tokenAttachmentEvents: TokenAttachmentEventObject[];
		messages: IEVMMessage[];
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		let tx: ethers.ContractTransaction = {} as ethers.ContractTransaction;
		if (payments && signatureArgs && mailer.pay) {
			tx = await this.payWrapper.sendBulkMailWithToken(
				mailer.pay,
				signer,
				{
					feedId: `0x${feedId}`,
					uniqueId,
					recipients: recipients.map(r => `0x${r}`),
					keys,
					content,
				},
				signatureArgs,
				payments.args,
			);
		} else {
			tx = await contract['sendBulkMail((uint256,uint256,uint256[],bytes[],bytes))'](
				{ feedId: `0x${feedId}`, uniqueId, recipients: recipients.map(r => `0x${r}`), keys, content },
				{ from, value },
			);
		}
		const receipt = await tx.wait();
		const {
			logs,
			byName: { MailPush },
		} = parseOutLogs(contract, receipt.logs);

		const tokenAttachmentEvents: TokenAttachmentEventObject[] = [];
		if (payments && signatureArgs && mailer.pay) {
			const {
				byName: { TokenAttachment },
			} = parseOutLogs(this.payWrapper.cache.getContract(mailer.address, signer), receipt.logs);
			tokenAttachmentEvents.push(
				...TokenAttachment.map(e =>
					parseTokenAttachmentEvent(e.logDescription as unknown as TokenAttachmentEvent),
				),
			);
		}
		const mailPushEvents = MailPush.map(l => ethersLogToInternalEvent<MailPushEventObject>(l));
		const enriched = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, tokenAttachmentEvents, messages };
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
		signatureArgs?: IYlideMailer.SignatureArgsStruct,
		payments?: Payment,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		tokenAttachmentEvents: TokenAttachmentEventObject[];
		messages: IEVMMessage[];
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		let tx: ethers.ContractTransaction = {} as ethers.ContractTransaction;
		if (payments && signatureArgs && mailer.pay) {
			tx = await this.payWrapper.addMailRecipientsWithToken(
				mailer.pay,
				signer,
				{
					feedId: `0x${feedId}`,
					uniqueId,
					firstBlockNumber,
					partsCount,
					blockCountLock,
					recipients: recipients.map(r => `0x${r}`),
					keys,
				},
				signatureArgs,
				payments.args,
			);
		} else {
			tx = await contract['addMailRecipients((uint256,uint256,uint256,uint16,uint16,uint256[],bytes[]))'](
				{
					feedId: `0x${feedId}`,
					uniqueId,
					firstBlockNumber,
					partsCount,
					blockCountLock,
					recipients: recipients.map(r => `0x${r}`),
					keys,
				},
				{ from, value },
			);
		}
		const receipt = await tx.wait();
		const {
			logs,
			byName: { MailPush },
		} = parseOutLogs(contract, receipt.logs);
		const tokenAttachmentEvents: TokenAttachmentEventObject[] = [];
		if (payments && signatureArgs && mailer.pay) {
			const {
				byName: { TokenAttachment },
			} = parseOutLogs(this.payWrapper.cache.getContract(mailer.address, signer), receipt.logs);
			tokenAttachmentEvents.push(
				...TokenAttachment.map(e =>
					parseTokenAttachmentEvent(e.logDescription as unknown as TokenAttachmentEvent),
				),
			);
		}
		const mailPushEvents = MailPush.map(l => ethersLogToInternalEvent<MailPushEventObject>(l));
		const enriched = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, tokenAttachmentEvents, messages };
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
			const tokenAttachmentEvents = await this.getTokenAttachmentEvents(event, provider);
			return this.processMailPushEvent(mailer, enriched, tokenAttachmentEvents);
		});
	}

	private addressToUint256(address: string): Uint256 {
		const lowerAddress = address.toLowerCase();
		const cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
		return hexToUint256(''.padStart(24, '0') + cleanHexAddress);
	}

	private isSender(event: MailPushEvent) {
		return YlideCore.getSentAddress(this.addressToUint256(event.args.sender)) === event.args.sender;
	}

	async getTokenAttachmentEvents(event: MailPushEvent, provider: ethers.providers.Provider) {
		const tokenAttachmentAddress = event.args.tokenAttachment;

		if (tokenAttachmentAddress !== ethers.constants.AddressZero) {
			const pay = new ethers.Contract(
				tokenAttachmentAddress,
				YlidePayV1__factory.createInterface(),
				provider,
			) as YlidePayV1;

			return pay
				.queryFilter(
					pay.filters.TokenAttachment(
						event.args.contentId,
						null,
						this.isSender(event) ? null : event.args.recipient.toHexString(),
					),
					event.blockHash,
				)
				.then(r => r.map(parseTokenAttachmentEvent));
		}
		return [];
	}

	getMessageRecipients(mailer: IEVMMailerContractLink, message: IEVMMessage) {
		return this.wrapper.cache.contractOperation(mailer, async (contract, _, blockLimit) => {
			const events = await getMultipleEvents<ContentRecipientsEvent>(
				contract,
				contract.filters.ContentRecipients('0x' + message.$$meta.contentId),
				blockLimit,
				message.$$meta.contentId,
			);
			return {
				contentId: bnToUint256(events[0]?.args.contentId),
				sender: events[0]?.args.sender || ethers.constants.AddressZero,
				recipients: events.flatMap(e => e.args.recipients.map(bnToUint256)),
			};
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
		const processEvent = (
			event: IEVMEnrichedEvent<MailPushEventObject>,
			tokenAttachmentEvents: TokenAttachmentEventObject[] = [],
		) => this.processMailPushEvent(mailer, event, tokenAttachmentEvents);
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
			this.getTokenAttachmentEvents.bind(this),
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

	private getDomain(mailer: IEVMMailerContractLink, chainId: number): TypedDataDomain {
		return {
			name: 'YlideMailerV9',
			version: '9',
			chainId,
			verifyingContract: mailer.address,
		};
	}

	async getNonce(mailer: IEVMMailerContractLink, userAddress: string) {
		return this.wrapper.cache.contractOperation(mailer, async contract => {
			return contract.nonces(userAddress);
		});
	}

	async signBulkMail(
		mailer: IEVMMailerContractLink,
		signer: ethers.providers.JsonRpcSigner,
		feedId: Uint256,
		uniqueId: number,
		recipients: Uint256[],
		keys: Uint8Array[],
		content: Uint8Array,
		deadline: BigNumberish,
		nonce: BigNumberish,
		chainId: number,
	) {
		return signer._signTypedData(this.getDomain(mailer, chainId), SendBulkMailTypes, {
			feedId: BigNumber.from(`0x${feedId}`),
			uniqueId,
			nonce,
			deadline,
			recipients: recipients.map(r => BigNumber.from(`0x${r}`)),
			keys: ethers.utils.concat(keys),
			content,
		});
	}

	async signAddMailRecipients(
		mailer: IEVMMailerContractLink,
		signer: ethers.providers.JsonRpcSigner,
		feedId: Uint256,
		uniqueId: number,
		firstBlockNumber: number,
		partsCount: number,
		blockCountLock: number,
		recipients: Uint256[],
		keys: Uint8Array[],
		deadline: BigNumberish,
		nonce: BigNumberish,
		chainId: number,
	) {
		return signer._signTypedData(this.getDomain(mailer, chainId), AddMailRecipientsTypes, {
			feedId: BigNumber.from(`0x${feedId}`),
			uniqueId,
			firstBlockNumber,
			nonce,
			deadline,
			partsCount,
			blockCountLock,
			recipients: recipients.map(r => BigNumber.from(`0x${r}`)),
			keys: ethers.utils.concat(keys),
		});
	}
}
