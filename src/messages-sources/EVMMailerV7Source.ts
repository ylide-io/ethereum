import { GenericMessagesSource } from '@ylide/sdk';
import { EthereumMailerV7Wrapper } from '../contract-wrappers/EthereumMailerV7Wrapper';
import { EthereumBlockchainController } from '../controllers';
import { IEVMMailerContractLink, IHistorySource } from '../misc';

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
