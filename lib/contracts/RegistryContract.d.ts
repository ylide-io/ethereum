import { Contract } from 'web3-eth-contract';
import { EthereumBlockchainController } from '../controllers';
export declare class RegistryContract {
    private readonly blockchainController;
    private readonly contractAddress;
    readonly contract: Contract;
    constructor(blockchainController: EthereumBlockchainController, contractAddress: string);
    estimateAndCall(address: string, method: string, args: any[]): Promise<any>;
    getAddressByPublicKey(publicKey: Uint8Array): Promise<string | null>;
    getPublicKeyByAddress(address: string): Promise<Uint8Array | null>;
    attachPublicKey(address: string, publicKey: Uint8Array): Promise<boolean>;
    attachAddress(address: string, publicKey: Uint8Array): Promise<boolean>;
    private decodePublicKeyToAddressMessageBody;
    private decodeAddressToPublicKeyMessageBody;
}
