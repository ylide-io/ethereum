import { SwitchAccountCallback } from '@ylide/sdk';
import {
	IGenericAccount,
	AbstractWalletController,
	PublicKey,
	MessageKey,
	MessageChunks,
	WalletControllerFactory,
	sha256,
	Uint256,
	bigIntToUint256,
	hexToUint256,
	WalletEvent,
	YlideError,
	YlideErrorType,
} from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import { MailerContract, MAILER_ABI, RegistryContract, REGISTRY_ABI } from '../contracts';
import { EVMNetwork, EVM_CHAINS, EVM_CHAIN_ID_TO_NETWORK, EVM_CONTRACTS, EVM_NAMES } from '../misc';

export type NetworkSwitchHandler = (
	reason: string,
	currentNetwork: EVMNetwork | undefined,
	needNetwork: EVMNetwork,
	needChainId: number,
) => Promise<void>;

export class EthereumWalletController extends AbstractWalletController {
	readonly writeWeb3: Web3;
	readonly defaultMailerContract?: MailerContract;
	readonly defaultRegistryContract?: RegistryContract;

	private readonly mailerContractAddress?: string;
	private readonly registryContractAddress?: string;
	private readonly onNetworkSwitchRequest: NetworkSwitchHandler;

	private readonly _wallet: string;

	private lastCurrentAccount: IGenericAccount | null = null;
	private providerObject: any;

	constructor(
		options: {
			dev?: boolean;
			mailerContractAddress?: string;
			registryContractAddress?: string;
			writeWeb3Provider?: Web3;
			endpoint?: string;
			wallet?: string;
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

		this.providerObject = options.providerObject || (window as any).ethereum;

		this._wallet = options.wallet;

		this.onSwitchAccountRequest = options?.onSwitchAccountRequest || null;

		if (!options || !options.onNetworkSwitchRequest) {
			throw new Error(
				'You have to pass valid onNetworkSwitchRequest param to the options of EthereumWalletController constructor',
			);
		}

		this.onNetworkSwitchRequest = options.onNetworkSwitchRequest;

		this.writeWeb3 = new Web3(options?.writeWeb3Provider || Web3.givenProvider);

		this.mailerContractAddress = options.mailerContractAddress;
		this.registryContractAddress = options.registryContractAddress;

		if (this.mailerContractAddress) {
			this.defaultMailerContract = new MailerContract(this.writeWeb3, this.mailerContractAddress);
		}
		if (this.registryContractAddress) {
			this.defaultRegistryContract = new RegistryContract(this.writeWeb3, this.registryContractAddress);
		}
	}

	handleError(err: any) {
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
					const evmNetwork = EVM_CHAIN_ID_TO_NETWORK[Number(BigInt(chainId).toString(10))];
					this.emit(WalletEvent.BLOCKCHAIN_CHANGED, EVM_NAMES[evmNetwork] || chainId);
				});
			}
		} catch (err) {
			this.handleError(err);
			throw err;
		}
	}

	async deployMailer() {
		const newInstance = new this.writeWeb3.eth.Contract(MAILER_ABI.abi as AbiItem[]);
		const tx = await newInstance
			.deploy({
				data: MAILER_ABI.bytecode,
			})
			.send({
				from: (await this.getAuthenticatedAccount())!.address,
			});
		console.log('contract address: ', tx.options.address); // tslint:disable-line
	}

	async deployRegistry() {
		const newInstance = new this.writeWeb3.eth.Contract(REGISTRY_ABI.abi as AbiItem[]);
		const tx = await newInstance
			.deploy({
				data: REGISTRY_ABI.bytecode,
			})
			.send({
				from: (await this.getAuthenticatedAccount())!.address,
			});
		console.log('contract address: ', tx.options.address); // tslint:disable-line
	}

	async setBonucer(network: EVMNetwork, from: string, newBonucer: string, val: boolean) {
		const rc = new RegistryContract(this.writeWeb3, EVM_CONTRACTS[network].registry.address);
		return await rc.setBonucer(from, newBonucer, val);
	}

	async setBonuses(network: EVMNetwork, from: string, _newcomerBonus: string, _referrerBonus: string) {
		const rc = new RegistryContract(this.writeWeb3, EVM_CONTRACTS[network].registry.address);
		return await rc.setBonuses(from, _newcomerBonus, _referrerBonus);
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
		const signature = await this.writeWeb3.eth.personal.sign(message, account.address, 'null');
		// split signature
		const r = signature.slice(0, 66);
		const s = '0x' + signature.slice(66, 130);
		const v = parseInt(signature.slice(130, 132), 16);
		return { message, r, s, v };
	}

	async signMagicString(account: IGenericAccount, magicString: string): Promise<Uint8Array> {
		await this.ensureAccount(account);
		const result = await this.writeWeb3.eth.personal.sign(magicString, account.address, 'null');
		return sha256(SmartBuffer.ofHexString(result).bytes);
	}

	addressToUint256(address: string): Uint256 {
		const lowerAddress = address.toLowerCase();
		const cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
		return hexToUint256(''.padStart(24, '0') + cleanHexAddress);
	}

	// account block
	async getAuthenticatedAccount(): Promise<IGenericAccount | null> {
		const accounts: string[] = await this.writeWeb3.eth.getAccounts();
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

	private async getCurrentChainId() {
		return await this.writeWeb3.eth.net.getId();
	}

	private async getCurrentNetwork(): Promise<EVMNetwork> {
		const chainId = await this.getCurrentChainId();
		const res = EVM_CHAIN_ID_TO_NETWORK[chainId];
		if (res === undefined) {
			throw new Error(`ChainID ${chainId} is not supported.`);
		}
		return res;
	}

	async getCurrentBlockchain(): Promise<string> {
		return EVM_NAMES[await this.getCurrentNetwork()];
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

	async deployRegistryV4(previousContractAddress?: string) {
		const me = await this.getAuthenticatedAccount();
		const address = await RegistryContract.deployContract(this.writeWeb3, me!.address, previousContractAddress);
		return address;
	}

	async deployMailerV7() {
		const me = await this.getAuthenticatedAccount();
		const address = await MailerContract.deployContract(this.writeWeb3, me!.address);
		return address;
	}

	async attachPublicKey(me: IGenericAccount, publicKey: Uint8Array, options?: any) {
		await this.ensureAccount(me);
		if (this.defaultRegistryContract) {
			await this.defaultRegistryContract.attachPublicKey(me.address, publicKey, 2);
			return;
		}
		const network = await this.ensureNetworkOptions('Attach public key', options);
		const registryContract = new RegistryContract(this.writeWeb3, EVM_CONTRACTS[network].registry.address);
		await registryContract.attachPublicKey(me.address, publicKey, 2);
	}

	async requestAuthentication(): Promise<null | IGenericAccount> {
		const accounts: string[] = await this.writeWeb3.eth.requestAccounts();
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

	async publishMessage(
		me: IGenericAccount,
		contentData: Uint8Array,
		recipients: { address: Uint256; messageKey: MessageKey }[],
		options?: any,
	): Promise<Uint256 | null> {
		await this.ensureAccount(me);
		const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
		const chunks = MessageChunks.splitMessageChunks(contentData);
		let mailer = this.defaultMailerContract;
		if (!mailer) {
			const network = await this.ensureNetworkOptions('Publish message', options);
			mailer = new MailerContract(this.writeWeb3, EVM_CONTRACTS[network].mailer.address);
		}
		if (chunks.length === 1 && recipients.length === 1) {
			const transaction = await mailer.sendSmallMail(
				me.address,
				uniqueId,
				recipients[0].address,
				recipients[0].messageKey.toBytes(),
				chunks[0],
			);
			return bigIntToUint256(transaction.events.MailContent.returnValues.msgId);
		} else if (chunks.length === 1 && recipients.length < Math.ceil((15.5 * 1024 - chunks[0].byteLength) / 70)) {
			const transaction = await mailer.sendBulkMail(
				me.address,
				uniqueId,
				recipients.map(r => r.address),
				recipients.map(r => r.messageKey.toBytes()),
				chunks[0],
			);
			return bigIntToUint256(transaction.events.MailContent.returnValues.msgId);
		} else {
			const initTime = Math.floor(Date.now() / 1000);
			const msgId = await mailer.buildHash(me.address, uniqueId, initTime);
			for (let i = 0; i < chunks.length; i++) {
				await mailer.sendMultipartMailPart(me.address, uniqueId, initTime, chunks.length, i, chunks[i]);
			}
			for (let i = 0; i < recipients.length; i += 210) {
				const recs = recipients.slice(i, i + 210);
				await mailer.addRecipients(
					me.address,
					uniqueId,
					initTime,
					recs.map(r => r.address),
					recs.map(r => r.messageKey.toBytes()),
				);
			}
			return msgId;
		}
	}

	async broadcastMessage(me: IGenericAccount, contentData: Uint8Array, options?: any): Promise<Uint256 | null> {
		await this.ensureAccount(me);
		const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
		const chunks = MessageChunks.splitMessageChunks(contentData);
		let mailer = this.defaultMailerContract;
		if (!mailer) {
			const network = await this.ensureNetworkOptions('Broadcast message', options);
			mailer = new MailerContract(this.writeWeb3, EVM_CONTRACTS[network].mailer.address);
		}
		if (chunks.length === 1) {
			const transaction = await mailer.broadcastMail(me.address, uniqueId, chunks[0]);
			return bigIntToUint256(transaction.events.MailContent.returnValues.msgId);
		} else {
			const initTime = Math.floor(Date.now() / 1000);
			const msgId = await mailer.buildHash(me.address, uniqueId, initTime);
			for (let i = 0; i < chunks.length; i++) {
				await mailer.sendMultipartMailPart(me.address, uniqueId, initTime, chunks.length, i, chunks[i]);
			}
			await mailer.broadcastMailHeader(me.address, uniqueId, initTime);
			return msgId;
		}
	}

	decryptMessageKey(
		recipientAccount: IGenericAccount,
		senderPublicKey: PublicKey,
		encryptedKey: Uint8Array,
	): Promise<Uint8Array> {
		throw new Error('Native decryption is unavailable in Ethereum.');
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
	provider: (options?: any) => Promise<Web3>,
	providerObject: () => Promise<any>,
): WalletControllerFactory {
	return {
		create: async (options?: any) =>
			new EthereumWalletController(
				Object.assign(
					{
						wallet,
						writeWeb3Provider: await provider(options),
						providerObject: await providerObject(),
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
			return new Web3((window as any).BinanceChain);
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
				return new Web3((window as any).ethereum);
			} else {
				return new Web3((window as any).ethereum.providers.find((p: any) => p.isCoinbaseWallet));
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
		async () => new Web3((window as any).trustwallet),
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
				return new Web3((window as any).ethereum.providers.find((p: any) => p.isMetaMask));
			} else {
				return new Web3((window as any).ethereum);
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
			return new Web3(options.walletConnectProvider);
		},
		async () => {
			return null;
		},
	),
};
