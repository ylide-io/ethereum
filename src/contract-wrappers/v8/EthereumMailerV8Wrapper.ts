import { ethers } from 'ethers';
import { YlideMailerV8, YlideMailerV8__factory } from '@ylide/ethereum-contracts';
import type { EthereumBlockchainReader } from '../../controllers/helpers/EthereumBlockchainReader';
import { BlockNumberRingBufferIndex } from '../../controllers/misc/BlockNumberRingBufferIndex';
import type { IEVMEnrichedEvent, IEVMMailerContractLink, IEVMMessage } from '../../misc/types';
import { bnToUint256, IEventPosition } from '../../misc/utils';
import { validateMessage } from '../../misc/evmMsgId';
import type { TypedEvent, TypedEventFilter } from '@ylide/ethereum-contracts/lib/common';
import { ethersEventToInternalEvent, EventParsed } from '../../controllers/helpers/ethersHelper';
import { ContractCache } from '../ContractCache';
import { EthereumMailerV8WrapperBroadcast } from './EthereumMailerV8WrapperBroadcast';
import { EthereumMailerV8WrapperContent } from './EthereumMailerV8WrapperContent';
import { EthereumMailerV8WrapperGlobals } from './EthereumMailerV8WrapperGlobals';
import { EthereumMailerV8WrapperMailing } from './EthereumMailerV8WrapperMailing';

export class EthereumMailerV8Wrapper {
	public readonly cache: ContractCache<YlideMailerV8>;

	public readonly globals: EthereumMailerV8WrapperGlobals;
	public readonly mailing: EthereumMailerV8WrapperMailing;
	public readonly broadcast: EthereumMailerV8WrapperBroadcast;
	public readonly content: EthereumMailerV8WrapperContent;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlideMailerV8__factory, blockchainReader);

		this.globals = new EthereumMailerV8WrapperGlobals(this);
		this.mailing = new EthereumMailerV8WrapperMailing(this);
		this.broadcast = new EthereumMailerV8WrapperBroadcast(this);
		this.content = new EthereumMailerV8WrapperContent(this);
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
