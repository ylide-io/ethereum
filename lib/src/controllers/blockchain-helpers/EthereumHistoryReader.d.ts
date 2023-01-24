import { MailPushEvent } from '@ylide/ethereum-contracts/lib/YlideMailerV8';
import { IMessage, Uint256 } from '@ylide/sdk';
import { IEthereumMessage } from '../../misc';
import { IEthereumContractDescriptor } from '../EthereumBlockchainController';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';
import { EthereumMailerV8Reader } from './EthereumMailerV8Reader';
import { EthereumRegistryV5Reader } from './EthereumRegistryV5Reader';
export declare type IHistorySource = {
    type: 'recipient';
    recipient: Uint256;
} | {
    type: 'broadcast';
    sender: string;
};
export declare type IEthereumPushMessage = IEthereumMessage<MailPushEvent>;
export declare class EthereumHistoryReader {
    readonly blockchainReader: EthereumBlockchainReader;
    readonly mailerReader: EthereumMailerV8Reader;
    readonly registryReader: EthereumRegistryV5Reader;
    constructor(blockchainReader: EthereumBlockchainReader, mailerReader: EthereumMailerV8Reader, registryReader: EthereumRegistryV5Reader);
    advancedRetrieveMessageHistoryByBounds(source: IHistorySource, fromMessage?: IMessage, fromMessageIncluding?: boolean, toMessage?: IMessage, toMessageIncluding?: boolean, limit?: number): Promise<void>;
    retrieveMessageHistoryDesc(mailer: IEthereumContractDescriptor, sender: string | null, recipient: Uint256 | null, fromMessage?: IMessage<IEthereumPushMessage> | undefined, toMessage?: IMessage<IEthereumPushMessage> | undefined, limit?: number | undefined): Promise<IMessage<IEthereumPushMessage>[]>;
    retrieveBroadcastHistoryDesc(mailer: IEthereumContractDescriptor, sender: string | null, fromMessage?: IMessage | undefined, toMessage?: IMessage | undefined, limit?: number | undefined): Promise<IMessage[]>;
}
