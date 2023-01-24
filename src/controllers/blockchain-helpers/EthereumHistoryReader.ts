import { MailPushEvent } from '@ylide/ethereum-contracts/lib/YlideMailerV8';
import { IMessage, Uint256 } from '@ylide/sdk';
import { BigNumber } from 'ethers';
import { IEthereumMessage } from '../../misc';
import { IEthereumContractDescriptor } from '../EthereumBlockchainController';
import { BlockNumberRingBufferIndex } from '../misc/BlockNumberRingBufferIndex';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';
import { EthereumMailerV8Reader } from './EthereumMailerV8Reader';
import { EthereumRegistryV5Wrapper } from './EthereumRegistryV5Wrapper';

export type IHistorySource = { type: 'recipient'; recipient: Uint256 } | { type: 'broadcast'; sender: string };

export type IEthereumPushMessage = IEthereumMessage<MailPushEvent>;

export class EthereumHistoryReader {
	constructor(
		public readonly blockchainReader: EthereumBlockchainReader,
		public readonly mailerReader: EthereumMailerV8Reader,
		public readonly registryReader: EthereumRegistryV5Wrapper,
	) {
		//
	}

	async advancedRetrieveMessageHistoryByBounds(
		source: IHistorySource,
		fromMessage?: IMessage,
		fromMessageIncluding = false,
		toMessage?: IMessage,
		toMessageIncluding = false,
		limit?: number,
	) {
		//
	}

	async retrieveMessageHistoryDesc(
		mailer: IEthereumContractDescriptor,
		sender: string | null,
		recipient: Uint256 | null,
		fromMessage?: IMessage<IEthereumPushMessage> | undefined,
		toMessage?: IMessage<IEthereumPushMessage> | undefined,
		limit?: number | undefined,
	): Promise<IMessage<IEthereumPushMessage>[]> {
		throw new Error('Method not implemented.');
		// if (recipient) {
		// 	let index: number[] = [];
		// 	if (fromMessage && fromMessage.recipientAddress === recipient) {
		// 		index = BlockNumberRingBufferIndex.decodeIndexValue(
		// 			fromMessage.$$blockchainMetaDontUseThisField.event.args.mailList
		// 				.toHexString()
		// 				.replace('0x', '')
		// 				.padStart(64, '0') as Uint256,
		// 		).map(i => i * 128);
		// 	} else {
		// 		index = (await this.mailerReader.getRecipientToPushIndex(mailer, recipient)).map(i => i * 128);
		// 	}
		// 	if (!index.length) {
		// 		return [];
		// 	}
		// 	const messages: IMessage<IEthereumPushMessage>[] = [];
		// 	let weFoundFrom = fromMessage ? false : true;
		// 	let fromIndex = 0;
		// 	let globalIndex: number[] = [];
		// 	while (true) {
		// 		if (!weFoundFrom) {
		// 			const indexCopy = [...index];
		// 			while (indexCopy.length && indexCopy[0] + 128 < fromMessage!.$$blockchainMetaDontUseThisField.event.blockNumber) {
		// 				indexCopy.shift();
		// 			}
		// 			if (indexCopy.length) {
		// 				weFoundFrom = true;
		// 				fromIndex = indexCopy[0];
		// 				globalIndex = [...indexCopy];
		// 				continue;
		// 			} else {
		// 				const lastIndex = index[index.length - 1];
		// 				const readMessages = await this.mailerReader.getMessagePushEvents(mailer, recipient, null, lastIndex - 128, lastIndex);

		// 			}
		// 		} else {

		// 		}
		// 	}
		// }
	}

	async retrieveBroadcastHistoryDesc(
		mailer: IEthereumContractDescriptor,
		sender: string | null,
		fromMessage?: IMessage | undefined,
		toMessage?: IMessage | undefined,
		limit?: number | undefined,
	): Promise<IMessage[]> {
		throw new Error('Method not implemented.');
	}
}
