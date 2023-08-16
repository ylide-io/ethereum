import type { ethers } from 'ethers';
import type { YlideMailerV8 } from '@ylide/ethereum-contracts';
import { YlideMailerV8__factory } from '@ylide/ethereum-contracts';
import type { EVMBlockchainReader } from '../../controllers/helpers/EVMBlockchainReader';
import { BlockNumberRingBufferIndex } from '../../controllers/misc/BlockNumberRingBufferIndex';
import type { IEVMEnrichedEvent, IEVMMailerContractLink, IEVMMessage } from '../../misc/types';
import type { IEventPosition } from '../../misc/utils';
import { bnToUint256 } from '../../misc/utils';
import { validateMessage } from '../../misc/evmMsgId';
import type { TypedEvent, TypedEventFilter } from '@ylide/ethereum-contracts/lib/common';
import type { EventParsed } from '../../controllers/helpers/ethersHelper';
import { ethersEventToInternalEvent } from '../../controllers/helpers/ethersHelper';
import { ContractCache } from '../ContractCache';
import { EVMMailerV8WrapperBroadcast } from './EVMMailerV8WrapperBroadcast';
import { EVMMailerV8WrapperContent } from './EVMMailerV8WrapperContent';
import { EVMMailerV8WrapperGlobals } from './EVMMailerV8WrapperGlobals';
import { EVMMailerV8WrapperMailing } from './EVMMailerV8WrapperMailing';

export class EVMMailerV8Wrapper {
	public readonly cache: ContractCache<YlideMailerV8>;

	public readonly globals: EVMMailerV8WrapperGlobals;
	public readonly mailing: EVMMailerV8WrapperMailing;
	public readonly broadcast: EVMMailerV8WrapperBroadcast;
	public readonly content: EVMMailerV8WrapperContent;

	constructor(public readonly blockchainReader: EVMBlockchainReader) {
		this.cache = new ContractCache(YlideMailerV8__factory, blockchainReader);

		this.globals = new EVMMailerV8WrapperGlobals(this);
		this.mailing = new EVMMailerV8WrapperMailing(this);
		this.broadcast = new EVMMailerV8WrapperBroadcast(this);
		this.content = new EVMMailerV8WrapperContent(this);
	}

	static async deploy(signer: ethers.Signer, from: string) {
		const factory = new YlideMailerV8__factory(signer);
		return (await factory.deploy()).address;
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
