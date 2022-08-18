import { AbstractBlockchainController, IMessage, IMessageContent, IMessageCorruptedContent, IExtraEncryptionStrateryBulk, IExtraEncryptionStrateryEntry, MessageKey, PublicKey, BlockchainControllerFactory, Uint256 } from '@ylide/sdk';
import Web3 from 'web3';
import { EVMNetwork, IEthereumMessage } from '../misc';
import { provider } from 'web3-core';
import { EventData } from 'web3-eth-contract';
export declare class EthereumBlockchainController extends AbstractBlockchainController {
    private readonly options;
    web3Readers: Web3[];
    private blocksCache;
    readonly MESSAGES_FETCH_LIMIT = 50;
    readonly mailerContractAddress: string;
    readonly registryContractAddress: string;
    readonly network: EVMNetwork;
    readonly chainId: number;
    constructor(options?: {
        network?: EVMNetwork;
        mailerContractAddress?: string;
        registryContractAddress?: string;
        mailerStartBlock?: number;
        web3Readers?: provider[];
    });
    executeWeb3Op<T>(callback: (w3: Web3) => Promise<T>): Promise<T>;
    getRecipientReadingRules(address: string): Promise<any>;
    getAddressByPublicKey(publicKey: Uint8Array): Promise<string | null>;
    getPublicKeyByAddress(registryAddress: string, address: string): Promise<Uint8Array | null>;
    extractAddressFromPublicKey(publicKey: PublicKey): Promise<string | null>;
    extractPublicKeyFromAddress(address: string): Promise<PublicKey | null>;
    private getBlock;
    private getLastBlockNumber;
    private getBlockNumberByTime;
    private binSearchBlocks;
    private tryRequest;
    private eventCmpr;
    private retrieveEventsByBounds;
    getDefaultMailerAddress(): string;
    private _retrieveMessageHistoryByTime;
    private _retrieveMessageHistoryByBounds;
    private iterateMailers;
    retrieveMessageHistoryByTime(recipient: Uint256 | null, fromTimestamp?: number, toTimestamp?: number, limit?: number): Promise<IMessage[]>;
    retrieveMessageHistoryByBounds(recipient: Uint256 | null, fromMessage?: IMessage, toMessage?: IMessage, limit?: number): Promise<IMessage[]>;
    retrieveBroadcastHistoryByTime(sender: Uint256 | null, fromTimestamp?: number, toTimestamp?: number, limit?: number): Promise<IMessage[]>;
    retrieveBroadcastHistoryByBounds(sender: Uint256 | null, fromMessage?: IMessage, toMessage?: IMessage, limit?: number): Promise<IMessage[]>;
    retrieveAndVerifyMessageContent(msg: IMessage): Promise<IMessageContent | IMessageCorruptedContent | null>;
    retrieveMessageContentByMsgId(msgId: string): Promise<IMessageContent | IMessageCorruptedContent | null>;
    private formatPushMessage;
    isAddressValid(address: string): boolean;
    processMessages(msgs: EventData[]): Promise<IEthereumMessage[]>;
    getExtraEncryptionStrategiesFromAddress(address: string): Promise<IExtraEncryptionStrateryEntry[]>;
    getSupportedExtraEncryptionStrategies(): string[];
    prepareExtraEncryptionStrategyBulk(entries: IExtraEncryptionStrateryEntry[]): Promise<IExtraEncryptionStrateryBulk>;
    executeExtraEncryptionStrategy(entries: IExtraEncryptionStrateryEntry[], bulk: IExtraEncryptionStrateryBulk, addedPublicKeyIndex: number | null, messageKey: Uint8Array): Promise<MessageKey[]>;
    uint256ToAddress(value: Uint256): string;
    addressToUint256(address: string): Uint256;
    compareMessagesTime(a: IMessage, b: IMessage): number;
}
export declare const evmFactories: Record<EVMNetwork, BlockchainControllerFactory>;
