import { GenericMessagesSource } from '@ylide/sdk';
import type { EthereumMailerV7Wrapper } from '../contract-wrappers/EthereumMailerV7Wrapper';
import type { EthereumBlockchainController } from '../controllers/EthereumBlockchainController';
import type { IEVMMailerContractLink, IHistorySource } from '../misc/types';

export class EVMMailerV7Source extends GenericMessagesSource {
	constructor(
		private readonly controller: EthereumBlockchainController,
		private readonly mailer: IEVMMailerContractLink,
		private readonly wrapper: EthereumMailerV7Wrapper,
		private readonly source: IHistorySource,
	) {
		super(
			'EVMMailerV7Source',
			controller.compareMessagesTime,
			source.type === 'recipient'
				? (fromMessage, toMessage, limit) =>
						wrapper.retrieveMailHistoryDesc(
							mailer,
							source.recipient,
							fromMessage,
							false,
							toMessage,
							false,
							limit,
						)
				: (fromMessage, toMessage, limit) => Promise.resolve([]),
			20000,
			50,
		);
	}
}
