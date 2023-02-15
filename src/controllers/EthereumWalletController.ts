import { ethers } from 'ethers';
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
import {
	PublicKeyType,
	SendBroadcastResult,
	SendMailResult,
	ServiceCode,
	SwitchAccountCallback,
	YlidePublicKeyVersion,
	IGenericAccount,
	AbstractWalletController,
	PublicKey,
	MessageKey,
	MessageChunks,
	WalletControllerFactory,
	sha256,
	Uint256,
	hexToUint256,
	WalletEvent,
	YlideError,
	YlideErrorType,
} from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';

import {
	EVMMailerContractType,
	EVMNetwork,
	EVM_CHAINS,
	EVM_CHAIN_ID_TO_NETWORK,
	EVM_CONTRACTS,
	EVM_NAMES,
	IEVMMailerContractLink,
	IEVMMessage,
	IEVMRegistryContractLink,
} from '../misc';
import { EthereumBlockchainController } from './EthereumBlockchainController';
import { EthereumBlockchainReader } from './helpers/EthereumBlockchainReader';

import { EthereumMailerV6Wrapper } from '../contract-wrappers/EthereumMailerV6Wrapper';
import { EthereumMailerV7Wrapper } from '../contract-wrappers/EthereumMailerV7Wrapper';
import { EthereumMailerV8Wrapper } from '../contract-wrappers/EthereumMailerV8Wrapper';

import { EthereumRegistryV3Wrapper } from '../contract-wrappers/EthereumRegistryV3Wrapper';
import { EthereumRegistryV4Wrapper } from '../contract-wrappers/EthereumRegistryV4Wrapper';
import { EthereumRegistryV5Wrapper } from '../contract-wrappers/EthereumRegistryV5Wrapper';
import { EthereumRegistryV6Wrapper } from '../contract-wrappers/EthereumRegistryV6Wrapper';

export type NetworkSwitchHandler = (
	reason: string,
	currentNetwork: EVMNetwork | undefined,
	needNetwork: EVMNetwork,
	needChainId: number,
) => Promise<void>;

export class EthereumWalletController extends AbstractWalletController {
	readonly blockchainReader: EthereumBlockchainReader;
	readonly signer: JsonRpcSigner;

	private readonly onNetworkSwitchRequest: NetworkSwitchHandler;

	private readonly _wallet: string;

	readonly mailers: {
		link: IEVMMailerContractLink;
		wrapper: EthereumMailerV6Wrapper | EthereumMailerV7Wrapper | EthereumMailerV8Wrapper;
	}[] = [];
	readonly registries: {
		link: IEVMRegistryContractLink;
		wrapper:
			| EthereumRegistryV3Wrapper
			| EthereumRegistryV4Wrapper
			| EthereumRegistryV5Wrapper
			| EthereumRegistryV6Wrapper;
	}[] = [];

	private lastCurrentAccount: IGenericAccount | null = null;
	readonly providerObject: any;

	constructor(
		options: {
			dev?: boolean;
			endpoint?: string;
			wallet?: string;
			signer?: JsonRpcSigner;
			providerObject?: any;
			onNetworkSwitchRequest?: NetworkSwitchHandler;
			onSwitchAccountRequest?: SwitchAccountCallback;
		} = {},
	) {
		super(options);

		if (!options || !options.wallet) {
			throw new Error(
				'You have to pass valid wallet param to the options of EthereumWalletController constructor',
			);
		}

		if (!options || !options.signer) {
			throw new Error(
				'You have to pass valid Signer param to the options of EthereumWalletController constructor',
			);
		}

		this.providerObject = options.providerObject || (window as any).ethereum;
		this.signer = options.signer!;

		this._wallet = options.wallet;

		this.onSwitchAccountRequest = options?.onSwitchAccountRequest || null;

		if (!options || !options.onNetworkSwitchRequest) {
			throw new Error(
				'You have to pass valid onNetworkSwitchRequest param to the options of EthereumWalletController constructor',
			);
		}

		this.onNetworkSwitchRequest = options.onNetworkSwitchRequest;

		this.blockchainReader = EthereumBlockchainReader.createEthereumBlockchainReader([
			{
				rpcUrlOrProvider: this.signer.provider!,
				blockLimit: 500,
				latestNotSupported: true,
				batchNotSupported: true,
			},
		]);
	}

	private handleError(err: any) {
		console.error(`Error in EthereumWalletController of "${this.wallet()}": `, err); // tslint:disable-line
	}

	blockchainGroup(): string {
		return 'evm';
	}

	wallet(): string {
		return this._wallet;
	}

	async init() {
		try {
			this.lastCurrentAccount = await this.getAuthenticatedAccount();

			if (this.providerObject) {
				this.providerObject.on('accountsChanged', (data: string[]) => {
					console.log('accountsChanged', data);
					if (data.length && !this.lastCurrentAccount) {
						this.lastCurrentAccount = {
							blockchain: 'evm',
							address: data[0].toString().toLowerCase(),
							publicKey: null,
						};
						this.emit(WalletEvent.LOGIN, this.lastCurrentAccount);
					} else if (!data.length && this.lastCurrentAccount) {
						this.lastCurrentAccount = null;
						this.emit(WalletEvent.LOGOUT);
					} else if (data.length && this.lastCurrentAccount) {
						this.lastCurrentAccount = {
							blockchain: 'evm',
							address: data[0].toString().toLowerCase(),
							publicKey: null,
						};
						this.emit(WalletEvent.ACCOUNT_CHANGED, this.lastCurrentAccount);
					}
				});
				this.providerObject.on('chainChanged', (chainId: string) => {
					console.log('chainChanged', chainId);
					const evmNetwork = EVM_CHAIN_ID_TO_NETWORK[Number(BigInt(chainId).toString(10))];
					this.emit(WalletEvent.BLOCKCHAIN_CHANGED, EVM_NAMES[evmNetwork] || chainId);
				});
			}
		} catch (err) {
			this.handleError(err);
			throw err;
		}
	}

	private getRegistryByNetwork(network: EVMNetwork): {
		link: IEVMRegistryContractLink;
		wrapper:
			| EthereumRegistryV3Wrapper
			| EthereumRegistryV4Wrapper
			| EthereumRegistryV5Wrapper
			| EthereumRegistryV6Wrapper;
	} {
		const id = EVM_CONTRACTS[network].currentRegistryId;
		const existing = this.registries.find(r => r.link.id === id);
		if (existing) {
			return existing;
		} else {
			const link = EVM_CONTRACTS[network].registryContracts.find(r => r.id === id)!;
			const wrapper = new EthereumBlockchainController.registryWrappers[link.type](this.blockchainReader);
			this.registries.push({
				link,
				wrapper,
			});
			return { link, wrapper };
		}
	}

	private getMailerByNetwork(network: EVMNetwork): {
		link: IEVMMailerContractLink;
		wrapper: EthereumMailerV6Wrapper | EthereumMailerV7Wrapper | EthereumMailerV8Wrapper;
	} {
		const id = EVM_CONTRACTS[network].currentMailerId;
		const existing = this.mailers.find(r => r.link.id === id);
		if (existing) {
			return existing;
		} else {
			const link = EVM_CONTRACTS[network].mailerContracts.find(r => r.id === id)!;
			const wrapper = new EthereumBlockchainController.mailerWrappers[link.type](this.blockchainReader);
			this.mailers.push({
				link,
				wrapper: wrapper,
			});
			return { link, wrapper: wrapper };
		}
	}

	private getModernMailerByNetwork(network: EVMNetwork): {
		link: IEVMMailerContractLink;
		wrapper: EthereumMailerV8Wrapper;
	} {
		const id = EVM_CONTRACTS[network].currentMailerId;
		const existing = this.mailers.find(r => r.link.id === id);
		if (existing) {
			if (existing.link.type !== EVMMailerContractType.EVMMailerV8) {
				throw new Error(`Network ${network} has no modern mailer`);
			}
			return existing as any;
		} else {
			const link = EVM_CONTRACTS[network].mailerContracts.find(r => r.id === id)!;
			if (link.type !== EVMMailerContractType.EVMMailerV8) {
				throw new Error(`Network ${network} has no modern mailer`);
			}
			const wrapper = new EthereumBlockchainController.mailerWrappers[link.type](this.blockchainReader);
			this.mailers.push({
				link,
				wrapper: wrapper,
			});
			return { link, wrapper: wrapper as any };
		}
	}

	async setBonucer(network: EVMNetwork, from: string, newBonucer: string, val: boolean) {
		const registry = this.getRegistryByNetwork(network);
		if (
			registry.wrapper instanceof EthereumRegistryV3Wrapper ||
			registry.wrapper instanceof EthereumRegistryV4Wrapper
		) {
			throw new YlideError(YlideErrorType.NOT_SUPPORTED, { method: 'setBonucer' });
		}
		if (val) {
			return await registry.wrapper.addBonucer(registry.link, this.signer, from, newBonucer);
		} else {
			return await registry.wrapper.removeBonucer(registry.link, this.signer, from, newBonucer);
		}
	}

	async setBonuses(network: EVMNetwork, from: string, _newcomerBonus: string, _referrerBonus: string) {
		const registry = this.getRegistryByNetwork(network);
		if (registry.wrapper instanceof EthereumRegistryV3Wrapper) {
			throw new YlideError(YlideErrorType.NOT_SUPPORTED, { method: 'setBonuses' });
		}
		return await registry.wrapper.setBonuses(registry.link, this.signer, from, _newcomerBonus, _referrerBonus);
	}

	private async getCurrentChainId() {
		return await this.signer.getChainId();
	}

	private async getCurrentNetwork(): Promise<EVMNetwork> {
		const chainId = await this.getCurrentChainId();
		const res = EVM_CHAIN_ID_TO_NETWORK[chainId];
		if (res === undefined) {
			throw new Error(`ChainID ${chainId} is not supported.`);
		}
		return res;
	}

	private async ensureNetworkOptions(reason: string, options?: any) {
		if (!options || !EVM_CONTRACTS[options.network as EVMNetwork]) {
			throw new Error(`Please, pass network param in options in order to execute this request`);
		}
		const { network: expectedNetwork } = options;
		const network = await this.getCurrentNetwork();
		if (expectedNetwork !== network) {
			await this.onNetworkSwitchRequest(reason, network, expectedNetwork, EVM_CHAINS[network]);
		}
		const newNetwork = await this.getCurrentNetwork();
		if (expectedNetwork !== newNetwork) {
			throw new Error('Sorry, but you have to switch to the appropriate network before executing this operation');
		}
		return newNetwork;
	}

	private async ensureAccount(needAccount: IGenericAccount) {
		let me = await this.getAuthenticatedAccount();
		if (!me || me.address !== needAccount.address) {
			await this.switchAccountRequest(me, needAccount);
			me = await this.getAuthenticatedAccount();
		}
		if (!me || me.address !== needAccount.address) {
			throw new YlideError(YlideErrorType.ACCOUNT_UNREACHABLE, { currentAccount: me, needAccount });
		}
	}

	async requestYlidePrivateKey(me: IGenericAccount): Promise<Uint8Array | null> {
		throw new Error('Method not available.');
	}

	async signString(
		account: IGenericAccount,
		message: string,
	): Promise<{ message: string; r: string; s: string; v: number }> {
		await this.ensureAccount(account);
		const signature = await this.signer.signMessage(message);
		// split signature
		const r = signature.slice(0, 66);
		const s = '0x' + signature.slice(66, 130);
		const v = parseInt(signature.slice(130, 132), 16);
		return { message, r, s, v };
	}

	async signMagicString(account: IGenericAccount, magicString: string): Promise<Uint8Array> {
		await this.ensureAccount(account);
		const result = await this.signer.signMessage(magicString);
		return sha256(SmartBuffer.ofHexString(result).bytes);
	}

	addressToUint256(address: string): Uint256 {
		const lowerAddress = address.toLowerCase();
		const cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
		return hexToUint256(''.padStart(24, '0') + cleanHexAddress);
	}

	// account block
	async getAuthenticatedAccount(): Promise<IGenericAccount | null> {
		const accounts: string[] = await this.signer.provider!.listAccounts();
		if (accounts.length) {
			this.lastCurrentAccount = {
				blockchain: 'evm',
				address: accounts[0].toString().toLowerCase(),
				publicKey: null,
			};
			return this.lastCurrentAccount;
		} else {
			this.lastCurrentAccount = null;
			return null;
		}
	}

	async getCurrentBlockchain(): Promise<string> {
		return EVM_NAMES[await this.getCurrentNetwork()];
	}

	async attachPublicKey(
		me: IGenericAccount,
		publicKey: Uint8Array,
		keyVersion: YlidePublicKeyVersion = YlidePublicKeyVersion.KEY_V2,
		registrar: number = ServiceCode.SDK,
		options?: any,
	) {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Attach public key', options);
		const registry = this.getRegistryByNetwork(network);
		return void (await registry.wrapper.attachPublicKey(registry.link, this.signer, me.address, {
			keyVersion,
			publicKey: PublicKey.fromBytes(PublicKeyType.YLIDE, publicKey),
			timestamp: Math.floor(Date.now() / 1000),
			registrar,
		}));
	}

	async requestAuthentication(): Promise<null | IGenericAccount> {
		const accounts: string[] = await this.signer.provider.send('eth_requestAccounts', []);
		if (accounts.length) {
			this.lastCurrentAccount = {
				blockchain: 'evm',
				address: accounts[0].toString().toLowerCase(),
				publicKey: null,
			};
			return this.lastCurrentAccount;
		} else {
			throw new Error('Not authenticated');
		}
	}

	isMultipleAccountsSupported() {
		return true;
	}

	async disconnectAccount(account: IGenericAccount): Promise<void> {
		//
	}

	async sendMail(
		me: IGenericAccount,
		contentData: Uint8Array,
		recipients: { address: Uint256; messageKey: MessageKey }[],
		options?: any,
	): Promise<SendMailResult> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Publish message', options);
		const mailer = this.getModernMailerByNetwork(network);

		const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
		const chunks = MessageChunks.splitMessageChunks(contentData);

		if (chunks.length === 1 && recipients.length === 1) {
			const { messages } = await mailer.wrapper.sendSmallMail(
				mailer.link,
				this.signer,
				me.address,
				uniqueId,
				recipients[0].address,
				recipients[0].messageKey.toBytes(),
				chunks[0],
			);

			return { pushes: messages.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
		} else if (chunks.length === 1 && recipients.length < Math.ceil((15.5 * 1024 - chunks[0].byteLength) / 70)) {
			const { messages } = await mailer.wrapper.sendBulkMail(
				mailer.link,
				this.signer,
				me.address,
				uniqueId,
				recipients.map(r => r.address),
				recipients.map(r => r.messageKey.toBytes()),
				chunks[0],
			);

			return { pushes: messages.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
		} else {
			const firstBlockNumber = await this.signer.provider.getBlockNumber();
			const blockLock = 600;
			// const msgId = await mailer.buildHash(me.address, uniqueId, firstBlockNumber);
			for (let i = 0; i < chunks.length; i++) {
				const { tx, receipt, logs } = await mailer.wrapper.sendMessageContentPart(
					mailer.link,
					this.signer,
					me.address,
					uniqueId,
					firstBlockNumber,
					blockLock,
					chunks.length,
					i,
					chunks[i],
				);
			}
			const msgs: IEVMMessage[] = [];
			for (let i = 0; i < recipients.length; i += 210) {
				const recs = recipients.slice(i, i + 210);
				const { messages } = await mailer.wrapper.addMailRecipients(
					mailer.link,
					this.signer,
					me.address,
					uniqueId,
					firstBlockNumber,
					chunks.length,
					blockLock,
					recs.map(r => r.address),
					recs.map(r => r.messageKey.toBytes()),
				);
				msgs.push(...messages);
			}

			return { pushes: msgs.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
		}
	}

	async sendBroadcast(me: IGenericAccount, contentData: Uint8Array, options?: any): Promise<SendBroadcastResult> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Broadcast message', options);
		const mailer = this.getModernMailerByNetwork(network);

		const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
		const chunks = MessageChunks.splitMessageChunks(contentData);

		if (chunks.length === 1) {
			const { messages } = await mailer.wrapper.sendBroadcast(
				mailer.link,
				this.signer,
				me.address,
				uniqueId,
				chunks[0],
			);

			return { pushes: messages.map(msg => ({ push: msg })) };
		} else {
			const firstBlockNumber = await this.signer.provider.getBlockNumber();
			const blockLock = 600;
			for (let i = 0; i < chunks.length; i++) {
				const { tx, receipt, logs } = await mailer.wrapper.sendMessageContentPart(
					mailer.link,
					this.signer,
					me.address,
					uniqueId,
					firstBlockNumber,
					blockLock,
					chunks.length,
					i,
					chunks[i],
				);
			}
			const { messages } = await mailer.wrapper.sendBroadcastHeader(
				mailer.link,
				this.signer,
				me.address,
				uniqueId,
				firstBlockNumber,
				chunks.length,
				blockLock,
			);

			return { pushes: messages.map(msg => ({ push: msg })) };
		}
	}

	decryptMessageKey(
		recipientAccount: IGenericAccount,
		senderPublicKey: PublicKey,
		encryptedKey: Uint8Array,
	): Promise<Uint8Array> {
		throw new Error('Native decryption is unavailable in Ethereum.');
	}

	// Deployments:

	async deployRegistryV3(
		me: IGenericAccount,
		previousContractAddress: string = '0x0000000000000000000000000000000000000000',
		options?: any,
	): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV3', options);
		return await EthereumRegistryV3Wrapper.deploy(this.signer, me.address, previousContractAddress);
	}

	async deployRegistryV4(
		me: IGenericAccount,
		previousContractAddress: string = '0x0000000000000000000000000000000000000000',
		options?: any,
	): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV4', options);
		return await EthereumRegistryV4Wrapper.deploy(this.signer, me.address, previousContractAddress);
	}

	async deployRegistryV5(
		me: IGenericAccount,
		previousContractAddress: string = '0x0000000000000000000000000000000000000000',
		options?: any,
	): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV5', options);
		return await EthereumRegistryV5Wrapper.deploy(this.signer, me.address, previousContractAddress);
	}

	async deployRegistryV6(me: IGenericAccount, options?: any): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV6', options);
		return await EthereumRegistryV6Wrapper.deploy(this.signer, me.address);
	}

	async deployMailerV6(me: IGenericAccount, options?: any): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy MailerV6', options);
		return await EthereumMailerV6Wrapper.deploy(this.signer, me.address);
	}

	async deployMailerV7(me: IGenericAccount, options?: any): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy MailerV7', options);
		return await EthereumMailerV7Wrapper.deploy(this.signer, me.address);
	}

	async deployMailerV8(me: IGenericAccount, options?: any): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy MailerV8', options);
		return await EthereumMailerV8Wrapper.deploy(this.signer, me.address);
	}
}

// export const ethereumWalletFactory: WalletControllerFactory = {
// 	create: async (options?: any) => new EthereumWalletController(options),
// 	// @ts-ignore
// 	isWalletAvailable: async () => !!(window['ethereum'] || window['web3']), // tslint:disable-line
// 	blockchainGroup: 'evm',
// 	wallet: 'web3',
// };

function getWalletFactory(
	wallet: string,
	isWalletAvailable: () => Promise<boolean>,
	provider: (options?: any) => Promise<ethers.Signer>,
	providerObject: () => Promise<any>,
): WalletControllerFactory {
	return {
		create: async (options?: any) =>
			new EthereumWalletController(
				Object.assign(
					{
						signer: await provider(options),
						providerObject: await providerObject(),

						wallet,
					},
					options || {},
				),
			),
		blockchainGroup: 'evm',
		wallet,
		isWalletAvailable,
	};
}

export const evmWalletFactories: Record<string, WalletControllerFactory> = {
	binance: getWalletFactory(
		'binance',
		async () => !!(window as any).BinanceChain,
		async () => {
			return new Web3Provider((window as any).BinanceChain, 'any').getSigner();
		},
		async () => {
			return (window as any).BinanceChain;
		},
	),
	coinbase: getWalletFactory(
		'coinbase',
		async () =>
			(window as any).ethereum &&
			((window as any).ethereum.isCoinbaseWallet ||
				((window as any).ethereum.providers?.length &&
					(window as any).ethereum.providers.find((p: any) => p.isCoinbaseWallet))),
		async () => {
			if ((window as any).ethereum.isCoinbaseWallet) {
				return new Web3Provider((window as any).ethereum, 'any').getSigner();
			} else {
				return new Web3Provider(
					(window as any).ethereum.providers.find((p: any) => p.isCoinbaseWallet),
					'any',
				).getSigner();
			}
		},
		async () => {
			if ((window as any).ethereum.isCoinbaseWallet) {
				return (window as any).ethereum;
			} else {
				return (window as any).ethereum.providers.find((p: any) => p.isCoinbaseWallet);
			}
		},
	),
	trustwallet: getWalletFactory(
		'trustwallet',
		async () => !!(window as any).trustwallet,
		async () => new Web3Provider((window as any).trustwallet, 'any').getSigner(),
		async () => (window as any).trustwallet,
	),
	metamask: getWalletFactory(
		'metamask',
		async () =>
			(window as any).ethereum &&
			((window as any).ethereum.isMetaMask ||
				((window as any).ethereum.providers?.length &&
					(window as any).ethereum.providers.find((p: any) => p.isMetaMask))),
		async () => {
			if ((window as any).ethereum.providers?.length) {
				return new Web3Provider(
					(window as any).ethereum.providers.find((p: any) => p.isMetaMask),
					'any',
				).getSigner();
			} else {
				return new Web3Provider((window as any).ethereum, 'any').getSigner();
			}
		},
		async () => {
			if ((window as any).ethereum.providers?.length) {
				return (window as any).ethereum.providers.find((p: any) => p.isMetaMask);
			} else {
				return (window as any).ethereum;
			}
		},
	),
	walletconnect: getWalletFactory(
		'walletconnect',
		async () => true,
		async (options: { walletConnectProvider: any }) => {
			return new Web3Provider(options.walletConnectProvider, 'any').getSigner();
		},
		async () => {
			return null;
		},
	),
};
