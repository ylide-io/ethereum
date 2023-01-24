import { Log } from '@ethersproject/providers';
import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import ethers from 'ethers';
import { IEthereumMessage } from '../../misc';
export interface IRPCDescriptor {
    rpcUrlOrProvider: string | ethers.providers.Provider;
    blockLimit: number;
    latestNotSupported?: boolean;
    batchNotSupported?: boolean;
}
export interface IInternalRPCDescriptor {
    rpcUrl?: string;
    provider: ethers.providers.Provider;
    blockLimit: number;
    latestNotSupported: boolean;
    batchNotSupported: boolean;
}
export declare class EthereumBlockchainReader {
    private readonly rpcs;
    private blocksCache;
    static createEthereumBlockchainReader(rpcs: IRPCDescriptor[]): EthereumBlockchainReader;
    private constructor();
    retryableOperation<T>(callback: (provider: ethers.providers.Provider, blockLimit: number, latestNotSupported: boolean, batchNotSupported: boolean, stopTrying: () => void) => Promise<T>): Promise<T>;
    getBlockByHash(hash: string): Promise<BlockWithTransactions>;
    getBalance(address: string): Promise<{
        original: string;
        number: number;
        string: string;
        e18: string;
    }>;
    processMessages<T extends Log>(msgs: T[]): Promise<IEthereumMessage<T>[]>;
    isAddressValid(address: string): boolean;
}
