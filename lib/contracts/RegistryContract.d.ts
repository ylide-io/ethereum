import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
export declare class RegistryContract {
    private readonly web3;
    private readonly contractAddress;
    readonly contract: Contract;
    constructor(web3: Web3, contractAddress: string);
    estimateAndCall(address: string, method: string, args: any[]): Promise<any>;
    estimateAndGetABI(address: string, method: string, args: any[], value?: string): Promise<{
        data: any;
        gas: number;
        gasPrice: string;
    }>;
    attachPublicKey(address: string, publicKey: Uint8Array, keyVersion: number): Promise<boolean>;
    setBonucer(from: string, newBonucer: string, val: boolean): Promise<any>;
    setBonuses(from: string, _newcomerBonus: string, _referrerBonus: string): Promise<any>;
    attachPublicKeyByAdmin(from: string, _v: number, _r: string, _s: string, address: string, publicKey: Uint8Array, keyVersion: number, referrer: string, payBonus: boolean, value: string): Promise<{
        data: any;
        gas: number;
        gasPrice: string;
    }>;
    static getVersion(w3: Web3, registryAddress: string): Promise<number>;
    static extractPublicKeyFromAddress(address: string, w3: Web3, registryAddress: string): Promise<null | {
        block: number;
        keyVersion: number;
        publicKey: Uint8Array;
        timestamp: number;
    }>;
    static deployContract(web3: Web3, from: string, previousContract?: string): Promise<string>;
}
export declare const REGISTRY_ABI: {
    _format: string;
    contractName: string;
    sourceName: string;
    abi: ({
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
        anonymous?: undefined;
        name?: undefined;
        outputs?: undefined;
    } | {
        anonymous: boolean;
        inputs: {
            indexed: boolean;
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        type: string;
        stateMutability?: undefined;
        outputs?: undefined;
    } | {
        inputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        name: string;
        outputs: ({
            components: {
                internalType: string;
                name: string;
                type: string;
            }[];
            internalType: string;
            name: string;
            type: string;
        } | {
            internalType: string;
            name: string;
            type: string;
            components?: undefined;
        })[];
        stateMutability: string;
        type: string;
        anonymous?: undefined;
    } | {
        stateMutability: string;
        type: string;
        inputs?: undefined;
        anonymous?: undefined;
        name?: undefined;
        outputs?: undefined;
    })[];
    bytecode: string;
    deployedBytecode: string;
    linkReferences: {};
    deployedLinkReferences: {};
};
