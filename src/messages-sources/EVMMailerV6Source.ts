import { GenericMessagesSource } from '@ylide/sdk';
import type { EthereumMailerV6Wrapper } from '../contract-wrappers/EthereumMailerV6Wrapper';
import type { EthereumBlockchainController } from '../controllers/EthereumBlockchainController';
import type { IEVMMailerContractLink, IHistorySource } from '../misc/types';

export class EVMMailerV6Source extends GenericMessagesSource {
	constructor(
		private readonly controller: EthereumBlockchainController,
		private readonly mailer: IEVMMailerContractLink,
		private readonly wrapper: EthereumMailerV6Wrapper,
		private readonly source: IHistorySource,
	) {
		super(
			'EVMMailerV6Source',
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
