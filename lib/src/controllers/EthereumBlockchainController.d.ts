import { AbstractBlockchainController, AbstractNameService, ExternalYlidePublicKey, IExtraEncryptionStrateryBulk, IExtraEncryptionStrateryEntry, IMessage, IMessageContent, IMessageCorruptedContent, MessageKey, Uint256 } from '@ylide/sdk';
import { EVMNetwork } from '../misc';
import { EthereumBlockchainReader, IRPCDescriptor } from './blockchain-helpers/EthereumBlockchainReader';
import { EthereumContentReader } from './blockchain-helpers/EthereumContentReader';
import { EthereumHistoryReader } from './blockchain-helpers/EthereumHistoryReader';
import { EthereumMailerV8Reader } from './blockchain-helpers/EthereumMailerV8Reader';
import { EthereumRegistryV5Reader } from './blockchain-helpers/EthereumRegistryV5Reader';
export interface IEthereumContractDescriptor {
    address: string;
    creationBlock: number;
}
export declare class EthereumBlockchainController extends AbstractBlockchainController {
    private readonly options;
    readonly blockchainReader: EthereumBlockchainReader;
    readonly historyReader: EthereumHistoryReader;
    readonly contentReader: EthereumContentReader;
    readonly mailerV8Reader: EthereumMailerV8Reader;
    readonly registryV5Reader: EthereumRegistryV5Reader;
    readonly network: EVMNetwork;
    readonly chainId: number;
    readonly mailerV8: IEthereumContractDescriptor;
    readonly registryV5: IEthereumContractDescriptor;
    constructor(options?: {
        network?: EVMNetwork;
        mailerContractAddress?: string;
        registryContractAddress?: string;
        nameServiceAddress?: string;
        web3Readers?: IRPCDescriptor[];
    });
    blockchain(): string;
    blockchainGroup(): string;
    init(): Promise<void>;
    defaultNameService(): AbstractNameService | null;
    isReadingBySenderAvailable(): boolean;
    isAddressValid(address: string): boolean;
    addressToUint256(address: string): Uint256;
    getRecipientReadingRules(address: Uint256): Promise<any>;
    retrieveMessageHistoryDesc(sender: string | null, recipient: Uint256 | null, fromMessage?: IMessage | undefined, toMessage?: IMessage | undefined, limit?: number | undefined): Promise<IMessage[]>;
    retrieveBroadcastHistoryDesc(sender: string | null, fromMessage?: IMessage | undefined, toMessage?: IMessage | undefined, limit?: number | undefined): Promise<IMessage[]>;
    retrieveMessageContentByMessageHeader(msg: IMessage): Promise<IMessageContent | IMessageCorruptedContent | null>;
    extractPublicKeyFromAddress(address: string): Promise<ExternalYlidePublicKey | null>;
    getBalance(address: string): Promise<{
        original: string;
        number: number;
        e18: string;
    }>;
    getExtraEncryptionStrategiesFromAddress(address: string): Promise<IExtraEncryptionStrateryEntry[]>;
    getSupportedExtraEncryptionStrategies(): string[];
    prepareExtraEncryptionStrategyBulk(entries: IExtraEncryptionStrateryEntry[]): Promise<IExtraEncryptionStrateryBulk>;
    executeExtraEncryptionStrategy(entries: IExtraEncryptionStrateryEntry[], bulk: IExtraEncryptionStrateryBulk, addedPublicKeyIndex: number | null, messageKey: Uint8Array): Promise<MessageKey[]>;
    compareMessagesTime(a: IMessage, b: IMessage): number;
}
