import { AbstractNameService } from '@ylide/sdk';
import { EthereumBlockchainController } from './EthereumBlockchainController';
export declare class EthereumNameService extends AbstractNameService {
    readonly controller: EthereumBlockchainController;
    readonly contractAddress: string;
    constructor(controller: EthereumBlockchainController, contractAddress: string);
    isCandidate(name: string): boolean;
    resolve(name: string): Promise<string | null>;
    reverseResolve(address: string): Promise<string | null>;
}
