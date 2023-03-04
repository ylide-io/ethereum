import { YlideMailerV8 } from '@ylide/ethereum-contracts';
import type {
	MailPushEventObject,
	MailPushEvent,
	MailingFeedJoinedEventObject,
	MailingFeedJoinedEvent,
} from '@ylide/ethereum-contracts/lib/YlideMailerV8';
import type { Uint256 } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { ethers, BigNumber } from 'ethers';
import { ethersEventToInternalEvent, ethersLogToInternalEvent } from '../../controllers/helpers/ethersHelper';
import { BlockNumberRingBufferIndex } from '../../controllers/misc/BlockNumberRingBufferIndex';
import { EVM_CONTRACT_TO_NETWORK, EVM_NAMES } from '../../misc/constants';
import { encodeEvmMsgId } from '../../misc/evmMsgId';
import type { IEVMEnrichedEvent, IEVMEvent, IEVMMailerContractLink, IEVMMessage } from '../../misc/types';
import { bnToUint256, IEventPosition } from '../../misc/utils';
import type { EthereumMailerV8Wrapper } from './EthereumMailerV8Wrapper';
import { parseOutLogs } from './utils';

export class EthereumMailerV8WrapperMailing {
	constructor(public readonly wrapper: EthereumMailerV8Wrapper) {
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
		value: ethers.BigNumber,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		events: { log: ethers.providers.Log; logDescription: ethers.utils.LogDescription }[];
		feedId: Uint256 | null;
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.createMailingFeed({ from, value });
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
				recipientFee: recipientFee.div('1000000000000000000'),
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
		const tx = await contract.setMailingFeedFees(
			`0x${feedId}`,
			fees.recipientFee.mul(BigNumber.from('1000000000000000000')),
			{ from },
		);
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

	async sendSmallMail(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		uniqueId: number,
		recipient: Uint256,
		key: Uint8Array,
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
		const tx = await contract.sendSmallMail(`0x${feedId}`, uniqueId, `0x${recipient}`, key, content, {
			from,
			value,
		});
		const receipt = await tx.wait();
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
				ethersLogToInternalEvent<MailPushEventObject>({
					log: l.log,
					logDescription: l.logDescription,
				}),
			);
		const enriched = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
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
		value: ethers.BigNumber,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.sendBulkMail(
			`0x${feedId}`,
			uniqueId,
			recipients.map(r => `0x${r}`),
			keys,
			content,
			{ from, value },
		);
		const receipt = await tx.wait();
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
				ethersLogToInternalEvent<MailPushEventObject>({
					log: l.log,
					logDescription: l.logDescription,
				}),
			);
		const enriched = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
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
		value: ethers.BigNumber,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.addMailRecipients(
			`0x${feedId}`,
			uniqueId,
			firstBlockNumber,
			partsCount,
			blockCountLock,
			recipients.map(r => `0x${r}`),
			keys,
			{ from, value },
		);
		const receipt = await tx.wait();
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
				ethersLogToInternalEvent<MailPushEventObject>({
					log: l.log,
					logDescription: l.logDescription,
				}),
			);
		const enriched = await this.wrapper.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => this.processMailPushEvent(mailer, e));
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
		const getFilter = (contract: YlideMailerV8) => contract.filters.MailPush(`0x${recipient}`, `0x${feedId}`);
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
		const getFilter = (contract: YlideMailerV8) => contract.filters.MailingFeedJoined(null, `0x${recipient}`);

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
