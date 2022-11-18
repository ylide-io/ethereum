import { AbstractBlockchainController, IMessage, IMessageContent, IMessageCorruptedContent, IExtraEncryptionStrateryBulk, IExtraEncryptionStrateryEntry, MessageKey, PublicKey, BlockchainControllerFactory, Uint256, ISourceSubject } from '@ylide/sdk';
import Web3 from 'web3';
import { IEthereumContractLink } from '../misc/constants';
import { EVMNetwork, IEthereumMessage } from '../misc';
import { provider, BlockNumber } from 'web3-core';
import { BlockTransactionString } from 'web3-eth';
import { EventData } from 'web3-eth-contract';
import { EthereumNameService } from './EthereumNameService';
export declare class EthereumBlockchainController extends AbstractBlockchainController {
    private readonly options;
    web3Readers: {
        web3: Web3;
        blockLimit: number;
        latestNotSupported: boolean;
        batchNotSupported: boolean;
    }[];
    private blocksCache;
    readonly MESSAGES_FETCH_LIMIT = 50;
    readonly mailerContractAddress: string;
    readonly mailerFirstBlock: number;
    readonly registryContractAddress: string;
    readonly registryFirstBlock: number;
    readonly network: EVMNetwork;
    readonly chainId: number;
    readonly nameService: EthereumNameService | null;
    private readonly txcs;
    constructor(options?: {
        network?: EVMNetwork;
        mailerContractAddress?: string;
        registryContractAddress?: string;
        nameServiceAddress?: string;
        web3Readers?: provider[];
    });
    blockchainGroup(): string;
    blockchain(): string;
    private tryGetNameService;
    isReadingBySenderAvailable(): boolean;
    defaultNameService(): EthereumNameService | null;
    init(): Promise<void>;
    getBalance(address: string): Promise<{
        original: string;
        number: number;
        string: string;
        e18: string;
    }>;
    getRecipientIndex(recipient: Uint256, mailerAddress: string): Promise<number[]>;
    executeWeb3Op<T>(callback: (w3: Web3, blockLimit: number, latestNotSupported: boolean, batchNotSupported: boolean, doBreak: () => void) => Promise<T>): Promise<T>;
    getRecipientReadingRules(address: string): Promise<any>;
    getAddressByPublicKey(publicKey: Uint8Array): Promise<string | null>;
    getPublicKeyByAddress(registryAddress: string, address: string): Promise<Uint8Array | null>;
    extractAddressFromPublicKey(publicKey: PublicKey): Promise<string | null>;
    extractPublicKeyFromAddress(address: string): Promise<PublicKey | null>;
    getBlock(n: number): Promise<BlockTransactionString>;
    getLastBlockNumber(): Promise<number>;
    getBlockNumberByTime(time: number, firstBlock?: BlockTransactionString, lastBlock?: BlockTransactionString): Promise<BlockTransactionString>;
    binSearchBlocks(fromTime?: number, toTime?: number): Promise<{
        fromBlock: BlockTransactionString;
        toBlock: BlockTransactionString;
    }>;
    doEventsRequest(mailerAddress: string, subject: ISourceSubject, w3: Web3, fromBlock: BlockNumber, toBlock: BlockNumber): Promise<EventData[]>;
    tryRequest(mailerAddress: string, subject: ISourceSubject, fromBlockNumber: number, toBlockNumber: number): Promise<{
        result: false;
    } | {
        result: true;
        data: EventData[];
    }>;
    eventCmpr(a: EventData, b: EventData): number;
    retrieveEventsByBounds(mailerAddress: string, subject: ISourceSubject, fromBlockNumber: number, toBlockNumber: number, limit?: number): Promise<EventData[]>;
    _retrieveEventsSinceBlock(mailerAddress: string, subject: ISourceSubject, fromBlockNumber: number, limit?: number): Promise<EventData[]>;
    getDefaultMailerAddress(): string;
    _retrieveMessageHistoryByTime(mailerAddress: string, subject: ISourceSubject, fromTimestamp?: number, toTimestamp?: number, limit?: number): Promise<IMessage[]>;
    retrieveHistorySinceBlock(subject: ISourceSubject, fromBlock: number, firstMessage?: IMessage): Promise<import("@ylide/sdk").IMessageBase[]>;
    advancedRetrieveMessageHistoryByBounds(sender: string | null, recipient: Uint256 | null, fromMessage?: IMessage, fromMessageIncluding?: boolean, fromBlockNumber?: number, toMessage?: IMessage, toMessageIncluding?: boolean, limit?: number): Promise<{
        messages: import("@ylide/sdk").IMessageBase[];
        toBlockNumber: number;
    }>;
    _retrieveMessageHistoryByBounds(mailerAddress: string, subject: ISourceSubject, fromMessage?: IMessage, fromMessageIncluding?: boolean, fromBlockNumber?: number, toMessage?: IMessage, toMessageIncluding?: boolean, toBlockNumber?: number, limit?: number): Promise<import("@ylide/sdk").IMessageBase[]>;
    iterateMailers(limit: number | undefined, callback: (mailer: IEthereumContractLink) => Promise<IMessage[]>): Promise<IMessage[]>;
    retrieveMessageHistoryByTime(sender: Uint256 | null, recipient: Uint256 | null, fromTimestamp?: number, toTimestamp?: number, limit?: number): Promise<IMessage[]>;
    retrieveMessageHistoryByBounds(sender: string | null, recipient: Uint256 | null, fromMessage?: IMessage, toMessage?: IMessage, limit?: number): Promise<IMessage[]>;
    retrieveBroadcastHistoryByTime(sender: string | null, fromTimestamp?: number, toTimestamp?: number, limit?: number): Promise<IMessage[]>;
    retrieveBroadcastHistoryByBounds(sender: string | null, fromMessage?: IMessage, toMessage?: IMessage, limit?: number): Promise<IMessage[]>;
    retrieveAndVerifyMessageContent(msg: IMessage): Promise<IMessageContent | IMessageCorruptedContent | null>;
    processMessageContent(msgId: string, messagePartEvents: IEthereumMessage[]): IMessageContent | IMessageCorruptedContent | null;
    retrieveMessageContentByMsgId(msgId: string): Promise<IMessageContent | IMessageCorruptedContent | null>;
    formatPushMessage(message: IEthereumMessage): IMessage;
    formatBroadcastMessage(message: IEthereumMessage): IMessage;
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
export declare const evmBlockchainFactories: Record<EVMNetwork, BlockchainControllerFactory>;
