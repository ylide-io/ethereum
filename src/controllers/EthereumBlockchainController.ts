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
	YlideCore,
} from '@ylide/sdk';
import { EVM_CHAINS, EVM_CONTRACT_TO_NETWORK, EVM_ENS, EVM_NAMES, EVM_RPCS } from '../misc/constants';
import { decodeEvmMsgId } from '../misc/evmMsgId';
import {
	ContractType,
	EVMContracts,
	EVMMailerContractType,
	EVMNetwork,
	EVMRegistryContractType,
	EVMYlidePayContractType,
	EVMYlideSafeContractType,
	IEVMMailerContractLink,
	IEVMMessage,
	IEVMRegistryContractLink,
	IEVMYlidePayContractLink,
	IEVMYlideSafeContractLink,
	Supplement,
} from '../misc/types';

import { EthereumBlockchainReader, IRPCDescriptor } from './helpers/EthereumBlockchainReader';
import { EthereumContentReader } from './helpers/EthereumContentReader';

import { EthereumRegistryV3Wrapper } from '../contract-wrappers/EthereumRegistryV3Wrapper';
import { EthereumRegistryV4Wrapper } from '../contract-wrappers/EthereumRegistryV4Wrapper';
import { EthereumRegistryV5Wrapper } from '../contract-wrappers/EthereumRegistryV5Wrapper';
import { EthereumRegistryV6Wrapper } from '../contract-wrappers/EthereumRegistryV6Wrapper';

import { EthereumMailerV6Wrapper } from '../contract-wrappers/EthereumMailerV6Wrapper';
import { EthereumMailerV7Wrapper } from '../contract-wrappers/EthereumMailerV7Wrapper';
import { EthereumMailerV8Wrapper } from '../contract-wrappers/v8/EthereumMailerV8Wrapper';

import { ethers } from 'ethers';
import { EthereumPayV1Wrapper } from '../contract-wrappers/EthereumPayV1Wrapper';
import { EthereumSafeV1Wrapper } from '../contract-wrappers/EthereumSafeV1Wrapper.ts';
import { EthereumMailerV9Wrapper } from '../contract-wrappers/v9';
import { EVMMailerV6Source } from '../messages-sources/EVMMailerV6Source';
import { EVMMailerV7Source } from '../messages-sources/EVMMailerV7Source';
import { EVMMailerV8Source } from '../messages-sources/EVMMailerV8Source';
import { EVMMailerV9Source } from '../messages-sources/EVMMailerV9Source';
import { EVM_CONTRACTS } from '../misc/contractConstants';
import { EthereumNameService } from './EthereumNameService';

export class EthereumBlockchainController extends AbstractBlockchainController {
	readonly blockchainReader: EthereumBlockchainReader;
	readonly contentReader: EthereumContentReader;

	readonly network: EVMNetwork;
	readonly chainId: number;

	static readonly mailerWrappers: Record<
		EVMMailerContractType,
		| typeof EthereumMailerV8Wrapper
		| typeof EthereumMailerV7Wrapper
		| typeof EthereumMailerV6Wrapper
		| typeof EthereumMailerV9Wrapper
	> = {
		[EVMMailerContractType.EVMMailerV6]: EthereumMailerV6Wrapper,
		[EVMMailerContractType.EVMMailerV7]: EthereumMailerV7Wrapper,
		[EVMMailerContractType.EVMMailerV8]: EthereumMailerV8Wrapper,
		[EVMMailerContractType.EVMMailerV9]: EthereumMailerV9Wrapper,
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

	static readonly payWrappers: Record<EVMYlidePayContractType, typeof EthereumPayV1Wrapper> = {
		[EVMYlidePayContractType.EVMYlidePayV1]: EthereumPayV1Wrapper,
	};

	static readonly safeWrappers: Record<EVMYlideSafeContractType, typeof EthereumSafeV1Wrapper> = {
		[EVMYlideSafeContractType.EVMYlideSafeV1]: EthereumSafeV1Wrapper,
	};

	readonly mailers: {
		link: IEVMMailerContractLink;
		wrapper: EthereumMailerV8Wrapper | EthereumMailerV7Wrapper | EthereumMailerV6Wrapper | EthereumMailerV9Wrapper;
	}[] = [];
	readonly registries: {
		link: IEVMRegistryContractLink;
		wrapper:
			| EthereumRegistryV3Wrapper
			| EthereumRegistryV4Wrapper
			| EthereumRegistryV5Wrapper
			| EthereumRegistryV6Wrapper;
	}[] = [];
	readonly payers: {
		link: IEVMYlidePayContractLink;
		wrapper: EthereumPayV1Wrapper;
	}[] = [];
	readonly safes: {
		link: IEVMYlideSafeContractLink;
		wrapper: EthereumSafeV1Wrapper;
	}[] = [];

	readonly currentMailer: {
		link: IEVMMailerContractLink;
		wrapper: EthereumMailerV9Wrapper;
	};
	readonly currentRegistry: { link: IEVMRegistryContractLink; wrapper: EthereumRegistryV5Wrapper };

	private readonly evmContractsTest: EVMContracts | null;

	constructor(
		private readonly options: {
			network?: EVMNetwork;
			rpcs?: IRPCDescriptor[];
			evmContractsTest?: EVMContracts;
		} = {},
	) {
		super();

		if (options.network === undefined) {
			throw new Error('You must provide network for EVM controller');
		}

		this.network = options.network;
		this.chainId = EVM_CHAINS[options.network];

		this.evmContractsTest = options.evmContractsTest || null;

		this.blockchainReader = EthereumBlockchainReader.createEthereumBlockchainReader(
			options.rpcs ||
				EVM_RPCS[options.network].map(rpc => ({
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					chainId: EVM_CHAINS[options.network!],
					rpcUrlOrProvider: rpc.rpc,
					blockLimit: rpc.blockLimit || 1000,
					latestNotSupported: rpc.lastestNotSupported,
					batchNotSupported: rpc.batchNotSupported,
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					ensAddress: EVM_ENS[options.network!],
				})),
		);

		const contracts = this.evmContracts()[this.network];

		this.mailers = contracts.mailerContracts.map(link => ({
			link,
			wrapper: new EthereumBlockchainController.mailerWrappers[link.type](this.blockchainReader),
		}));

		this.registries = contracts.registryContracts.map(link => ({
			link,
			wrapper: new EthereumBlockchainController.registryWrappers[link.type](this.blockchainReader),
		}));

		this.payers = contracts.payContracts.map(link => ({
			link,
			wrapper: new EthereumBlockchainController.payWrappers[link.type](this.blockchainReader),
		}));

		this.safes = contracts.safeContracts.map(link => ({
			link,
			wrapper: new EthereumBlockchainController.safeWrappers[link.type](this.blockchainReader),
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
			) as EthereumMailerV9Wrapper,
		};

		this.currentRegistry = {
			link: currentRegistryLink,
			wrapper: new EthereumBlockchainController.registryWrappers[currentRegistryLink.type](
				this.blockchainReader,
			) as EthereumRegistryV5Wrapper,
		};

		this.contentReader = new EthereumContentReader(this.blockchainReader);
	}

	private evmContracts() {
		return this.evmContractsTest || EVM_CONTRACTS;
	}

	blockchain(): string {
		return EVM_NAMES[this.network];
	}

	blockchainGroup(): string {
		return 'evm';
	}

	async init(): Promise<void> {
		console.log('Deprecated');
	}

	private tryGetNameService(): EthereumNameService | null {
		const ens = EVM_ENS[this.network];
		return ens ? new EthereumNameService(this, ens) : null;
	}

	defaultNameService(): AbstractNameService | null {
		return this.tryGetNameService();
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

		const contract = this.evmContracts()[this.network].mailerContracts.find(c => c.id === parsed.contractId);
		if (!contract) {
			throw new Error(`Unknown contract ${parsed.contractId} for network ${this.network}`);
		}

		const mailer = this.mailers.find(m => m.link.id === parsed.contractId);

		if (!mailer) {
			throw new Error(`Unknown contract ${parsed.contractId} for network ${this.network}`);
		}

		if (parsed.isBroadcast) {
			if (!(mailer.wrapper instanceof EthereumMailerV8Wrapper)) {
				throw new Error('Broadcasts are only supported by mailer V8 and higher');
			}
			return await mailer.wrapper.broadcast.getBroadcastPushEvent(
				mailer.link,
				parsed.blockNumber,
				parsed.txIndex,
				parsed.logIndex,
			);
		} else {
			if (
				!(mailer.wrapper instanceof EthereumMailerV8Wrapper) &&
				!(mailer.wrapper instanceof EthereumMailerV9Wrapper)
			) {
				return await mailer.wrapper.getMailPushEvent(
					mailer.link,
					parsed.blockNumber,
					parsed.txIndex,
					parsed.logIndex,
				);
			} else {
				return await mailer.wrapper.mailing.getMailPushEvent(
					mailer.link,
					parsed.blockNumber,
					parsed.txIndex,
					parsed.logIndex,
				);
			}
		}
	}

	async getRecipientReadingRules(address: Uint256): Promise<any> {
		throw new Error('Method not implemented.');
	}

	getBlockchainSourceSubjects(subject: ISourceSubject): IBlockchainSourceSubject[] {
		return this.mailers
			.filter(m => {
				// only V8+ mailers support broadcasts
				return (
					subject.type === BlockchainSourceType.DIRECT || m.link.type === EVMMailerContractType.EVMMailerV8
				);
			})
			.map(m => ({
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

		if (mailer.wrapper instanceof EthereumMailerV9Wrapper) {
			return new EVMMailerV9Source(
				this,
				mailer.link,
				mailer.wrapper,
				subject.type === BlockchainSourceType.BROADCAST
					? {
							type: 'broadcast',
							feedId: subject.feedId,
					  }
					: {
							type: 'recipient',
							feedId: subject.feedId,
							recipient: subject.recipient,
					  },
			);
		} else if (mailer.wrapper instanceof EthereumMailerV8Wrapper) {
			return new EVMMailerV8Source(
				this,
				mailer.link,
				mailer.wrapper,
				subject.type === BlockchainSourceType.BROADCAST
					? {
							type: 'broadcast',
							feedId: subject.feedId,
					  }
					: {
							type: 'recipient',
							feedId: subject.feedId,
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
							feedId: subject.feedId,
					  }
					: {
							type: 'recipient',
							feedId: subject.feedId,
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
							feedId: subject.feedId,
					  }
					: {
							type: 'recipient',
							feedId: subject.feedId,
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
		if (mailer.wrapper instanceof EthereumMailerV8Wrapper || mailer.wrapper instanceof EthereumMailerV9Wrapper) {
			return await mailer.wrapper.content.retrieveMessageContent(mailer.link, msg);
		} else {
			return mailer.wrapper.retrieveMessageContent(mailer.link, msg);
		}
	}

	async extractPublicKeyFromAddress(address: string): Promise<ExternalYlidePublicKey | null> {
		const raw = await Promise.all(this.registries.map(reg => reg.wrapper.getPublicKeyByAddress(reg.link, address)));
		const active = raw.filter(r => r !== null) as ExternalYlidePublicKey[];
		active.sort((a, b) => b.timestamp - a.timestamp);
		return active.length ? active[0] : null;
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

	async getMessageRecipients(
		msg: IEVMMessage,
		filterOutSent = true,
	): Promise<{
		contentId: Uint256;
		sender: string;
		recipients: Uint256[];
	} | null> {
		const decodedMsgId = decodeEvmMsgId(msg.msgId);
		const mailer = this.mailers.find(m => m.link.id === decodedMsgId.contractId);
		if (!mailer) {
			throw new Error('This message does not belongs to this blockchain controller');
		}
		if (mailer.wrapper instanceof EthereumMailerV8Wrapper || mailer.wrapper instanceof EthereumMailerV9Wrapper) {
			const result = await mailer.wrapper.mailing.getMessageRecipients(mailer.link, msg);
			if (filterOutSent) {
				const sender = YlideCore.getSentAddress(this.addressToUint256(result.sender));
				return {
					...result,
					recipients: result.recipients.filter(r => r !== sender),
				};
			}
			return result;
		}
		return null;
	}

	async getSupplement(msg: IEVMMessage): Promise<Supplement | null> {
		const decodedMsgId = decodeEvmMsgId(msg.msgId);
		const mailer = this.mailers.find(m => m.link.id === decodedMsgId.contractId);
		if (!mailer) {
			throw new Error('This message does not belongs to this blockchain controller');
		}
		const supplement = msg.$$meta.supplement;
		if (
			!supplement ||
			supplement.contractAddress === ethers.constants.AddressZero ||
			supplement.contractType === ContractType.NONE
		) {
			return null;
		}
		if (supplement.contractType === ContractType.PAY) {
			const payer = this.payers.find(p => p.link.address === supplement.contractAddress);
			if (payer) {
				const data = await payer.wrapper.getTokenAttachments(payer.link, msg);
				return {
					kind: ContractType.PAY,
					data,
				};
			}
		} else if (supplement.contractType === ContractType.SAFE) {
			const safe = this.safes.find(p => p.link.address === supplement.contractAddress);
			if (safe) {
				const data = await safe.wrapper.getSafeMailsEvent(safe.link, msg);
				return {
					kind: ContractType.SAFE,
					data,
				};
			}
		}
		return null;
	}

	async isSafeOwner(safeAddress: string, userAddress: string) {
		const safe = this.safes[0];
		if (!safe) {
			throw new Error('No safe wrapper found');
		}
		return safe.wrapper.isSafeOwner(safeAddress, userAddress);
	}

	async getSafeOwners(safeAddress: string) {
		const safe = this.safes[0];
		if (!safe) {
			throw new Error('No safe wrapper found');
		}
		return safe.wrapper.getSafeOwners(safeAddress);
	}

	getMailerSupplementSupport() {
		const supported = [];
		if (this.currentMailer.link.pay) {
			supported.push(ContractType.PAY);
		}
		if (this.currentMailer.link.safe) {
			supported.push(ContractType.SAFE);
		}
		return supported;
	}

	isSupplementSupported(contractType: ContractType): boolean {
		if (contractType === ContractType.PAY) {
			return !!this.currentMailer.link.pay;
		}
		if (contractType === ContractType.SAFE) {
			return !!this.currentMailer.link.safe;
		}
		return false;
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
