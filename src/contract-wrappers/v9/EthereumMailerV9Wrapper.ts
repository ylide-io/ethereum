import { ethers } from 'ethers';
import type { EthereumBlockchainReader } from '../../controllers/helpers/EthereumBlockchainReader';
import { ethersEventToInternalEvent, EventParsed } from '../../controllers/helpers/ethersHelper';
import { BlockNumberRingBufferIndex } from '../../controllers/misc/BlockNumberRingBufferIndex';
import { validateMessage } from '../../misc/evmMsgId';
import type { IEVMEnrichedEvent, IEVMMailerContractLink, IEVMMessage } from '../../misc/types';
import { bnToUint256, IEventPosition } from '../../misc/utils';
import { ContractCache } from '../ContractCache';
import { EthereumMailerV9WrapperBroadcast } from './EthereumMailerV9WrapperBroadcast';
import { EthereumMailerV9WrapperContent } from './EthereumMailerV9WrapperContent';
import { EthereumMailerV9WrapperGlobals } from './EthereumMailerV9WrapperGlobals';
import { EthereumMailerV9WrapperMailing } from './EthereumMailerV9WrapperMailing';
import { YlideMailerV9, YlideMailerV9__factory } from './mock';
import { TypedEvent, TypedEventFilter } from './mock/common';

export class EthereumMailerV9Wrapper {
	public readonly cache: ContractCache<YlideMailerV9>;

	public readonly globals: EthereumMailerV9WrapperGlobals;
	public readonly mailing: EthereumMailerV9WrapperMailing;
	public readonly broadcast: EthereumMailerV9WrapperBroadcast;
	public readonly content: EthereumMailerV9WrapperContent;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlideMailerV9__factory, blockchainReader);

		this.globals = new EthereumMailerV9WrapperGlobals(this);
		this.mailing = new EthereumMailerV9WrapperMailing(this);
		this.broadcast = new EthereumMailerV9WrapperBroadcast(this);
		this.content = new EthereumMailerV9WrapperContent(this);
	}

	static async deploy(signer: ethers.Signer, from: string) {
		const factory = new YlideMailerV9__factory(signer);
		return (await factory.deploy()).address;
	}

	async retrieveHistoryDesc<T extends TypedEvent>(
		mailer: IEVMMailerContractLink,
		getBaseIndex: () => Promise<number[]>,
		getFilter: (contract: YlideMailerV9) => TypedEventFilter<T>,
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
