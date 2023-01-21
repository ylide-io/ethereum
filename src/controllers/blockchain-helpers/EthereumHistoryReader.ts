import { IMessage, Uint256 } from '@ylide/sdk';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';
import { EthereumMailerV8Reader } from './EthereumMailerV8Reader';
import { EthereumRegistryV5Reader } from './EthereumRegistryV5Reader';

export type IHistorySource = { type: 'recipient'; recipient: Uint256 } | { type: 'broadcast'; sender: string };

export class EthereumHistoryReader {
	constructor(
		public readonly blockchainReader: EthereumBlockchainReader,
		public readonly mailerReader: EthereumMailerV8Reader,
		public readonly registryReader: EthereumRegistryV5Reader,
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
}
