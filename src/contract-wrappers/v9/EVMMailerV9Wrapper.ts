import type { YlideMailerV9 } from '@ylide/ethereum-contracts';
import { YlideMailerV9__factory } from '@ylide/ethereum-contracts';
import type { TypedEvent, TypedEventFilter } from '@ylide/ethereum-contracts/lib/common';
import type { TokenAttachmentEventObject } from '@ylide/ethereum-contracts/lib/contracts/YlidePayV1';
import type { ethers } from 'ethers';
import type { EVMBlockchainReader } from '../../controllers/helpers/EVMBlockchainReader';
import type { EventParsed } from '../../controllers/helpers/ethersHelper';
import { ethersEventToInternalEvent } from '../../controllers/helpers/ethersHelper';
import { BlockNumberRingBufferIndex } from '../../controllers/misc/BlockNumberRingBufferIndex';
import { validateMessage } from '../../misc/evmMsgId';
import type { IEVMEnrichedEvent, IEVMMailerContractLink, IEVMMessage } from '../../misc/types';
import type { IEventPosition } from '../../misc/utils';
import { bnToUint256 } from '../../misc/utils';
import { ContractCache } from '../ContractCache';
import { EVMMailerV9WrapperBroadcast } from './EVMMailerV9WrapperBroadcast';
import { EVMMailerV9WrapperContent } from './EVMMailerV9WrapperContent';
import { EVMMailerV9WrapperGlobals } from './EVMMailerV9WrapperGlobals';
import { EVMMailerV9WrapperMailing } from './EVMMailerV9WrapperMailing';

export class EVMMailerV9Wrapper {
	public readonly cache: ContractCache<YlideMailerV9>;

	public readonly globals: EVMMailerV9WrapperGlobals;
	public readonly mailing: EVMMailerV9WrapperMailing;
	public readonly broadcast: EVMMailerV9WrapperBroadcast;
	public readonly content: EVMMailerV9WrapperContent;

	constructor(public readonly blockchainReader: EVMBlockchainReader) {
		this.cache = new ContractCache(YlideMailerV9__factory, blockchainReader);

		this.globals = new EVMMailerV9WrapperGlobals(this);
		this.mailing = new EVMMailerV9WrapperMailing(this);
		this.broadcast = new EVMMailerV9WrapperBroadcast(this);
		this.content = new EVMMailerV9WrapperContent(this);
	}

	static async deploy(signer: ethers.Signer, from: string) {
		const factory = new YlideMailerV9__factory(signer);
		return (await factory.deploy()).address;
	}

	async retrieveHistoryDesc<T extends TypedEvent>(
		mailer: IEVMMailerContractLink,
		getBaseIndex: () => Promise<number[]>,
		getFilter: (contract: YlideMailerV9) => TypedEventFilter<T>,
		processEvent: (
			event: IEVMEnrichedEvent<EventParsed<T>>,
			tokenAttachmentEvents?: TokenAttachmentEventObject[],
		) => IEVMMessage,
		fromMessage: IEVMMessage | null,
		includeFromMessage: boolean,
		toMessage: IEVMMessage | null,
		includeToMessage: boolean,
		limit: number | null,
	): Promise<IEVMMessage[]> {
		validateMessage(mailer, fromMessage);
		validateMessage(mailer, toMessage);

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
}
