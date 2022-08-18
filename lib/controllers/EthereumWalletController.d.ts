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
    constructor(options?: {
        dev?: boolean;
        mailerContractAddress?: string;
        registryContractAddress?: string;
        writeWeb3Provider?: any;
        endpoint?: string;
        onNetworkSwitchRequest?: NetworkSwitchHandler;
    });
    requestYlidePrivateKey(me: IGenericAccount): Promise<Uint8Array | null>;
    signMagicString(magicString: string): Promise<Uint8Array>;
    addressToUint256(address: string): Uint256;
    getAuthenticatedAccount(): Promise<IGenericAccount | null>;
    private getCurrentChainId;
    private getCurrentNetwork;
    private ensureNetworkOptions;
    attachPublicKey(publicKey: Uint8Array, options?: any): Promise<void>;
    requestAuthentication(): Promise<null | IGenericAccount>;
    disconnectAccount(): Promise<void>;
    publishMessage(me: IGenericAccount, contentData: Uint8Array, recipients: {
        address: Uint256;
        messageKey: MessageKey;
    }[], options?: any): Promise<Uint256 | null>;
    broadcastMessage(me: IGenericAccount, contentData: Uint8Array, options?: any): Promise<Uint256 | null>;
    decryptMessageKey(senderPublicKey: PublicKey, recipientAccount: IGenericAccount, encryptedKey: Uint8Array): Promise<Uint8Array>;
}
export declare const ethereumWalletFactory: WalletControllerFactory;
