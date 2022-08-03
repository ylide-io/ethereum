import { AbstractBlockchainController, IMessage, RetrievingMessagesOptions, IMessageContent, IMessageCorruptedContent, IExtraEncryptionStrateryBulk, IExtraEncryptionStrateryEntry, MessageKey, PublicKey, BlockchainControllerFactory, Uint256 } from '@ylide/sdk';
import { MailerContract, RegistryContract } from '../contracts';
import Web3 from 'web3';
export declare class EthereumBlockchainController extends AbstractBlockchainController {
    web3: Web3;
    readonly MESSAGES_FETCH_LIMIT = 50;
    readonly mailerContract: MailerContract;
    readonly registryContract: RegistryContract;
    constructor(options?: {
        dev?: boolean;
        mailerContractAddress?: string;
        registryContractAddress?: string;
        web3Provider?: any;
    });
    getRecipientReadingRules(address: string): Promise<any>;
    extractAddressFromPublicKey(publicKey: PublicKey): Promise<string | null>;
    extractPublicKeyFromAddress(address: string): Promise<PublicKey | null>;
    retrieveMessageHistoryByDates(recipientAddress: Uint256, options?: RetrievingMessagesOptions): Promise<IMessage[]>;
    retrieveAndVerifyMessageContent(msg: IMessage): Promise<IMessageContent | IMessageCorruptedContent | null>;
    retrieveMessageContentByMsgId(msgId: string): Promise<IMessageContent | IMessageCorruptedContent | null>;
    private formatPushMessage;
    isAddressValid(address: string): boolean;
    private processMessages;
    private queryMessagesList;
    getExtraEncryptionStrategiesFromAddress(address: string): Promise<IExtraEncryptionStrateryEntry[]>;
    getSupportedExtraEncryptionStrategies(): string[];
    prepareExtraEncryptionStrategyBulk(entries: IExtraEncryptionStrateryEntry[]): Promise<IExtraEncryptionStrateryBulk>;
    executeExtraEncryptionStrategy(entries: IExtraEncryptionStrateryEntry[], bulk: IExtraEncryptionStrateryBulk, addedPublicKeyIndex: number | null, messageKey: Uint8Array): Promise<MessageKey[]>;
    uint256ToAddress(value: Uint8Array, withPrefix?: boolean): string;
    addressToUint256(address: string): Uint256;
}
export declare const ethereumBlockchainFactory: BlockchainControllerFactory;
