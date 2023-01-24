import { MailContentEvent } from '@ylide/ethereum-contracts/lib/YlideMailerV8';
import { IMessage, IMessageContent, IMessageCorruptedContent, Uint256 } from '@ylide/sdk';
import { IEthereumMessage } from '../../misc';
import { IEthereumContractDescriptor } from '../EthereumBlockchainController';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';
import { EthereumMailerV8Reader } from './EthereumMailerV8Reader';
export declare type IHistorySource = {
    type: 'recipient';
    recipient: Uint256;
} | {
    type: 'broadcast';
    sender: string;
};
export declare class EthereumContentReader {
    readonly blockchainReader: EthereumBlockchainReader;
    readonly mailerReader: EthereumMailerV8Reader;
    constructor(blockchainReader: EthereumBlockchainReader, mailerReader: EthereumMailerV8Reader);
    enoughEvents(events: MailContentEvent[]): boolean;
    retrieveMessageContentByMessageHeader(mailer: IEthereumContractDescriptor, msg: IMessage): Promise<IMessageContent | IMessageCorruptedContent | null>;
    processMessageContent(msgId: string, messagePartEvents: IEthereumMessage<MailContentEvent>[]): IMessageContent | IMessageCorruptedContent | null;
    retrieveAndVerifyMessageContent(mailer: IEthereumContractDescriptor, msg: IMessage): Promise<IMessageContent | IMessageCorruptedContent | null>;
}
