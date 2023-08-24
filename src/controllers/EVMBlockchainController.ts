import type {
	AbstractNameService,
	BlockchainControllerFactory,
	IBlockchainSourceSubject,
	IExtraEncryptionStrateryBulk,
	IExtraEncryptionStrateryEntry,
	IMessage,
	IMessageContent,
	IMessageCorruptedContent,
	ISourceSubject,
	LowLevelMessagesSource,
	MessageKey,
	RemotePublicKey,
	Uint256,
} from '@ylide/sdk';
import { AbstractBlockchainController, BlockchainSourceType, hexToUint256, YlideCore } from '@ylide/sdk';
import { ethers } from 'ethers';
import { EVM_CHAINS, EVM_CONTRACT_TO_NETWORK, EVM_ENS, EVM_NAMES, EVM_RPCS } from '../misc/constants';
import { decodeEvmMsgId } from '../misc/evmMsgId';
import type {
	IEVMMailerContractLink,
	IEVMMessage,
	IEVMRegistryContractLink,
	IEVMYlidePayContractLink,
	YlideTokenAttachment,
} from '../misc/types';
import {
	EVMMailerContractType,
	EVMNetwork,
	EVMRegistryContractType,
	EVMYlidePayContractType,
	TokenAttachmentContractType,
} from '../misc/types';

import type { IRPCDescriptor } from './helpers/EVMBlockchainReader';
import { EVMBlockchainReader } from './helpers/EVMBlockchainReader';
import { EVMContentReader } from './helpers/EVMContentReader';

import { EVMRegistryV3Wrapper } from '../contract-wrappers/EVMRegistryV3Wrapper';
import { EVMRegistryV4Wrapper } from '../contract-wrappers/EVMRegistryV4Wrapper';
import { EVMRegistryV5Wrapper } from '../contract-wrappers/EVMRegistryV5Wrapper';
import { EVMRegistryV6Wrapper } from '../contract-wrappers/EVMRegistryV6Wrapper';

import { EVMMailerV6Wrapper } from '../contract-wrappers/EVMMailerV6Wrapper';
import { EVMMailerV7Wrapper } from '../contract-wrappers/EVMMailerV7Wrapper';
import { EVMMailerV8Wrapper } from '../contract-wrappers/v8/EVMMailerV8Wrapper';
import { EVMMailerV9Wrapper } from '../contract-wrappers/v9/EVMMailerV9Wrapper';
import { EVMPayV1Wrapper } from '../contract-wrappers/EVMPayV1Wrapper';

import { EVMMailerV6Source } from '../messages-sources/EVMMailerV6Source';
import { EVMMailerV7Source } from '../messages-sources/EVMMailerV7Source';
import { EVMMailerV8Source } from '../messages-sources/EVMMailerV8Source';
import { EVMMailerV9Source } from '../messages-sources/EVMMailerV9Source';
import { EVM_CONTRACTS } from '../misc/contractConstants';
import { EVMNameService } from './EVMNameService';

export class EVMBlockchainController extends AbstractBlockchainController {
	private readonly _isVerbose: boolean;

	readonly blockchainReader: EVMBlockchainReader;
	readonly contentReader: EVMContentReader;

	readonly network: EVMNetwork;
	readonly chainId: number;

	static readonly mailerWrappers: Record<
		EVMMailerContractType,
		typeof EVMMailerV8Wrapper | typeof EVMMailerV7Wrapper | typeof EVMMailerV6Wrapper | typeof EVMMailerV9Wrapper
	> = {
		[EVMMailerContractType.EVMMailerV6]: EVMMailerV6Wrapper,
		[EVMMailerContractType.EVMMailerV7]: EVMMailerV7Wrapper,
		[EVMMailerContractType.EVMMailerV8]: EVMMailerV8Wrapper,
		[EVMMailerContractType.EVMMailerV9]: EVMMailerV9Wrapper,
	};

	static readonly registryWrappers: Record<
		EVMRegistryContractType,
		| typeof EVMRegistryV3Wrapper
		| typeof EVMRegistryV4Wrapper
		| typeof EVMRegistryV5Wrapper
		| typeof EVMRegistryV6Wrapper
	> = {
		[EVMRegistryContractType.EVMRegistryV3]: EVMRegistryV3Wrapper,
		[EVMRegistryContractType.EVMRegistryV4]: EVMRegistryV4Wrapper,
		[EVMRegistryContractType.EVMRegistryV5]: EVMRegistryV5Wrapper,
		[EVMRegistryContractType.EVMRegistryV6]: EVMRegistryV6Wrapper,
	};

	static readonly payWrappers: Record<EVMYlidePayContractType, typeof EVMPayV1Wrapper> = {
		[EVMYlidePayContractType.EVMYlidePayV1]: EVMPayV1Wrapper,
	};

	readonly mailers: {
		link: IEVMMailerContractLink;
		wrapper: EVMMailerV8Wrapper | EVMMailerV7Wrapper | EVMMailerV6Wrapper | EVMMailerV9Wrapper;
	}[] = [];
	readonly registries: {
		link: IEVMRegistryContractLink;
		wrapper: EVMRegistryV3Wrapper | EVMRegistryV4Wrapper | EVMRegistryV5Wrapper | EVMRegistryV6Wrapper;
	}[] = [];
	readonly payers: {
		link: IEVMYlidePayContractLink;
		wrapper: EVMPayV1Wrapper;
	}[] = [];

	readonly currentMailer: {
		link: IEVMMailerContractLink;
		wrapper: EVMMailerV8Wrapper | EVMMailerV7Wrapper | EVMMailerV6Wrapper | EVMMailerV9Wrapper;
	};
	readonly currentRegistry: {
		link: IEVMRegistryContractLink;
		wrapper: EVMRegistryV3Wrapper | EVMRegistryV4Wrapper | EVMRegistryV5Wrapper | EVMRegistryV6Wrapper;
	};

	constructor(
		private readonly options: {
			network?: EVMNetwork;
			rpcs?: IRPCDescriptor[];
			verbose?: boolean;
		} = {},
	) {
		super();

		this._isVerbose = options.verbose || false;

		if (options.network === undefined) {
			throw new Error('You must provide network for EVM controller');
		}

		this.network = options.network;
		this.chainId = EVM_CHAINS[options.network];

		this.blockchainReader = EVMBlockchainReader.createEVMBlockchainReader(
			this.blockchainGroup(),
			EVM_NAMES[options.network],
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

		const contracts = EVM_CONTRACTS[this.network];

		this.mailers = contracts.mailerContracts.map(link => ({
			link,
			wrapper: new EVMBlockchainController.mailerWrappers[link.type](this.blockchainReader),
		}));

		this.registries = contracts.registryContracts.map(link => ({
			link,
			wrapper: new EVMBlockchainController.registryWrappers[link.type](this.blockchainReader),
		}));

		this.payers = contracts.payContracts.map(link => ({
			link,
			wrapper: new EVMBlockchainController.payWrappers[link.type](this.blockchainReader),
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
			wrapper: new EVMBlockchainController.mailerWrappers[currentMailerLink.type](
				this.blockchainReader,
			) as EVMMailerV8Wrapper,
		};

		this.currentRegistry = {
			link: currentRegistryLink,
			wrapper: new EVMBlockchainController.registryWrappers[currentRegistryLink.type](
				this.blockchainReader,
			) as EVMRegistryV5Wrapper,
		};

		this.contentReader = new EVMContentReader(this.blockchainReader);
	}

	private verboseLogTick(...args: any[]) {
		if (this._isVerbose) {
			console.log('[Y-ETH-SDK]', ...args);
			const timer = setTimeout(() => {
				console.log('[Y-ETH-SDK]', '...still working...', ...args);
			}, 5000);
			return () => clearTimeout(timer);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			return () => {};
		}
	}

	blockchain(): string {
		return EVM_NAMES[this.network];
	}

	blockchainGroup(): string {
		return 'evm';
	}

	async init(): Promise<void> {
		const done = this.verboseLogTick(`Initializing ${this.blockchain()} blockchain reader...`);
		await this.blockchainReader.init();
		done();
	}

	private tryGetNameService(): EVMNameService | null {
		const ens = EVM_ENS[this.network];
		return ens ? new EVMNameService(this, ens) : null;
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

	async getUserNonceMailer(userAddress: string) {
		const mailer = this.mailers.find(m => m.link.id === EVM_CONTRACTS[this.network].currentMailerId);
		if (!mailer) {
			throw new Error(
				`Unknown contract ${EVM_CONTRACTS[this.network].currentMailerId} for network ${this.network}`,
			);
		}
		if (mailer.link.type === EVMMailerContractType.EVMMailerV9 && mailer.wrapper instanceof EVMMailerV9Wrapper) {
			return mailer.wrapper.mailing.getNonce(mailer.link, userAddress);
		}
		throw new Error('Unsupported mailer version');
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
			if (!(mailer.wrapper instanceof EVMMailerV8Wrapper)) {
				throw new Error('Broadcasts are only supported by mailer V8 and higher');
			}
			return await mailer.wrapper.broadcast.getBroadcastPushEvent(
				mailer.link,
				parsed.blockNumber,
				parsed.txIndex,
				parsed.logIndex,
			);
		} else {
			if (!(mailer.wrapper instanceof EVMMailerV8Wrapper) && !(mailer.wrapper instanceof EVMMailerV9Wrapper)) {
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

		if (mailer.wrapper instanceof EVMMailerV9Wrapper) {
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
		} else if (mailer.wrapper instanceof EVMMailerV8Wrapper) {
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
		} else if (mailer.wrapper instanceof EVMMailerV7Wrapper) {
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
		if (mailer.wrapper instanceof EVMMailerV8Wrapper || mailer.wrapper instanceof EVMMailerV9Wrapper) {
			return await mailer.wrapper.content.retrieveMessageContent(mailer.link, msg);
		} else {
			return mailer.wrapper.retrieveMessageContent(mailer.link, msg);
		}
	}

	async extractPublicKeyFromAddress(address: string): Promise<RemotePublicKey | null> {
		const raw = await Promise.all(this.registries.map(reg => reg.wrapper.getPublicKeyByAddress(reg.link, address)));
		const active = raw.filter(r => r !== null) as RemotePublicKey[];
		active.sort((a, b) => b.timestamp - a.timestamp);
		return active.length ? active[0] : null;
	}

	async extractPublicKeysHistoryByAddress(address: string): Promise<RemotePublicKey[]> {
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
		if (mailer.wrapper instanceof EVMMailerV8Wrapper) {
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

	async getTokenAttachments(msg: IEVMMessage): Promise<YlideTokenAttachment | null> {
		const decodedMsgId = decodeEvmMsgId(msg.msgId);
		const mailer = this.mailers.find(m => m.link.id === decodedMsgId.contractId);
		if (!mailer) {
			throw new Error('This message does not belongs to this blockchain controller');
		}
		const supplement = msg.$$meta.supplement;
		if (!supplement || supplement.contractAddress === ethers.constants.AddressZero) {
			return null;
		}
		if (mailer.wrapper instanceof EVMMailerV9Wrapper) {
			if (supplement.contractType === TokenAttachmentContractType.Pay) {
				const payer = this.payers.find(p => p.link.address === supplement.contractAddress);
				if (payer) {
					const attachments = await payer.wrapper.getTokenAttachments(payer.link, msg);
					return {
						kind: TokenAttachmentContractType.Pay,
						attachments,
					};
				}
			}
		}
		return null;
	}

	prepareExtraEncryptionStrategyBulk(
		entries: IExtraEncryptionStrateryEntry[],
	): Promise<IExtraEncryptionStrateryBulk> {
		throw new Error('No native strategies supported for EVM');
	}

	executeExtraEncryptionStrategy(
		entries: IExtraEncryptionStrateryEntry[],
		bulk: IExtraEncryptionStrateryBulk,
		addedPublicKeyIndex: number | null,
		messageKey: Uint8Array,
	): Promise<MessageKey[]> {
		throw new Error('No native strategies supported for EVM');
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
		create: async (options?: any) => new EVMBlockchainController(Object.assign({ network }, options || {})),
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
	[EVMNetwork.BASE]: getBlockchainFactory(EVMNetwork.BASE),
	[EVMNetwork.ZETA]: getBlockchainFactory(EVMNetwork.ZETA),
	[EVMNetwork.LINEA]: getBlockchainFactory(EVMNetwork.LINEA),
};
