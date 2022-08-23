import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
export declare class RegistryContract {
    private readonly web3;
    private readonly contractAddress;
    readonly contract: Contract;
    constructor(web3: Web3, contractAddress: string);
    estimateAndCall(address: string, method: string, args: any[]): Promise<any>;
    attachPublicKey(address: string, publicKey: Uint8Array): Promise<boolean>;
    attachAddress(address: string, publicKey: Uint8Array): Promise<boolean>;
}
export declare const REGISTRY_ABI: {
    _format: string;
    contractName: string;
    sourceName: string;
    abi: ({
        inputs: never[];
        stateMutability: string;
        type: string;
        name?: undefined;
        outputs?: undefined;
    } | {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
    })[];
    bytecode: string;
    deployedBytecode: string;
    linkReferences: {};
    deployedLinkReferences: {};
};
