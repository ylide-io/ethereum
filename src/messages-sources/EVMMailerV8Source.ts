import { GenericMessagesSource } from '@ylide/sdk';
import type { EVMMailerV8Wrapper } from '../contract-wrappers/v8/EVMMailerV8Wrapper';
import type { EVMBlockchainController } from '../controllers/EVMBlockchainController';
import type { IEVMMailerContractLink, IHistorySource } from '../misc/types';

export class EVMMailerV8Source extends GenericMessagesSource {
	constructor(
		private readonly controller: EVMBlockchainController,
		private readonly mailer: IEVMMailerContractLink,
		private readonly wrapper: EVMMailerV8Wrapper,
		private readonly source: IHistorySource,
	) {
		super(
			'EVMMailerV8Source',
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
