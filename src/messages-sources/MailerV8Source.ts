import { GenericMessagesSource } from '@ylide/sdk';
import { EthereumMailerV8Wrapper } from '../contract-wrappers/EthereumMailerV8Wrapper';
import { EthereumBlockchainController } from '../controllers';
import { IEVMMailerContractLink, IHistorySource } from '../misc';

export class MailerV8Source extends GenericMessagesSource {
	constructor(
		private readonly controller: EthereumBlockchainController,
		private readonly mailer: IEVMMailerContractLink,
		private readonly wrapper: EthereumMailerV8Wrapper,
		private readonly source: IHistorySource,
	) {
		super(
			'MailerV8Source',
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
				: (fromMessage, toMessage, limit) =>
						wrapper.retrieveBroadcastHistoryDesc(
							mailer,
							source.sender,
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
