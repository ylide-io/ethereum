import {
	AbstractBlockchainController,
	AbstractNameService,
	BlockchainControllerFactory,
	BlockchainSourceType,
	ExternalYlidePublicKey,
	hexToUint256,
	IBlockchainSourceSubject,
	IExtraEncryptionStrateryBulk,
	IExtraEncryptionStrateryEntry,
	IMessage,
	IMessageContent,
	IMessageCorruptedContent,
	ISourceSubject,
	LowLevelMessagesSource,
	MessageKey,
	Uint256,
} from '@ylide/sdk';
import {
	EVMMailerContractType,
	EVMNetwork,
	EVMRegistryContractType,
	EVM_CHAINS,
	EVM_CONTRACTS,
	EVM_CONTRACT_TO_NETWORK,
	EVM_NAMES,
	EVM_RPCS,
	IEVMMailerContractLink,
	IEVMMessage,
	IEVMRegistryContractLink,
	decodeEvmMsgId,
} from '../misc';

import { EthereumBlockchainReader, IRPCDescriptor } from './helpers/EthereumBlockchainReader';
import { EthereumContentReader } from './helpers/EthereumContentReader';

import { EthereumRegistryV3Wrapper } from '../contract-wrappers/EthereumRegistryV3Wrapper';
import { EthereumRegistryV4Wrapper } from '../contract-wrappers/EthereumRegistryV4Wrapper';
import { EthereumRegistryV5Wrapper } from '../contract-wrappers/EthereumRegistryV5Wrapper';
import { EthereumRegistryV6Wrapper } from '../contract-wrappers/EthereumRegistryV6Wrapper';

import { EthereumMailerV6Wrapper } from '../contract-wrappers/EthereumMailerV6Wrapper';
import { EthereumMailerV7Wrapper } from '../contract-wrappers/EthereumMailerV7Wrapper';
import { EthereumMailerV8Wrapper } from '../contract-wrappers/EthereumMailerV8Wrapper';

import { EVMMailerV6Source } from '../messages-sources/EVMMailerV6Source';
import { EVMMailerV7Source } from '../messages-sources/EVMMailerV7Source';
import { EVMMailerV8Source } from '../messages-sources/EVMMailerV8Source';

export class EthereumBlockchainController extends AbstractBlockchainController {
	readonly blockchainReader: EthereumBlockchainReader;
	readonly contentReader: EthereumContentReader;

	readonly network: EVMNetwork;
	readonly chainId: number;

	static readonly mailerWrappers: Record<
		EVMMailerContractType,
		typeof EthereumMailerV8Wrapper | typeof EthereumMailerV7Wrapper | typeof EthereumMailerV6Wrapper
	> = {
		[EVMMailerContractType.EVMMailerV6]: EthereumMailerV6Wrapper,
		[EVMMailerContractType.EVMMailerV7]: EthereumMailerV7Wrapper,
		[EVMMailerContractType.EVMMailerV8]: EthereumMailerV8Wrapper,
	};

	static readonly registryWrappers: Record<
		EVMRegistryContractType,
		| typeof EthereumRegistryV3Wrapper
		| typeof EthereumRegistryV4Wrapper
		| typeof EthereumRegistryV5Wrapper
		| typeof EthereumRegistryV6Wrapper
	> = {
		[EVMRegistryContractType.EVMRegistryV3]: EthereumRegistryV3Wrapper,
		[EVMRegistryContractType.EVMRegistryV4]: EthereumRegistryV4Wrapper,
		[EVMRegistryContractType.EVMRegistryV5]: EthereumRegistryV5Wrapper,
		[EVMRegistryContractType.EVMRegistryV6]: EthereumRegistryV6Wrapper,
	};

	readonly mailers: {
		link: IEVMMailerContractLink;
		wrapper: EthereumMailerV8Wrapper | EthereumMailerV7Wrapper | EthereumMailerV6Wrapper;
	}[] = [];
	readonly registries: {
		link: IEVMRegistryContractLink;
		wrapper:
			| EthereumRegistryV3Wrapper
			| EthereumRegistryV4Wrapper
			| EthereumRegistryV5Wrapper
			| EthereumRegistryV6Wrapper;
	}[] = [];

	readonly currentMailer: {
		link: IEVMMailerContractLink;
		wrapper: EthereumMailerV8Wrapper;
	};
	readonly currentRegistry: { link: IEVMRegistryContractLink; wrapper: EthereumRegistryV5Wrapper };

	constructor(
		private readonly options: {
			network?: EVMNetwork;
			rpcs?: IRPCDescriptor[];
		} = {},
	) {
		super();

		if (options.network === undefined) {
			throw new Error('You must provide network for EVM controller');
		}

		this.network = options.network;
		this.chainId = EVM_CHAINS[options.network];

		this.blockchainReader = EthereumBlockchainReader.createEthereumBlockchainReader(
			options.rpcs ||
				EVM_RPCS[options.network].map(rpc => ({
					rpcUrlOrProvider: rpc.rpc,
					blockLimit: rpc.blockLimit || 1000,
					latestNotSupported: rpc.lastestNotSupported,
					batchNotSupported: rpc.batchNotSupported,
				})),
		);

		const contracts = EVM_CONTRACTS[this.network];

		this.mailers = contracts.mailerContracts.map(link => ({
			link,
			wrapper: new EthereumBlockchainController.mailerWrappers[link.type](this.blockchainReader),
		}));

		this.registries = contracts.registryContracts.map(link => ({
			link,
			wrapper: new EthereumBlockchainController.registryWrappers[link.type](this.blockchainReader),
		}));

		const currentMailerLink = contracts.mailerContracts.find(c => c.id === contracts.currentMailerId);
		if (!currentMailerLink) {
			throw new Error('Current mailer not found');
		}
		const currentRegistryLink = contracts.registryContracts.find(c => c.id === contracts.currentRegistryId);
		if (!currentRegistryLink) {
			throw new Error('Current registry not found');
		}

		this.currentMailer = {
			link: currentMailerLink,
			wrapper: new EthereumBlockchainController.mailerWrappers[currentMailerLink.type](
				this.blockchainReader,
			) as EthereumMailerV8Wrapper,
		};

		this.currentRegistry = {
			link: currentRegistryLink,
			wrapper: new EthereumBlockchainController.registryWrappers[currentRegistryLink.type](
				this.blockchainReader,
			) as EthereumRegistryV5Wrapper,
		};

		this.contentReader = new EthereumContentReader(this.blockchainReader);
	}

	blockchain(): string {
		return EVM_NAMES[this.network];
	}

	blockchainGroup(): string {
		return 'evm';
	}

	async init(): Promise<void> {
		await this.blockchainReader.init();
	}

	// private tryGetNameService(): EthereumNameService | null {
	// 	return EVM_ENS[this.network] ? new EthereumNameService(this, EVM_ENS[this.network]!) : null;
	// }

	defaultNameService(): AbstractNameService | null {
		// TODO
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

	isValidMsgId(msgId: string): boolean {
		try {
			const parsed = decodeEvmMsgId(msgId);
			const network = EVM_CONTRACT_TO_NETWORK[parsed.contractId];
			return network === this.network;
		} catch (err) {
			return false;
		}
	}

	async getMessageByMsgId(msgId: string): Promise<IEVMMessage | null> {
		const parsed = decodeEvmMsgId(msgId);
		const network = EVM_CONTRACT_TO_NETWORK[parsed.contractId];
		if (network !== this.network) {
			throw new Error(`Message ${msgId} is not from ${this.network} network`);
		}

		const contract = EVM_CONTRACTS[this.network].mailerContracts.find(c => c.id === parsed.contractId);
		if (!contract) {
			throw new Error(`Unknown contract ${parsed.contractId} for network ${this.network}`);
		}

		const mailer = this.mailers.find(m => m.link.id === parsed.contractId);

		if (!mailer) {
			throw new Error(`Unknown contract ${parsed.contractId} for network ${this.network}`);
		}

		if (parsed.isBroadcast) {
			return await mailer.wrapper.getBroadcastPushEvent(
				mailer.link,
				parsed.blockNumber,
				parsed.txIndex,
				parsed.logIndex,
			);
		} else {
			return await mailer.wrapper.getMailPushEvent(
				mailer.link,
				parsed.blockNumber,
				parsed.txIndex,
				parsed.logIndex,
			);
		}
	}

	async getRecipientReadingRules(address: Uint256): Promise<any> {
		throw new Error('Method not implemented.');
	}

	getBlockchainSourceSubjects(subject: ISourceSubject): IBlockchainSourceSubject[] {
		return this.mailers.map(m => ({
			...subject,
			blockchain: this.blockchain(),
			id: `evm-${this.blockchain()}-mailer-${String(m.link.id)}`,
		}));
	}

	ininiateMessagesSource(subject: IBlockchainSourceSubject): LowLevelMessagesSource {
		const mailer = this.mailers.find(m => `evm-${this.blockchain()}-mailer-${String(m.link.id)}` === subject.id);
		if (!mailer) {
			throw new Error('Unknown subject');
		}

		if (subject.type === BlockchainSourceType.DIRECT && subject.sender) {
			throw new Error('Sender is not supported for direct messages request in EVM');
		}

		if (mailer.wrapper instanceof EthereumMailerV8Wrapper) {
			return new EVMMailerV8Source(
				this,
				mailer.link,
				mailer.wrapper,
				subject.type === BlockchainSourceType.BROADCAST
					? {
							type: 'broadcast',
							sender: subject.sender,
					  }
					: {
							type: 'recipient',
							recipient: subject.recipient,
					  },
			);
		} else if (mailer.wrapper instanceof EthereumMailerV7Wrapper) {
			return new EVMMailerV7Source(
				this,
				mailer.link,
				mailer.wrapper,
				subject.type === BlockchainSourceType.BROADCAST
					? {
							type: 'broadcast',
							sender: subject.sender,
					  }
					: {
							type: 'recipient',
							recipient: subject.recipient,
					  },
			);
		} else {
			return new EVMMailerV6Source(
				this,
				mailer.link,
				mailer.wrapper,
				subject.type === BlockchainSourceType.BROADCAST
					? {
							type: 'broadcast',
							sender: subject.sender,
					  }
					: {
							type: 'recipient',
							recipient: subject.recipient,
					  },
			);
		}
	}

	async retrieveMessageContent(msg: IEVMMessage): Promise<IMessageContent | IMessageCorruptedContent | null> {
		const decodedMsgId = decodeEvmMsgId(msg.msgId);
		const mailer = this.mailers.find(m => m.link.id === decodedMsgId.contractId);
		if (!mailer) {
			throw new Error('This message does not belongs to this blockchain controller');
		}
		return mailer.wrapper.retrieveMessageContent(mailer.link, msg);
	}

	async extractPublicKeyFromAddress(address: string): Promise<ExternalYlidePublicKey | null> {
		return this.currentRegistry.wrapper.getPublicKeyByAddress(this.currentRegistry.link, address);
	}

	async extractPublicKeysHistoryByAddress(address: string): Promise<ExternalYlidePublicKey[]> {
		const raw = (
			await Promise.all(this.registries.map(reg => reg.wrapper.getPublicKeysHistoryForAddress(reg.link, address)))
		).flat();
		raw.sort((a, b) => b.timestamp - a.timestamp);
		return raw;
	}

	getBalance(address: string): Promise<{ original: string; numeric: number; e18: string }> {
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

	compareMessagesTime = (a: IMessage, b: IMessage): number => {
		if (a.createdAt === b.createdAt) {
			return a.$$meta.event.logIndex - b.$$meta.event.logIndex;
		} else {
			return a.createdAt - b.createdAt;
		}
	};
}

const getBlockchainFactory = (network: EVMNetwork): BlockchainControllerFactory => {
	return {
		create: async (options?: any) => new EthereumBlockchainController(Object.assign({ network }, options || {})),
		blockchain: EVM_NAMES[network],
		blockchainGroup: 'evm',
	};
};

export const evmBlockchainFactories: Record<EVMNetwork, BlockchainControllerFactory> = {
	[EVMNetwork.LOCAL_HARDHAT]: getBlockchainFactory(EVMNetwork.LOCAL_HARDHAT),

	[EVMNetwork.ETHEREUM]: getBlockchainFactory(EVMNetwork.ETHEREUM),
	[EVMNetwork.BNBCHAIN]: getBlockchainFactory(EVMNetwork.BNBCHAIN),
	[EVMNetwork.POLYGON]: getBlockchainFactory(EVMNetwork.POLYGON),
	[EVMNetwork.AVALANCHE]: getBlockchainFactory(EVMNetwork.AVALANCHE),
	[EVMNetwork.OPTIMISM]: getBlockchainFactory(EVMNetwork.OPTIMISM),
	[EVMNetwork.ARBITRUM]: getBlockchainFactory(EVMNetwork.ARBITRUM),
	[EVMNetwork.CRONOS]: getBlockchainFactory(EVMNetwork.CRONOS),
	[EVMNetwork.FANTOM]: getBlockchainFactory(EVMNetwork.FANTOM),
	[EVMNetwork.KLAYTN]: getBlockchainFactory(EVMNetwork.KLAYTN),
	[EVMNetwork.GNOSIS]: getBlockchainFactory(EVMNetwork.GNOSIS),
	[EVMNetwork.AURORA]: getBlockchainFactory(EVMNetwork.AURORA),
	[EVMNetwork.CELO]: getBlockchainFactory(EVMNetwork.CELO),
	[EVMNetwork.MOONBEAM]: getBlockchainFactory(EVMNetwork.MOONBEAM),
	[EVMNetwork.MOONRIVER]: getBlockchainFactory(EVMNetwork.MOONRIVER),
	[EVMNetwork.METIS]: getBlockchainFactory(EVMNetwork.METIS),
	[EVMNetwork.ASTAR]: getBlockchainFactory(EVMNetwork.ASTAR),
};
