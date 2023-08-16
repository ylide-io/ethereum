import { GenericMessagesSource } from '@ylide/sdk';
import type { EVMMailerV6Wrapper } from '../contract-wrappers/EVMMailerV6Wrapper';
import type { EVMBlockchainController } from '../controllers/EVMBlockchainController';
import type { IEVMMailerContractLink, IHistorySource } from '../misc/types';

export class EVMMailerV6Source extends GenericMessagesSource {
	constructor(
		private readonly controller: EVMBlockchainController,
		private readonly mailer: IEVMMailerContractLink,
		private readonly wrapper: EVMMailerV6Wrapper,
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
