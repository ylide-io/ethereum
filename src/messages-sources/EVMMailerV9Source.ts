import { GenericMessagesSource } from '@ylide/sdk';
import type { EVMMailerV9Wrapper } from '../contract-wrappers/v9/EVMMailerV9Wrapper';
import type { EVMBlockchainController } from '../controllers/EVMBlockchainController';
import type { IEVMMailerContractLink, IHistorySource } from '../misc/types';

export class EVMMailerV9Source extends GenericMessagesSource {
	constructor(
		private readonly controller: EVMBlockchainController,
		private readonly mailer: IEVMMailerContractLink,
		private readonly wrapper: EVMMailerV9Wrapper,
		private readonly source: IHistorySource,
	) {
		super(
			'EVMMailerV9Source',
			controller.compareMessagesTime,
			source.type === 'recipient'
				? (fromMessage, toMessage, limit) =>
						wrapper.mailing.retrieveMailHistoryDesc(
							mailer,
							source.feedId,
							source.recipient,
							fromMessage,
							false,
							toMessage,
							false,
							limit,
						)
				: (fromMessage, toMessage, limit) =>
						wrapper.broadcast.retrieveBroadcastHistoryDesc(
							mailer,
							source.feedId,
							fromMessage,
							false,
							toMessage,
							false,
							limit,
						),
			20000,
			50,
		);
	}
}
