import { GenericMessagesSource } from '@ylide/sdk';
import { EthereumMailerV8Wrapper } from '../contract-wrappers/EthereumMailerV8Wrapper';
import { EthereumBlockchainController } from '../controllers';
import { IEVMMailerContractLink, IHistorySource } from '../misc';

export class EVMMailerV8Source extends GenericMessagesSource {
	constructor(
		private readonly controller: EthereumBlockchainController,
		private readonly mailer: IEVMMailerContractLink,
		private readonly wrapper: EthereumMailerV8Wrapper,
		private readonly source: IHistorySource,
	) {
		super(
			'EVMMailerV8Source',
			controller.compareMessagesTime,
			source.type === 'recipient'
				? (fromMessage, toMessage, limit) =>
						wrapper.retrieveMailHistoryDesc(
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
						wrapper.retrieveBroadcastHistoryDesc(
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
