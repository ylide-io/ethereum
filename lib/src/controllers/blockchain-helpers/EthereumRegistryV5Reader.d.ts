import { ethers } from 'ethers';
import { YlideRegistryV5 } from '@ylide/ethereum-contracts';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';
import { ExternalYlidePublicKey } from '@ylide/sdk';
import { IEthereumContractDescriptor } from '../EthereumBlockchainController';
export declare class EthereumRegistryV5Reader {
    readonly blockchainReader: EthereumBlockchainReader;
    private readonly registryContractCache;
    constructor(blockchainReader: EthereumBlockchainReader);
    private getRegistryContract;
    contractOperation<T>(registry: IEthereumContractDescriptor, callback: (contract: YlideRegistryV5, provider: ethers.providers.Provider, blockLimit: number, latestNotSupported: boolean, batchNotSupported: boolean, stopTrying: () => void) => Promise<T>): Promise<T>;
    getPublicKeyByAddress(registry: IEthereumContractDescriptor, address: string): Promise<ExternalYlidePublicKey | null>;
}
