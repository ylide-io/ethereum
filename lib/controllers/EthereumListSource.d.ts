import EventEmitter from 'eventemitter3';
import { GenericListSource, IMessage, ISourceSubject, IMessageBase } from '@ylide/sdk';
import { EthereumBlockchainController } from './EthereumBlockchainController';
/**
 * @internal
 */
export declare class EthereumListSource extends EventEmitter implements GenericListSource {
    readonly reader: EthereumBlockchainController;
    readonly subject: ISourceSubject;
    protected _pullCycle: number;
    readonly limit: number;
    readonly meta: any;
    protected pullTimer: any;
    protected lastMessage: IMessage | null;
    protected lastBlockChecked: number;
    constructor(reader: EthereumBlockchainController, subject: ISourceSubject, _pullCycle?: number, limit?: number, meta?: any);
    pause(): void;
    resume(since?: IMessageBase | undefined): void;
    compare: (a: IMessage, b: IMessage) => number;
    getBefore(entry: IMessage, limit: number): Promise<IMessage[]>;
    getAfter(entry: IMessage, limit: number): Promise<IMessage[]>;
    getLast(limit: number, upToIncluding?: IMessage, mutableParams?: any): Promise<IMessage[]>;
    getAfterBlock(blockNumber: number, limit: number): Promise<IMessage[]>;
    protected pull(): Promise<void>;
}
