import { Uint256 } from '@ylide/sdk';
import { Contract } from 'web3-eth-contract';
import Web3 from 'web3';
export declare class MailerContract {
    private readonly web3;
    readonly contractAddress: string;
    readonly contract: Contract;
    constructor(web3: Web3, contractAddress: string);
    buildHash(address: string, uniqueId: number, time: number): Promise<Uint256>;
    estimateAndCall(address: string, method: string, args: any[]): Promise<any>;
    setFees(address: string, _contentPartFee: bigint, _recipientFee: bigint): Promise<any>;
    transferOwnership(address: string, newOwner: string): Promise<any>;
    setBeneficiary(address: string, _beneficiary: string): Promise<any>;
    addRecipients(address: string, uniqueId: number, initTime: number, recipients: Uint256[], keys: Uint8Array[]): Promise<any>;
    sendMultipartMailPart(address: string, uniqueId: number, initTime: number, parts: number, partIdx: number, content: Uint8Array): Promise<any>;
    broadcastMail(address: string, uniqueId: number, content: Uint8Array): Promise<any>;
    broadcastMailHeader(address: string, uniqueId: number, initTime: number): Promise<any>;
    sendSmallMail(address: string, uniqueId: number, recipient: Uint256, key: Uint8Array, content: Uint8Array): Promise<any>;
    sendBulkMail(address: string, uniqueId: number, recipients: Uint256[], keys: Uint8Array[], content: Uint8Array): Promise<any>;
    static decodeIndexValue(numberStringValue: string): number[];
    static getVersion(w3: Web3, mailerAddress: string): Promise<number>;
    static extractRecipientIndex(address: Uint256, w3: Web3, mailerAddress: string): Promise<number[]>;
    static deployContract(web3: Web3, from: string): Promise<string>;
}
export declare const MAILER_ABI: {
    _format: string;
    contractName: string;
    sourceName: string;
    abi: ({
        inputs: never[];
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
        outputs: {
            internalType: string;
            name: string;
            type: string;
        }[];
        stateMutability: string;
        type: string;
        anonymous?: undefined;
    })[];
    bytecode: string;
    deployedBytecode: string;
    linkReferences: {};
    deployedLinkReferences: {};
};
