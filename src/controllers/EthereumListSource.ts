import EventEmitter from 'eventemitter3';
import {
	GenericListSource,
	IMessage,
	ISourceSubject,
	IMessageBase,
	BlockchainSourceType,
	asyncTimer,
} from '@ylide/sdk';
import { EthereumBlockchainController } from './EthereumBlockchainController';

/**
 * @internal
 */
export class EthereumListSource extends EventEmitter implements GenericListSource {
	protected pullTimer: any;
	protected lastMessage: IMessage | null = null;
	protected lastBlockChecked: number = 0;

	constructor(
		public readonly reader: EthereumBlockchainController,
		public readonly subject: ISourceSubject,
		protected _pullCycle: number = 120000,
		public readonly limit = 50,
		public readonly meta: any = null,
	) {
		super();
	}

	pause() {
		if (this.pullTimer) {
			this.pullTimer();
		}
	}

	resume(since?: IMessageBase | undefined): void {
		this.lastMessage = since || null;
		this.lastBlockChecked = since ? since.$$blockchainMetaDontUseThisField.block.number : 0;
		if (!this.pullTimer) {
			this.pullTimer = asyncTimer(this.pull.bind(this), this._pullCycle);
		}
	}

	compare(a: IMessage, b: IMessage): number {
		if (a.createdAt === b.createdAt) {
			return this.reader.compareMessagesTime(a, b);
		} else {
			return a.createdAt - b.createdAt;
		}
	}

	async getBefore(entry: IMessage, limit: number): Promise<IMessage[]> {
		if (this.subject.type === BlockchainSourceType.DIRECT) {
			return await this.reader.retrieveMessageHistoryByBounds(
				this.subject.sender,
				this.subject.recipient,
				undefined,
				entry,
				limit,
			);
		} else {
			return await this.reader.retrieveBroadcastHistoryByBounds(this.subject.sender, undefined, entry, limit);
		}
	}

	async getAfter(entry: IMessage, limit: number): Promise<IMessage[]> {
		if (this.subject.type === BlockchainSourceType.DIRECT) {
			return await this.reader.retrieveMessageHistoryByBounds(
				this.subject.sender,
				this.subject.recipient,
				entry,
				undefined,
				limit,
			);
		} else {
			return await this.reader.retrieveBroadcastHistoryByBounds(this.subject.sender, entry, undefined, limit);
		}
	}

	async getLast(limit: number, upToIncluding?: IMessage): Promise<IMessage[]> {
		if (this.subject.type === BlockchainSourceType.DIRECT) {
			return await this.reader.advancedRetrieveMessageHistoryByBounds(
				this.subject.sender,
				this.subject.recipient,
				upToIncluding,
				true,
				undefined,
				false,
				limit,
			);
		} else {
			return await this.reader.retrieveBroadcastHistoryByBounds(this.subject.sender, undefined, undefined, limit);
		}
	}

	async getAfterBlock(blockNumber: number, limit: number): Promise<IMessage[]> {
		return await this.reader.retrieveHistorySinceBlock(this.subject, blockNumber, this.lastMessage || undefined);
	}

	protected async pull() {
		// const messages = this.lastMessage
		// 	? await this.getAfter(this.lastMessage, this.limit)
		// 	: await this.getLast(this.limit);
		const lastBlockNumber = await this.reader.getLastBlockNumber();
		let messages: IMessage[];
		if (this.lastBlockChecked) {
			messages = await this.getAfterBlock(this.lastBlockChecked, this.limit);
		} else {
			messages = this.lastMessage
				? await this.getAfter(this.lastMessage, this.limit)
				: await this.getLast(this.limit);
		}
		this.lastBlockChecked = lastBlockNumber;
		if (messages.length) {
			this.lastMessage = messages[0];
			this.emit('messages', { reader: this.reader, subject: this.subject, messages });
		}
	}
}
