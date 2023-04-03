import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
import {
	AbstractWalletController,
	IGenericAccount,
	MessageChunks,
	MessageKey,
	PublicKey,
	PublicKeyType,
	SendBroadcastResult,
	SendMailResult,
	ServiceCode,
	SwitchAccountCallback,
	Uint256,
	WalletControllerFactory,
	WalletEvent,
	YLIDE_MAIN_FEED_ID,
	YlideError,
	YlideErrorType,
	YlidePublicKeyVersion,
	hexToUint256,
	sha256,
} from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { BigNumber, ethers } from 'ethers';

import { EVM_CHAINS, EVM_CHAIN_ID_TO_NETWORK, EVM_CHUNK_SIZES, EVM_NAMES } from '../misc/constants';
import type { IEVMMailerContractLink, IEVMMessage, IEVMRegistryContractLink, Payment } from '../misc/types';
import { EVMNetwork } from '../misc/types';
import { EthereumBlockchainController } from './EthereumBlockchainController';
import { EthereumBlockchainReader } from './helpers/EthereumBlockchainReader';

import { EthereumMailerV6Wrapper } from '../contract-wrappers/EthereumMailerV6Wrapper';
import { EthereumMailerV7Wrapper } from '../contract-wrappers/EthereumMailerV7Wrapper';
import { EthereumMailerV8Wrapper } from '../contract-wrappers/v8/EthereumMailerV8Wrapper';
import { EthereumMailerV9Wrapper } from '../contract-wrappers/v9';

import { EthereumRegistryV3Wrapper } from '../contract-wrappers/EthereumRegistryV3Wrapper';
import { EthereumRegistryV4Wrapper } from '../contract-wrappers/EthereumRegistryV4Wrapper';
import { EthereumRegistryV5Wrapper } from '../contract-wrappers/EthereumRegistryV5Wrapper';
import { EthereumRegistryV6Wrapper } from '../contract-wrappers/EthereumRegistryV6Wrapper';
import { EVMMailerContractType } from '../misc';
import { EVM_CONTRACTS } from '../misc/contractConstants';
import { IYlideMailer } from '@ylide/ethereum-contracts';

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
		wrapper: EthereumMailerV6Wrapper | EthereumMailerV7Wrapper | EthereumMailerV8Wrapper | EthereumMailerV9Wrapper;
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
		this.signer = options.signer;

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
				chainId: 0, // not user when provider is provided
				rpcUrlOrProvider: this.signer.provider,
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
			const link = EVM_CONTRACTS[network].registryContracts.find(r => r.id === id);
			if (!link) {
				throw new Error(`Network ${network} has no current registry`);
			}
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
		wrapper: EthereumMailerV6Wrapper | EthereumMailerV7Wrapper | EthereumMailerV8Wrapper | EthereumMailerV9Wrapper;
	} {
		const id = EVM_CONTRACTS[network].currentMailerId;
		const existing = this.mailers.find(r => r.link.id === id);
		if (existing) {
			return existing;
		} else {
			const link = EVM_CONTRACTS[network].mailerContracts.find(r => r.id === id);
			if (!link) {
				throw new Error(`Network ${network} has no current mailer`);
			}
			const wrapper = new EthereumBlockchainController.mailerWrappers[link.type](this.blockchainReader);
			this.mailers.push({
				link,
				wrapper,
			});
			return { link, wrapper };
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

	private async ensureNetworkOptions(reason: string, options?: { network?: EVMNetwork }) {
		if (!options || typeof options.network === 'undefined' || !EVM_CONTRACTS[options.network]) {
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
		const accounts: string[] = await this.signer.provider.listAccounts();
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
		options?: { network?: EVMNetwork; value?: BigNumber },
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
		feedId: Uint256,
		contentData: Uint8Array,
		recipients: { address: Uint256; messageKey: MessageKey }[],
		options?: { network?: EVMNetwork; value?: BigNumber },
		signatureArgs?: IYlideMailer.SignatureArgsStruct,
		payments?: Payment,
	): Promise<SendMailResult> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Publish message', options);
		const mailer = this.getMailerByNetwork(network);

		const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
		const chunkSize = EVM_CHUNK_SIZES[network];
		const chunks = MessageChunks.splitMessageChunks(contentData, chunkSize);

		if (
			chunks.length === 1 &&
			recipients.length === 1 &&
			!(mailer.wrapper instanceof EthereumMailerV8Wrapper) &&
			!(mailer.wrapper instanceof EthereumMailerV9Wrapper)
		) {
			if (feedId !== YLIDE_MAIN_FEED_ID) {
				throw new Error('FeedId is not supported');
			}
			console.log(`Sending small mail, chunk length: ${chunks[0].length} bytes`);
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
			if (
				mailer.wrapper instanceof EthereumMailerV8Wrapper ||
				mailer.wrapper instanceof EthereumMailerV9Wrapper
			) {
				console.log(`Sending bulk mail, chunk length: ${chunks[0].length} bytes`);
				const { messages } = await mailer.wrapper.mailing.sendBulkMail(
					mailer.link,
					this.signer,
					me.address,
					feedId,
					uniqueId,
					recipients.map(r => r.address),
					recipients.map(r => r.messageKey.toBytes()),
					chunks[0],
					options?.value || BigNumber.from(0),
					signatureArgs,
					payments,
				);
				return { pushes: messages.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
			} else {
				if (feedId !== YLIDE_MAIN_FEED_ID) {
					throw new Error('FeedId is not supported');
				}
				console.log(`Sending bulk mail, chunk length: ${chunks[0].length} bytes`);
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
			}
		} else {
			if (
				mailer.wrapper instanceof EthereumMailerV8Wrapper ||
				mailer.wrapper instanceof EthereumMailerV9Wrapper
			) {
				const firstBlockNumber = await this.signer.provider.getBlockNumber();
				const blockLock = 600;
				// const msgId = await mailer.buildHash(me.address, uniqueId, firstBlockNumber);
				for (let i = 0; i < chunks.length; i++) {
					console.log(`Sending multi mail, current chunk length: ${chunks[i].length} bytes`);
					const { tx, receipt, logs } = await mailer.wrapper.content.sendMessageContentPart(
						mailer.link,
						this.signer,
						me.address,
						uniqueId,
						firstBlockNumber,
						blockLock,
						chunks.length,
						i,
						chunks[i],
						options?.value || BigNumber.from(0),
					);
				}
				const msgs: IEVMMessage[] = [];
				for (let i = 0; i < recipients.length; i += 210) {
					const recs = recipients.slice(i, i + 210);
					const { messages } = await mailer.wrapper.mailing.addMailRecipients(
						mailer.link,
						this.signer,
						me.address,
						feedId,
						uniqueId,
						firstBlockNumber,
						chunks.length,
						blockLock,
						recs.map(r => r.address),
						recs.map(r => r.messageKey.toBytes()),
						options?.value || BigNumber.from(0),
						signatureArgs,
						payments,
					);
					msgs.push(...messages);
				}

				return { pushes: msgs.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
			} else {
				const initTime = Math.floor(Date.now() / 1000) - 60;

				for (let i = 0; i < chunks.length; i++) {
					console.log(`Sending multi mail, current chunk length: ${chunks[i].length} bytes`);
					await mailer.wrapper.sendMessageContentPart(
						mailer.link,
						this.signer,
						me.address,
						uniqueId,
						initTime,
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
						initTime,
						recs.map(r => r.address),
						recs.map(r => r.messageKey.toBytes()),
					);
					msgs.push(...messages);
				}

				return { pushes: msgs.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
			}
		}
	}

	async sendBroadcast(
		me: IGenericAccount,
		feedId: Uint256,
		contentData: Uint8Array,
		options?: { network?: EVMNetwork; value?: BigNumber; isPersonal?: boolean },
	): Promise<SendBroadcastResult> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Broadcast message', options);
		const mailer = this.getMailerByNetwork(network);

		const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
		const chunks = MessageChunks.splitMessageChunks(contentData);

		if (!(mailer.wrapper instanceof EthereumMailerV8Wrapper)) {
			throw new Error('Broadcasts are supported only in MailerV8');
		}

		if (chunks.length === 1) {
			const { messages } = await mailer.wrapper.broadcast.sendBroadcast(
				mailer.link,
				this.signer,
				me.address,
				options?.isPersonal || false,
				feedId,
				uniqueId,
				chunks[0],
				options?.value || BigNumber.from(0),
			);

			return { pushes: messages.map(msg => ({ push: msg })) };
		} else {
			const firstBlockNumber = await this.signer.provider.getBlockNumber();
			const blockLock = 600;
			for (let i = 0; i < chunks.length; i++) {
				const { tx, receipt, logs } = await mailer.wrapper.content.sendMessageContentPart(
					mailer.link,
					this.signer,
					me.address,
					uniqueId,
					firstBlockNumber,
					blockLock,
					chunks.length,
					i,
					chunks[i],
					options?.value || BigNumber.from(0),
				);
			}
			const { messages } = await mailer.wrapper.broadcast.sendBroadcastHeader(
				mailer.link,
				this.signer,
				me.address,
				options?.isPersonal || false,
				feedId,
				uniqueId,
				firstBlockNumber,
				chunks.length,
				blockLock,
				options?.value || BigNumber.from(0),
			);

			return { pushes: messages.map(msg => ({ push: msg })) };
		}
	}

	async signBulkMail(
		me: IGenericAccount,
		signer: ethers.providers.JsonRpcSigner,
		feedId: Uint256,
		uniqueId: number,
		recipients: Uint256[],
		keys: Uint8Array[],
		content: Uint8Array,
		deadline: number,
		nonce: number,
		options?: { network?: EVMNetwork; value?: BigNumber },
	) {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Sign bulk mail', options);
		const mailer = this.getMailerByNetwork(network);
		if (
			mailer.link.type === EVMMailerContractType.EVMMailerV9 &&
			mailer.wrapper instanceof EthereumMailerV9Wrapper
		) {
			return mailer.wrapper.mailing.signBulkMail(
				mailer.link,
				signer,
				feedId,
				uniqueId,
				recipients,
				keys,
				content,
				deadline,
				nonce,
				await this.getCurrentChainId(),
			);
		}
		throw new Error('Bulk mail is supported only in MailerV9');
	}

	async signAddMailRecipients(
		me: IGenericAccount,
		signer: ethers.providers.JsonRpcSigner,
		feedId: Uint256,
		uniqueId: number,
		firstBlockNumber: number,
		partsCount: number,
		blockCountLock: number,
		recipients: Uint256[],
		keys: Uint8Array[],
		deadline: number,
		nonce: number,
		options?: { network?: EVMNetwork; value?: BigNumber },
	) {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Sign add mail recipients', options);
		const mailer = this.getMailerByNetwork(network);
		if (
			mailer.link.type === EVMMailerContractType.EVMMailerV9 &&
			mailer.wrapper instanceof EthereumMailerV9Wrapper
		) {
			return mailer.wrapper.mailing.signAddMailRecipients(
				mailer.link,
				signer,
				feedId,
				uniqueId,
				firstBlockNumber,
				partsCount,
				blockCountLock,
				recipients,
				keys,
				deadline,
				nonce,
				await this.getCurrentChainId(),
			);
		}
		throw new Error('Bulk mail is supported only in MailerV9');
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
		previousContractAddress = '0x0000000000000000000000000000000000000000',
		options?: { network?: EVMNetwork; value?: BigNumber },
	): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV3', options);
		return await EthereumRegistryV3Wrapper.deploy(this.signer, me.address, previousContractAddress);
	}

	async deployRegistryV4(
		me: IGenericAccount,
		previousContractAddress = '0x0000000000000000000000000000000000000000',
		options?: { network?: EVMNetwork; value?: BigNumber },
	): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV4', options);
		return await EthereumRegistryV4Wrapper.deploy(this.signer, me.address, previousContractAddress);
	}

	async deployRegistryV5(
		me: IGenericAccount,
		previousContractAddress = '0x0000000000000000000000000000000000000000',
		options?: { network?: EVMNetwork; value?: BigNumber },
	): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV5', options);
		return await EthereumRegistryV5Wrapper.deploy(this.signer, me.address, previousContractAddress);
	}

	async deployRegistryV6(
		me: IGenericAccount,
		options?: { network?: EVMNetwork; value?: BigNumber },
	): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV6', options);
		return await EthereumRegistryV6Wrapper.deploy(this.signer, me.address);
	}

	async deployMailerV6(me: IGenericAccount, options?: { network?: EVMNetwork; value?: BigNumber }): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy MailerV6', options);
		return await EthereumMailerV6Wrapper.deploy(this.signer, me.address);
	}

	async deployMailerV7(me: IGenericAccount, options?: { network?: EVMNetwork; value?: BigNumber }): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy MailerV7', options);
		return await EthereumMailerV7Wrapper.deploy(this.signer, me.address);
	}

	async deployMailerV8(me: IGenericAccount, options?: { network?: EVMNetwork; value?: BigNumber }): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy MailerV8', options);
		return await EthereumMailerV8Wrapper.deploy(this.signer, me.address);
	}

	async deployMailerV9(me: IGenericAccount, options?: { network?: EVMNetwork; value?: BigNumber }): Promise<string> {
		await this.ensureAccount(me);
		await this.ensureNetworkOptions('Deploy MailerV9', options);
		return await EthereumMailerV9Wrapper.deploy(this.signer, me.address);
	}
}

// export const ethereumWalletFactory: WalletControllerFactory = {
// 	create: async (options?: { network?: EVMNetwork; value?: BigNumber }) => new EthereumWalletController(options),
// 	// @ts-ignore
// 	isWalletAvailable: async () => !!(window['ethereum'] || window['web3']), // tslint:disable-line
// 	blockchainGroup: 'evm',
// 	wallet: 'web3',
// };

const getWalletFactory = (
	wallet: string,
	isWalletAvailable: () => Promise<boolean>,
	provider: (options?: any) => Promise<ethers.Signer>,
	providerObject: () => Promise<any>,
): WalletControllerFactory => {
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
};

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
	generic: getWalletFactory(
		'generic',
		async () => !!(window as any).ethereum,
		async () => new Web3Provider((window as any).ethereum, 'any').getSigner(),
		async () => (window as any).ethereum,
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
