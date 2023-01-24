import { ethers } from 'ethers';
import { YlideMailerV8 } from '@ylide/ethereum-contracts';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';
import { Uint256 } from '@ylide/sdk';
import { IEthereumContractDescriptor } from '../EthereumBlockchainController';
import { MailContentEvent, MailPushEvent } from '@ylide/ethereum-contracts/lib/YlideMailerV8';
export declare class EthereumMailerV8Reader {
    readonly blockchainReader: EthereumBlockchainReader;
    private readonly mailerContractCache;
    constructor(blockchainReader: EthereumBlockchainReader);
    private getMailerContract;
    contractOperation<T>(mailer: IEthereumContractDescriptor, callback: (contract: YlideMailerV8, provider: ethers.providers.Provider, blockLimit: number, latestNotSupported: boolean, batchNotSupported: boolean, stopTrying: () => void) => Promise<T>): Promise<T>;
    getRecipientToPushIndex(mailer: IEthereumContractDescriptor, recipient: Uint256): Promise<number[]>;
    getRecipientMessagesCount(mailer: IEthereumContractDescriptor, recipient: Uint256): Promise<number>;
    getSenderToBroadcastIndex(mailer: IEthereumContractDescriptor, sender: string): Promise<number[]>;
    getSenderMessagesCount(mailer: IEthereumContractDescriptor, sender: string): Promise<number>;
    getMessageContentEvents(mailer: IEthereumContractDescriptor, msgId: Uint256, fromBlock?: number, toBlock?: number): Promise<MailContentEvent[]>;
    getMessagePushEvents(mailer: IEthereumContractDescriptor, recipient: Uint256 | null, sender: string | null, fromBlock?: number, toBlock?: number): Promise<MailPushEvent[]>;
}
