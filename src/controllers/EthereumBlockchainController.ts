export class EthereumBlockchainController extends AbstractBlockchainController {
	readonly blockchainReader: EthereumBlockchainReader;
	readonly historyReader: EthereumHistoryReader;
	readonly mailerV8Reader: EthereumMailerV8Reader;

	constructor(
		public readonly blockchainReader: EthereumBlockchainReader,
		public readonly blockchainWriter: EthereumBlockchainWriter,
	) {
		super();
	}
}
