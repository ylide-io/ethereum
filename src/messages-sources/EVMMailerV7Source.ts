import { GenericMessagesSource } from '@ylide/sdk';
import type { EVMMailerV7Wrapper } from '../contract-wrappers/EVMMailerV7Wrapper';
import type { EVMBlockchainController } from '../controllers/EVMBlockchainController';
import type { IEVMMailerContractLink, IHistorySource } from '../misc/types';

export class EVMMailerV7Source extends GenericMessagesSource {
	constructor(
		private readonly controller: EVMBlockchainController,
		private readonly mailer: IEVMMailerContractLink,
		private readonly wrapper: EVMMailerV7Wrapper,
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
