import { BlockchainSource, GenericEntryPure, IMessage, ISourceSubject } from '@ylide/sdk';
import { EthereumBlockchainController } from './EthereumBlockchainController';
export declare class EthereumBlockchainSource extends BlockchainSource {
    readonly reader: EthereumBlockchainController;
    readonly subject: ISourceSubject;
    protected _pullCycle: number;
    readonly limit: number;
    readonly meta: any;
    protected lastBlockChecked: number;
    constructor(reader: EthereumBlockchainController, subject: ISourceSubject, _pullCycle?: number, limit?: number, meta?: any);
    getAfterBlock(blockNumber: number, limit: number): Promise<GenericEntryPure<IMessage>[]>;
    protected pull(): Promise<void>;
}
