import {
	AbstractBlockchainController,
	AbstractNameService,
	ExternalYlidePublicKey,
	hexToUint256,
	IExtraEncryptionStrateryBulk,
	IExtraEncryptionStrateryEntry,
	IMessage,
	IMessageContent,
	IMessageCorruptedContent,
	MessageKey,
	Uint256,
} from '@ylide/sdk';
import { EVMNetwork, EVM_CHAINS, EVM_CONTRACTS, EVM_NAMES, EVM_RPCS } from '../misc';
import { EthereumBlockchainReader, IRPCDescriptor } from './blockchain-helpers/EthereumBlockchainReader';
import { EthereumContentReader } from './blockchain-helpers/EthereumContentReader';
import { EthereumHistoryReader } from './blockchain-helpers/EthereumHistoryReader';
import { EthereumMailerV8Reader } from './blockchain-helpers/EthereumMailerV8Reader';
import { EthereumRegistryV5Wrapper } from './blockchain-helpers/EthereumRegistryV5Wrapper';

export interface IEthereumContractDescriptor {
	address: string;
	creationBlock: number;
}

export class EthereumBlockchainController extends AbstractBlockchainController {
	readonly blockchainReader: EthereumBlockchainReader;
	readonly historyReader: EthereumHistoryReader;
	readonly contentReader: EthereumContentReader;
	readonly mailerV8Reader: EthereumMailerV8Reader;
	readonly registryV5Reader: EthereumRegistryV5Wrapper;

	readonly network: EVMNetwork;
	readonly chainId: number;

	readonly mailerV8: IEthereumContractDescriptor;
	readonly registryV5: IEthereumContractDescriptor;

	constructor(
		private readonly options: {
			network?: EVMNetwork;
			mailerContractAddress?: string;
			registryContractAddress?: string;
			nameServiceAddress?: string;
			web3Readers?: IRPCDescriptor[];
		} = {},
	) {
		super(options);

		if (options.network === undefined) {
			throw new Error('You must provide network for EVM controller');
		}

		this.network = options.network;
		this.chainId = EVM_CHAINS[options.network];

		this.blockchainReader = EthereumBlockchainReader.createEthereumBlockchainReader(
			options.web3Readers ||
				EVM_RPCS[options.network].map(rpc => ({
					rpcUrlOrProvider: rpc.rpc,
					blockLimit: rpc.blockLimit || 1000,
					latestNotSupported: rpc.lastestNotSupported,
					batchNotSupported: rpc.batchNotSupported,
				})),
		);

		this.mailerV8Reader = new EthereumMailerV8Reader(this.blockchainReader);
		this.registryV5Reader = new EthereumRegistryV5Wrapper(this.blockchainReader);

		this.mailerV8 = {
			address: options.mailerContractAddress || EVM_CONTRACTS[this.network].mailer.address,
			creationBlock: EVM_CONTRACTS[this.network].mailer.fromBlock || 0,
		};

		this.registryV5 = {
			address: options.registryContractAddress || EVM_CONTRACTS[this.network].registry.address,
			creationBlock: EVM_CONTRACTS[this.network].registry.fromBlock || 0,
		};

		this.historyReader = new EthereumHistoryReader(
			this.blockchainReader,
			this.mailerV8Reader,
			this.registryV5Reader,
		);

		this.contentReader = new EthereumContentReader(this.blockchainReader, this.mailerV8Reader);
	}

	blockchain(): string {
		return EVM_NAMES[this.network];
	}

	blockchainGroup(): string {
		return 'evm';
	}

	async init(): Promise<void> {
		// no-op
	}

	// private tryGetNameService(): EthereumNameService | null {
	// 	return EVM_ENS[this.network] ? new EthereumNameService(this, EVM_ENS[this.network]!) : null;
	// }

	defaultNameService(): AbstractNameService | null {
		throw new Error('Method not implemented.');
	}

	isReadingBySenderAvailable(): boolean {
		return false;
	}

	isAddressValid(address: string): boolean {
		return this.blockchainReader.isAddressValid(address);
	}

	addressToUint256(address: string): Uint256 {
		const lowerAddress = address.toLowerCase();
		const cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
		return hexToUint256(''.padStart(24, '0') + cleanHexAddress);
	}

	getRecipientReadingRules(address: Uint256): Promise<any> {
		throw new Error('Method not implemented.');
	}

	async retrieveMessageHistoryDesc(
		sender: string | null,
		recipient: Uint256 | null,
		fromMessage?: IMessage | undefined,
		toMessage?: IMessage | undefined,
		limit?: number | undefined,
	): Promise<IMessage[]> {
		return await this.historyReader.retrieveMessageHistoryDesc(
			this.mailerV8,
			sender,
			recipient,
			fromMessage,
			toMessage,
			limit,
		);
	}

	async retrieveBroadcastHistoryDesc(
		sender: string | null,
		fromMessage?: IMessage | undefined,
		toMessage?: IMessage | undefined,
		limit?: number | undefined,
	): Promise<IMessage[]> {
		return await this.historyReader.retrieveBroadcastHistoryDesc(
			this.mailerV8,
			sender,
			fromMessage,
			toMessage,
			limit,
		);
	}

	retrieveMessageContentByMessageHeader(msg: IMessage): Promise<IMessageContent | IMessageCorruptedContent | null> {
		return this.contentReader.retrieveAndVerifyMessageContent(this.mailerV8, msg);
	}

	extractPublicKeyFromAddress(address: string): Promise<ExternalYlidePublicKey | null> {
		return this.registryV5Reader.getPublicKeyByAddress(this.registryV5, address);
	}

	getBalance(address: string): Promise<{ original: string; number: number; e18: string }> {
		return this.blockchainReader.getBalance(address);
	}

	async getExtraEncryptionStrategiesFromAddress(address: string): Promise<IExtraEncryptionStrateryEntry[]> {
		return [];
	}

	getSupportedExtraEncryptionStrategies(): string[] {
		return [];
	}

	prepareExtraEncryptionStrategyBulk(
		entries: IExtraEncryptionStrateryEntry[],
	): Promise<IExtraEncryptionStrateryBulk> {
		throw new Error('No native strategies supported for Ethereum');
	}

	executeExtraEncryptionStrategy(
		entries: IExtraEncryptionStrateryEntry[],
		bulk: IExtraEncryptionStrateryBulk,
		addedPublicKeyIndex: number | null,
		messageKey: Uint8Array,
	): Promise<MessageKey[]> {
		throw new Error('No native strategies supported for Ethereum');
	}

	compareMessagesTime(a: IMessage, b: IMessage): number {
		if (a.createdAt === b.createdAt) {
			return (
				a.$$blockchainMetaDontUseThisField.event.logIndex - b.$$blockchainMetaDontUseThisField.event.logIndex
			);
		} else {
			return a.createdAt - b.createdAt;
		}
	}
}
