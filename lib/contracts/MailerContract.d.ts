import { Uint256 } from '@ylide/sdk';
import { Contract, EventData } from 'web3-eth-contract';
import { EthereumBlockchainController } from '../controllers/EthereumBlockchainController';
import { IEthereumContentMessageBody } from '../misc';
export declare class MailerContract {
    private readonly blockchainController;
    readonly contractAddress: string;
    readonly contract: Contract;
    constructor(blockchainController: EthereumBlockchainController, contractAddress: string);
    buildHash(address: string, uniqueId: number, time: number): Promise<Uint256>;
    estimateAndCall(address: string, method: string, args: any[]): Promise<any>;
    setFees(address: string, _contentPartFee: bigint, _recipientFee: bigint): Promise<any>;
    transferOwnership(address: string, newOwner: string): Promise<any>;
    setBeneficiary(address: string, _beneficiary: string): Promise<any>;
    addRecipients(address: string, uniqueId: number, initTime: number, recipients: Uint256[], keys: Uint8Array[]): Promise<any>;
    sendMultipartMailPart(address: string, uniqueId: number, initTime: number, parts: number, partIdx: number, content: Uint8Array): Promise<any>;
    sendSmallMail(address: string, uniqueId: number, recipient: Uint256, key: Uint8Array, content: Uint8Array): Promise<any>;
    sendBulkMail(address: string, uniqueId: number, recipients: Uint256[], keys: Uint8Array[], content: Uint8Array): Promise<any>;
    decodeContentMessageBody(ev: EventData): IEthereumContentMessageBody;
}
