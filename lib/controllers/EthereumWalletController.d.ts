import { SwitchAccountCallback } from '@ylide/sdk';
import { IGenericAccount, AbstractWalletController, PublicKey, MessageKey, WalletControllerFactory, Uint256 } from '@ylide/sdk';
import Web3 from 'web3';
import { MailerContract, RegistryContract } from '../contracts';
import { EVMNetwork } from '../misc';
export declare type NetworkSwitchHandler = (reason: string, currentNetwork: EVMNetwork | undefined, needNetwork: EVMNetwork, needChainId: number) => Promise<void>;
export declare class EthereumWalletController extends AbstractWalletController {
    readonly writeWeb3: Web3;
    readonly defaultMailerContract?: MailerContract;
    readonly defaultRegistryContract?: RegistryContract;
    private readonly mailerContractAddress?;
    private readonly registryContractAddress?;
    private readonly onNetworkSwitchRequest;
    private lastCurrentAccount;
    constructor(options?: {
        dev?: boolean;
        mailerContractAddress?: string;
        registryContractAddress?: string;
        writeWeb3Provider?: any;
        endpoint?: string;
        onNetworkSwitchRequest?: NetworkSwitchHandler;
        onSwitchAccountRequest?: SwitchAccountCallback;
    });
    init(): Promise<void>;
    deployMailer(): Promise<void>;
    deployRegistry(): Promise<void>;
    private ensureAccount;
    requestYlidePrivateKey(me: IGenericAccount): Promise<Uint8Array | null>;
    signMagicString(account: IGenericAccount, magicString: string): Promise<Uint8Array>;
    addressToUint256(address: string): Uint256;
    getAuthenticatedAccount(): Promise<IGenericAccount | null>;
    private getCurrentChainId;
    private getCurrentNetwork;
    getCurrentBlockchain(): Promise<string>;
    private ensureNetworkOptions;
    attachPublicKey(me: IGenericAccount, publicKey: Uint8Array, options?: any): Promise<void>;
    requestAuthentication(): Promise<null | IGenericAccount>;
    isMultipleAccountsSupported(): boolean;
    disconnectAccount(account: IGenericAccount): Promise<void>;
    publishMessage(me: IGenericAccount, contentData: Uint8Array, recipients: {
        address: Uint256;
        messageKey: MessageKey;
    }[], options?: any): Promise<Uint256 | null>;
    broadcastMessage(me: IGenericAccount, contentData: Uint8Array, options?: any): Promise<Uint256 | null>;
    decryptMessageKey(recipientAccount: IGenericAccount, senderPublicKey: PublicKey, encryptedKey: Uint8Array): Promise<Uint8Array>;
}
export declare const ethereumWalletFactory: WalletControllerFactory;
