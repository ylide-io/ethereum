import { YlideMailerV9 } from '@ylide/ethereum-contracts';
import {
	ContentRecipientsEvent,
	MailPushEvent,
	MailPushEventObject,
	MailingFeedJoinedEvent,
	MailingFeedJoinedEventObject,
} from '@ylide/ethereum-contracts/lib/contracts/YlideMailerV9';
import { Uint256 } from '@ylide/sdk';
import { BigNumber, BigNumberish, TypedDataDomain, ethers } from 'ethers';
import { ethersEventToInternalEvent, ethersLogToInternalEvent } from '../../controllers/helpers/ethersHelper';
import { BlockNumberRingBufferIndex } from '../../controllers/misc/BlockNumberRingBufferIndex';
import { ContractType, IEVMEnrichedEvent, IEVMEvent, IEVMMailerContractLink, IEVMMessage } from '../../misc/types';
import { IEventPosition, bnToUint256, getMultipleEvents, parseOutLogs, processMailPushEvent } from '../../misc/utils';
import type { EthereumMailerV9Wrapper } from './EthereumMailerV9Wrapper';

export class EthereumMailerV9WrapperMailing {
	public readonly SendBulkMailTypes = {
		SendBulkMail: [
			{ name: 'feedId', type: 'uint256' },
			{ name: 'uniqueId', type: 'uint256' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'deadline', type: 'uint256' },
			{ name: 'recipients', type: 'uint256[]' },
			{ name: 'keys', type: 'bytes' },
			{ name: 'content', type: 'bytes' },
			{ name: 'contractAddress', type: 'address' },
			{ name: 'contractType', type: 'uint8' },
		],
	};

	public readonly AddMailRecipientsTypes = {
		AddMailRecipients: [
			{ name: 'feedId', type: 'uint256' },
			{ name: 'uniqueId', type: 'uint256' },
			{ name: 'firstBlockNumber', type: 'uint256' },
			{ name: 'nonce', type: 'uint256' },
			{ name: 'deadline', type: 'uint256' },
			{ name: 'partsCount', type: 'uint16' },
			{ name: 'blockCountLock', type: 'uint16' },
			{ name: 'recipients', type: 'uint256[]' },
			{ name: 'keys', type: 'bytes' },
			{ name: 'contractAddress', type: 'address' },
			{ name: 'contractType', type: 'uint8' },
		],
	};

	constructor(public readonly wrapper: EthereumMailerV9Wrapper) {}

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
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract['sendBulkMail((uint256,uint256,uint256[],bytes[],bytes))'](
			{ feedId: `0x${feedId}`, uniqueId, recipients: recipients.map(r => `0x${r}`), keys, content },
			{ from, value },
		);
		const receipt = await tx.wait();
		const {
			logs,
			byName: { MailPush },
		} = parseOutLogs(contract, receipt.logs);

		const mailPushEvents = MailPush.map(l => ethersLogToInternalEvent<MailPushEventObject>(l));
		const enriched = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => processMailPushEvent(mailer, e));
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
		value: ethers.BigNumber,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract['addMailRecipients((uint256,uint256,uint256,uint16,uint16,uint256[],bytes[]))'](
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
		const receipt = await tx.wait();
		const {
			logs,
			byName: { MailPush },
		} = parseOutLogs(contract, receipt.logs);
		const mailPushEvents = MailPush.map(l => ethersLogToInternalEvent<MailPushEventObject>(l));
		const enriched = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages };
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
			return processMailPushEvent(mailer, enriched);
		});
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
		const processEvent = (event: IEVMEnrichedEvent<MailPushEventObject>) => processMailPushEvent(mailer, event);
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
		contractAddress: string,
		contractType: ContractType,
	) {
		return signer._signTypedData(this.getDomain(mailer, chainId), this.SendBulkMailTypes, {
			feedId: `0x${feedId}`,
			uniqueId,
			nonce,
			deadline,
			recipients: recipients.map(r => `0x${r}`),
			keys: ethers.utils.concat(keys),
			content,
			contractAddress,
			contractType,
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
		contractAddress: string,
		contractType: ContractType,
	) {
		return signer._signTypedData(this.getDomain(mailer, chainId), this.AddMailRecipientsTypes, {
			feedId: `0x${feedId}`,
			uniqueId,
			firstBlockNumber,
			nonce,
			deadline,
			partsCount,
			blockCountLock,
			recipients: recipients.map(r => `0x${r}`),
			keys: ethers.utils.concat(keys),
			contractAddress,
			contractType,
		});
	}
}
