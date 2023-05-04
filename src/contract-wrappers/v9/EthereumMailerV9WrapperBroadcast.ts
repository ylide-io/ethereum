import type { YlideMailerV9 } from '@ylide/ethereum-contracts';
import type {
	BroadcastPushEvent,
	BroadcastPushEventObject,
} from '@ylide/ethereum-contracts/lib/contracts/YlideMailerV9';
import type { Uint256 } from '@ylide/sdk';
import type { BigNumber, ethers } from 'ethers';
import { ethersEventToInternalEvent, ethersLogToInternalEvent } from '../../controllers/helpers/ethersHelper';
import { BlockNumberRingBufferIndex } from '../../controllers/misc/BlockNumberRingBufferIndex';
import { EVM_CONTRACT_TO_NETWORK, EVM_NAMES } from '../../misc/constants';
import { encodeEvmMsgId } from '../../misc/evmMsgId';
import type {
	ConnectorEventCallback,
	IEVMEnrichedEvent,
	IEVMEvent,
	IEVMMailerContractLink,
	IEVMMessage,
} from '../../misc/types';
import { ConnectorEventState } from '../../misc/types';
import { ConnectorEventEnum } from '../../misc/types';
import { bnToUint256, parseOutLogs } from '../../misc/utils';
import type { EthereumMailerV9Wrapper } from './EthereumMailerV9Wrapper';

export class EthereumMailerV9WrapperBroadcast {
	constructor(public readonly wrapper: EthereumMailerV9Wrapper) {
		//
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

	async createBroadcastFeed(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		uniqueId: Uint256,
		isPublic: boolean,
		value: ethers.BigNumber,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		events: { log: ethers.providers.Log; logDescription: ethers.utils.LogDescription }[];
		feedId: Uint256 | null;
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.createBroadcastFeed(`0x${uniqueId}`, isPublic, { from, value });
		const receipt = await tx.wait();
		const {
			byName: { BroadcastFeedCreated: events },
		} = parseOutLogs(contract, receipt.logs);
		const feedId = events[0]?.logDescription.args?.feedId
			? bnToUint256(events[0]?.logDescription.args?.feedId)
			: null;
		return { tx, receipt, events, feedId };
	}

	async getBroadcastFeedParams(
		mailer: IEVMMailerContractLink,
		feedId: Uint256,
	): Promise<{
		owner: string;
		beneficiary: string;
		broadcastFee: BigNumber;
		isPublic: boolean;
		messagesIndex: number[];
		messagesCount: number;
	}> {
		return await this.wrapper.cache.contractOperation(mailer, async contract => {
			const [owner, beneficiary, broadcastFee, isPublic, messagesIndex, messagesCount] =
				await contract.functions.broadcastFeeds(`0x${feedId}`);
			return {
				owner,
				beneficiary,
				broadcastFee,
				isPublic,
				messagesIndex: BlockNumberRingBufferIndex.decodeIndexValue(bnToUint256(messagesIndex)),
				messagesCount: messagesCount.toNumber(),
			};
		});
	}

	async setBroadcastFeedPublicity(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		isPublic: boolean,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.changeBroadcastFeedPublicity(`0x${feedId}`, isPublic, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async setBroadcastFeedOwner(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		newOwner: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.transferBroadcastFeedOwnership(`0x${feedId}`, newOwner, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async setBroadcastFeedBeneficiary(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		beneficiary: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.setBroadcastFeedBeneficiary(`0x${feedId}`, beneficiary, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async setBroadcastFeedFees(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		fees: { broadcastFee: BigNumber },
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.setBroadcastFeedFees(`0x${feedId}`, fees.broadcastFee, { from });
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
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
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
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.removeBroadcastFeedWriter(`0x${feedId}`, writer, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async isBroadcastFeedWriter(mailer: IEVMMailerContractLink, feedId: Uint256, address: string): Promise<boolean> {
		return await this.wrapper.cache.contractOperation(mailer, async contract => {
			return await contract.isBroadcastFeedWriter(`0x${feedId}`, address);
		});
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
		const getBaseIndex: () => Promise<number[]> = async () =>
			(await this.getBroadcastFeedParams(mailer, feedId)).messagesIndex;
		const getFilter = (contract: YlideMailerV9) => contract.filters.BroadcastPush(null, `0x${feedId}`);
		const processEvent = (event: IEVMEnrichedEvent<BroadcastPushEventObject>) =>
			this.processBroadcastPushEvent(mailer, event);
		return await this.wrapper.retrieveHistoryDesc<BroadcastPushEvent>(
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

	async getBroadcastPushEvent(
		mailer: IEVMMailerContractLink,
		blockNumber: number,
		txIndex: number,
		logIndex: number,
	): Promise<IEVMMessage | null> {
		return await this.wrapper.cache.contractOperation(mailer, async (contract, provider) => {
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
			const [enriched] = await this.wrapper.blockchainReader.enrichEvents<BroadcastPushEventObject>([
				ethersEventToInternalEvent(event),
			]);
			return this.processBroadcastPushEvent(mailer, enriched);
		});
	}

	async sendBroadcast(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		isPersonal: boolean,
		feedId: Uint256,
		uniqueId: number,
		content: Uint8Array,
		value: ethers.BigNumber,
		options: {
			cb?: ConnectorEventCallback;
			nonce?: number;
		} = {},
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		broadcastPushEvents: IEVMEvent<BroadcastPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		options.cb?.({
			kind: ConnectorEventEnum.BROADCAST,
			state: ConnectorEventState.SIGNING,
		});
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.sendBroadcast(isPersonal, `0x${feedId}`, uniqueId, content, { from, value });
		options.cb?.({
			kind: ConnectorEventEnum.BROADCAST,
			state: ConnectorEventState.PENDING,
		});
		const receipt = await tx.wait();
		options.cb?.({
			kind: ConnectorEventEnum.BROADCAST,
			state: ConnectorEventState.MINED,
		});
		options.cb?.({
			kind: ConnectorEventEnum.BROADCAST,
			state: ConnectorEventState.FETCHING,
		});
		const {
			logs,
			byName: { BroadcastPush: events },
		} = parseOutLogs(contract, receipt.logs);
		const broadcastPushEvents = events.map(l => ethersLogToInternalEvent<BroadcastPushEventObject>(l));
		const enriched = await this.wrapper.blockchainReader.enrichEvents<BroadcastPushEventObject>(
			broadcastPushEvents,
		);
		const messages = enriched.map(e => this.processBroadcastPushEvent(mailer, e));
		options.cb?.({
			kind: ConnectorEventEnum.BROADCAST,
			state: ConnectorEventState.READY,
		});
		return { tx, receipt, logs: logs.map(l => l.logDescription), broadcastPushEvents, messages };
	}

	async sendBroadcastHeader(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		isPersonal: boolean,
		feedId: Uint256,
		uniqueId: number,
		firstBlockNumber: number,
		partsCount: number,
		blockCountLock: number,
		value: ethers.BigNumber,
		options: {
			cb?: ConnectorEventCallback;
			nonce?: number;
		} = {},
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		broadcastPushEvents: IEVMEvent<BroadcastPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		options.cb?.({
			kind: ConnectorEventEnum.BROADCAST_HEADER,
			state: ConnectorEventState.SIGNING,
		});
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const populatedTx = await contract.populateTransaction.sendBroadcastHeader(
			isPersonal,
			`0x${feedId}`,
			uniqueId,
			firstBlockNumber,
			partsCount,
			blockCountLock,
			{ from, value, nonce: options.nonce },
		);
		const tx = await signer.sendTransaction(populatedTx);
		options.cb?.({
			kind: ConnectorEventEnum.BROADCAST_HEADER,
			state: ConnectorEventState.PENDING,
		});
		const receipt = await tx.wait();
		options.cb?.({
			kind: ConnectorEventEnum.BROADCAST_HEADER,
			state: ConnectorEventState.MINED,
		});
		options.cb?.({
			kind: ConnectorEventEnum.BROADCAST_HEADER,
			state: ConnectorEventState.FETCHING,
		});
		const {
			logs,
			byName: { BroadcastPush: events },
		} = parseOutLogs(contract, receipt.logs);
		const broadcastPushEvents = events.map(l => ethersLogToInternalEvent<BroadcastPushEventObject>(l));
		const enriched = await this.wrapper.blockchainReader.enrichEvents<BroadcastPushEventObject>(
			broadcastPushEvents,
		);
		const messages = enriched.map(e => this.processBroadcastPushEvent(mailer, e));
		options.cb?.({
			kind: ConnectorEventEnum.BROADCAST_HEADER,
			state: ConnectorEventState.READY,
		});
		return { tx, receipt, logs: logs.map(l => l.logDescription), broadcastPushEvents, messages };
	}
}
