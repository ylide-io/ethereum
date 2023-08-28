import type { JsonRpcSigner } from '@ethersproject/providers';
import { Web3Provider } from '@ethersproject/providers';
import type {
	MessageKey,
	SwitchAccountCallback,
	Uint256,
	WalletControllerFactory,
	EncryptionPublicKey,
	AbstractFaucetService,
	SendingProcess,
} from '@ylide/sdk';
import {
	AbstractWalletController,
	MessageChunks,
	PublicKey,
	PublicKeyType,
	SendingProcessBuilder,
	ServiceCode,
	WalletEvent,
	YLIDE_MAIN_FEED_ID,
	YlideError,
	YlideErrorType,
	YlideKeyVersion,
	hexToUint256,
	sha256,
} from '@ylide/sdk';
import { SmartBuffer } from '@ylide/smart-buffer';
import { BigNumber, ethers } from 'ethers';

import { EVM_CHAINS, EVM_CHAIN_ID_TO_NETWORK, EVM_CHUNK_SIZES, EVM_NAMES } from '../misc/constants';
import type {
	ContractType,
	GenerateSignatureCallback,
	IEVMMailerContractLink,
	IEVMMessage,
	IEVMRegistryContractLink,
	IEVMYlidePayContractLink,
	YlidePayment,
} from '../misc/types';
import { EVMNetwork } from '../misc/types';
import { EVMWalletAccount } from '../misc/EVMWalletAccount';
import { TokenAttachmentContractType } from '../misc/types';
import { EVMBlockchainController } from './EVMBlockchainController';
import { EVMBlockchainReader } from './helpers/EVMBlockchainReader';

import { EVMMailerV6Wrapper } from '../contract-wrappers/EVMMailerV6Wrapper';
import { EVMMailerV7Wrapper } from '../contract-wrappers/EVMMailerV7Wrapper';
import { EVMMailerV8Wrapper } from '../contract-wrappers/v8/EVMMailerV8Wrapper';
import { EVMMailerV9Wrapper } from '../contract-wrappers/v9';

import type { EVMPayV1Wrapper } from '../contract-wrappers/EVMPayV1Wrapper';
import { EVMRegistryV3Wrapper } from '../contract-wrappers/EVMRegistryV3Wrapper';
import { EVMRegistryV4Wrapper } from '../contract-wrappers/EVMRegistryV4Wrapper';
import { EVMRegistryV5Wrapper } from '../contract-wrappers/EVMRegistryV5Wrapper';
import { EVMRegistryV6Wrapper } from '../contract-wrappers/EVMRegistryV6Wrapper';
import { EVMMailerContractType } from '../misc';
import { EVM_CONTRACTS } from '../misc/contractConstants';
import { EVMFaucetService } from './EVMFaucetService';
import type { IYlideMailer } from '@ylide/ethereum-contracts';

export type NetworkSwitchHandler = (
	reason: string,
	currentNetwork: EVMNetwork | undefined,
	needNetwork: EVMNetwork,
	needChainId: number,
) => Promise<void>;

export class EVMWalletController extends AbstractWalletController {
	private readonly _isVerbose: boolean;

	readonly blockchainReader: EVMBlockchainReader;
	readonly signer: JsonRpcSigner;

	private readonly onNetworkSwitchRequest: NetworkSwitchHandler | undefined;

	private readonly _wallet: string;

	readonly mailers: {
		link: IEVMMailerContractLink;
		wrapper: EVMMailerV6Wrapper | EVMMailerV7Wrapper | EVMMailerV8Wrapper | EVMMailerV9Wrapper;
	}[] = [];
	readonly registries: {
		link: IEVMRegistryContractLink;
		wrapper: EVMRegistryV3Wrapper | EVMRegistryV4Wrapper | EVMRegistryV5Wrapper | EVMRegistryV6Wrapper;
	}[] = [];
	readonly payers: {
		link: IEVMYlidePayContractLink;
		wrapper: EVMPayV1Wrapper;
	}[] = [];

	private lastCurrentAccount: EVMWalletAccount | null = null;
	readonly providerObject: any;

	constructor(
		private readonly options: {
			dev?: boolean;
			endpoint?: string;
			wallet?: string;
			signer?: JsonRpcSigner;
			providerObject?: any;
			verbose?: boolean;
			faucet?: {
				registrar?: number;
				apiKey?: { type: 'server' | 'client'; key: string };
				host?: string;
			};
			onNetworkSwitchRequest?: NetworkSwitchHandler;
			onSwitchAccountRequest?: SwitchAccountCallback;
			strictMode?: boolean;
		} = {},
	) {
		super(options);

		this._isVerbose = options.verbose || false;

		if (!options || !options.wallet) {
			throw new Error('You have to pass valid wallet param to the options of EVMWalletController constructor');
		}

		if (!options || !options.signer) {
			throw new Error('You have to pass valid Signer param to the options of EVMWalletController constructor');
		}

		this.providerObject = options.providerObject || (window as any).ethereum;
		this.signer = options.signer;

		this._wallet = options.wallet;

		this.onSwitchAccountRequest = options?.onSwitchAccountRequest || null;

		if (options.strictMode && !options.onNetworkSwitchRequest) {
			throw new Error(
				'You have to pass valid onNetworkSwitchRequest param to the options of EVMWalletController constructor',
			);
		}

		this.onNetworkSwitchRequest = options.onNetworkSwitchRequest;

		this.blockchainReader = EVMBlockchainReader.createEVMBlockchainReader(this.blockchainGroup(), '', [
			{
				chainId: 0, // not user when provider is provided
				rpcUrlOrProvider: this.signer.provider,
				blockLimit: 500,
				latestNotSupported: true,
				batchNotSupported: true,
			},
		]);
	}

	private verboseLog(...args: any[]) {
		if (this._isVerbose) {
			console.log('[Y-SDK]', ...args);
		}
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

	private handleError(err: any) {
		console.error(`Error in EVMWalletController of "${this.wallet()}": `, err); // tslint:disable-line
	}

	blockchainGroup(): string {
		return 'evm';
	}

	wallet(): string {
		return this._wallet;
	}

	async init() {
		try {
			this.signer.provider.on('debug', (...args: any[]) => {
				if (this._isVerbose) {
					console.log('[Y-ETH-SDK] debug: ', args);
				}
			});

			const doneGetAuthAccount = this.verboseLogTick('getAuthenticatedAccount');
			await new Promise<void>((resolve, reject) => {
				let doubleTry = false;
				let firstTryDone = false;
				this.getAuthenticatedAccount()
					.then(account => {
						if (!doubleTry) {
							this.lastCurrentAccount = account;
							console.log('[Y-ETH-SDK] getAuthenticatedAccount done in the first try');
							firstTryDone = true;
							resolve();
						}
					})
					.catch(reject);
				setTimeout(() => {
					if (!firstTryDone) {
						doubleTry = true;
						this.getAuthenticatedAccount()
							.then(account => {
								this.lastCurrentAccount = account;
								console.log('[Y-ETH-SDK] getAuthenticatedAccount done in the second try');
								resolve();
							})
							.catch(reject);
					}
				}, 1000);
			});
			doneGetAuthAccount();

			if (this.providerObject) {
				this.providerObject.on('accountsChanged', (data: string[]) => {
					console.log('accountsChanged', data);
					if (data.length && !this.lastCurrentAccount) {
						this.lastCurrentAccount = new EVMWalletAccount(
							this.blockchainGroup(),
							this.wallet(),
							data[0].toString().toLowerCase(),
							null,
						);
						this.emit(WalletEvent.LOGIN, this.lastCurrentAccount);
					} else if (!data.length && this.lastCurrentAccount) {
						this.lastCurrentAccount = null;
						this.emit(WalletEvent.LOGOUT);
					} else if (data.length && this.lastCurrentAccount) {
						this.lastCurrentAccount = new EVMWalletAccount(
							this.blockchainGroup(),
							this.wallet(),
							data[0].toString().toLowerCase(),
							null,
						);
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
		wrapper: EVMRegistryV3Wrapper | EVMRegistryV4Wrapper | EVMRegistryV5Wrapper | EVMRegistryV6Wrapper;
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
			const wrapper = new EVMBlockchainController.registryWrappers[link.type](this.blockchainReader);
			this.registries.push({
				link,
				wrapper,
			});
			return { link, wrapper };
		}
	}

	private getMailerByNetwork(network: EVMNetwork): {
		link: IEVMMailerContractLink;
		wrapper: EVMMailerV6Wrapper | EVMMailerV7Wrapper | EVMMailerV8Wrapper | EVMMailerV9Wrapper;
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
			const wrapper = new EVMBlockchainController.mailerWrappers[link.type](this.blockchainReader);
			this.mailers.push({
				link,
				wrapper,
			});
			return { link, wrapper };
		}
	}

	private getPayerByMailerLinkAndNetwork(
		mailerLink: IEVMMailerContractLink,
		network: EVMNetwork,
	): {
		link: IEVMYlidePayContractLink;
		wrapper: EVMPayV1Wrapper;
	} {
		const existing = this.payers.find(r => r.link.id === mailerLink.pay?.id);
		if (existing) {
			return existing;
		} else {
			const link = EVM_CONTRACTS[network].payContracts?.find(r => r.id === mailerLink.pay?.id);
			if (!link) {
				throw new Error(`Network ${network} has no current pay contract`);
			}
			const wrapper = new EVMBlockchainController.payWrappers[link.type](this.blockchainReader);
			this.payers.push({
				link,
				wrapper,
			});
			return { link, wrapper };
		}
	}

	async setBonucer(network: EVMNetwork, from: string, newBonucer: string, val: boolean) {
		const registry = this.getRegistryByNetwork(network);
		if (registry.wrapper instanceof EVMRegistryV3Wrapper || registry.wrapper instanceof EVMRegistryV4Wrapper) {
			throw new YlideError(YlideErrorType.NOT_IMPLEMENTED, 'Registry V3/V4 does not support bonucers', {
				method: 'setBonucer',
			});
		}
		if (val) {
			return await registry.wrapper.addBonucer(registry.link, this.signer, from, newBonucer);
		} else {
			return await registry.wrapper.removeBonucer(registry.link, this.signer, from, newBonucer);
		}
	}

	async setMailingFeedFees(network: EVMNetwork, from: string, feedId: Uint256, recipientFee: BigNumber) {
		const mailer = this.getMailerByNetwork(network);
		if (!(mailer.wrapper instanceof EVMMailerV8Wrapper || mailer.wrapper instanceof EVMMailerV9Wrapper)) {
			throw new YlideError(YlideErrorType.NOT_IMPLEMENTED, 'Mailer V6/V7 does not support mailingFeedFees', {
				method: 'setMailingFeedFees',
			});
		}
		return await mailer.wrapper.mailing.setMailingFeedFees(mailer.link, this.signer, from, feedId, {
			recipientFee,
		});
	}

	async setBroadcastFeedFees(network: EVMNetwork, from: string, feedId: Uint256, broadcastFee: BigNumber) {
		const mailer = this.getMailerByNetwork(network);
		if (!(mailer.wrapper instanceof EVMMailerV8Wrapper || mailer.wrapper instanceof EVMMailerV9Wrapper)) {
			throw new YlideError(YlideErrorType.NOT_IMPLEMENTED, 'Mailer V6/V7 does not support broadcastFeedFees', {
				method: 'setBroadcastFeedFees',
			});
		}
		return await mailer.wrapper.broadcast.setBroadcastFeedFees(mailer.link, this.signer, from, feedId, {
			broadcastFee,
		});
	}

	async setBonuses(network: EVMNetwork, from: string, _newcomerBonus: string, _referrerBonus: string) {
		const registry = this.getRegistryByNetwork(network);
		if (registry.wrapper instanceof EVMRegistryV3Wrapper) {
			throw new YlideError(YlideErrorType.NOT_IMPLEMENTED, 'Registry V3 does not support bonuses', {
				method: 'setBonuses',
			});
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
			if (this.options.strictMode) {
				throw new Error(`Please, pass network param in options in order to execute this request`);
			} else {
				options = {
					...(options || {}),
					network: await this.getCurrentNetwork(),
				};
			}
		}
		if (!options.network) {
			throw new Error('Network is not defined');
		}
		const { network: expectedNetwork } = options;
		const network = await this.getCurrentNetwork();
		if (expectedNetwork !== network && this.onNetworkSwitchRequest) {
			await this.onNetworkSwitchRequest(reason, network, expectedNetwork, EVM_CHAINS[network]);
		}
		const newNetwork = await this.getCurrentNetwork();
		if (expectedNetwork !== newNetwork) {
			throw new Error('Sorry, but you have to switch to the appropriate network before executing this operation');
		}
		return newNetwork;
	}

	private async ensureAccount(needAccount: EVMWalletAccount) {
		let me = await this.getAuthenticatedAccount();
		if (!me || me.address !== needAccount.address) {
			await this.switchAccountRequest(me, needAccount);
			me = await this.getAuthenticatedAccount();
		}
		if (!me || me.address !== needAccount.address) {
			throw new YlideError(YlideErrorType.ACCOUNT_UNREACHABLE, 'Wrong account selected in wallet', {
				currentAccount: me,
				needAccount,
			});
		}
	}

	async signString(
		account: EVMWalletAccount,
		message: string,
	): Promise<{ message: string; r: string; s: string; v: number }> {
		await this.ensureAccount(account);
		const signature = await this.signer.signMessage(message);
		const { r, s, v } = ethers.utils.splitSignature(signature);
		return { message, r, s, v };
	}

	async signMagicString(account: EVMWalletAccount, magicString: string): Promise<Uint8Array> {
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
	async getAuthenticatedAccount(): Promise<EVMWalletAccount | null> {
		const accounts: string[] = await this.signer.provider.listAccounts();
		if (accounts.length) {
			this.lastCurrentAccount = new EVMWalletAccount(
				this.blockchainGroup(),
				this.wallet(),
				accounts[0].toString().toLowerCase(),
				null,
			);
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
		me: EVMWalletAccount,
		publicKey: Uint8Array,
		keyVersion: YlideKeyVersion = YlideKeyVersion.KEY_V2,
		registrar: number = ServiceCode.SDK,
		options?: { network?: EVMNetwork; value?: BigNumber },
	) {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Attach public key', options);
		const registry = this.getRegistryByNetwork(network);
		return void (await registry.wrapper.attachPublicKey(
			registry.link,
			this.signer,
			me.address,
			new PublicKey(PublicKeyType.YLIDE, keyVersion, publicKey),
			registrar,
		));
	}

	async requestAuthentication(): Promise<null | EVMWalletAccount> {
		const accounts: string[] = await this.signer.provider.send('eth_requestAccounts', []);
		if (accounts.length) {
			this.lastCurrentAccount = new EVMWalletAccount(
				this.blockchainGroup(),
				this.wallet(),
				accounts[0].toString().toLowerCase(),
				null,
			);
			return this.lastCurrentAccount;
		} else {
			throw new Error('Not authenticated');
		}
	}

	isMultipleAccountsSupported() {
		return true;
	}

	async disconnectAccount(account: EVMWalletAccount): Promise<void> {
		//
	}

	async sendMail(
		me: EVMWalletAccount,
		feedId: Uint256,
		contentData: Uint8Array,
		recipients: { address: Uint256; messageKey: MessageKey }[],
		options?: { network?: EVMNetwork; value?: BigNumber },
		generateSignature?: GenerateSignatureCallback,
		payments?: YlidePayment,
	): Promise<SendingProcess> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Publish message', options);
		const mailer = this.getMailerByNetwork(network);

		const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
		const chunkSize = EVM_CHUNK_SIZES[network];
		const chunks = MessageChunks.splitMessageChunks(contentData, chunkSize);

		const builder = new SendingProcessBuilder<
			| {
					type: 'transaction';
					subtype: 'push' | 'content' | 'both';
					tx: ethers.ContractTransaction;
			  }
			| { type: 'signature'; subtype: 'push' | 'content' | 'both' }
		>();

		if (
			chunks.length === 1 &&
			recipients.length === 1 &&
			!(mailer.wrapper instanceof EVMMailerV8Wrapper) &&
			!(mailer.wrapper instanceof EVMMailerV9Wrapper)
		) {
			if (feedId !== YLIDE_MAIN_FEED_ID) {
				throw new Error('FeedId is not supported');
			}
			console.log(`Sending small mail, chunk length: ${chunks[0].length} bytes`);
			builder.chain(
				'transaction',
				'both',
				{
					wrapper: mailer.wrapper,
					link: mailer.link,
					signer: this.signer,
					from: me.address,
					uniqueId,
					recipient: recipients[0].address,
					messageKey: recipients[0].messageKey.toBytes(),
					chunk: chunks[0],
				},
				async data => {
					return data.wrapper.sendSmallMail(
						data.link,
						data.signer,
						data.from,
						data.uniqueId,
						data.recipient,
						data.messageKey,
						data.chunk,
					);
				},
				async tx => {
					return { type: 'transaction', subtype: 'both', tx };
				},
			);
		} else if (chunks.length === 1 && recipients.length < Math.ceil((15.5 * 1024 - chunks[0].byteLength) / 70)) {
			if (mailer.wrapper instanceof EVMMailerV8Wrapper || mailer.wrapper instanceof EVMMailerV9Wrapper) {
				// let msgs: IEVMMessage[] = [];
				if (generateSignature && payments && mailer.wrapper instanceof EVMMailerV9Wrapper) {
					if (payments.kind === TokenAttachmentContractType.Pay) {
						console.log('Signing message for bulk mail with token (Pay)');
						const boxedSignatureArgs: {
							signatureArgs: IYlideMailer.SignatureArgsStruct | null;
						} = { signatureArgs: null };
						builder.chain(
							'signature',
							'both',
							uniqueId,
							async _uniqueId => {
								return generateSignature(_uniqueId);
							},
							async _signatureArgs => {
								boxedSignatureArgs.signatureArgs = _signatureArgs;
								return { type: 'signature', subtype: 'both', tx: null };
							},
						);
						// const signatureArgs = await generateSignature(uniqueId);
						const payer = this.getPayerByMailerLinkAndNetwork(mailer.link, network);
						console.log(`Sending bulk mail with token (Pay), chunk length: ${chunks[0].length} bytes`);
						builder.chain(
							'transaction',
							'both',
							{
								wrapper: payer.wrapper,
								link: mailer.link,
								contract: mailer.wrapper.cache.getContract(mailer.link.address, this.signer),
								payer: payer.link,
								signer: this.signer,
								from: me.address,
								feedId,
								uniqueId,
								recipientAddresses: recipients.map(r => r.address),
								recipientMessageKeys: recipients.map(r => r.messageKey.toBytes()),
								chunk: chunks[0],
								value: options?.value || BigNumber.from(0),
								boxedSignatureArgs,
								paymentArgs: payments.args,
							},
							async data => {
								return await data.wrapper.sendBulkMailWithToken(
									data.link,
									data.contract,
									data.payer,
									data.signer,
									data.from,
									data.feedId,
									data.uniqueId,
									data.recipientAddresses,
									data.recipientMessageKeys,
									data.chunk,
									data.value,
									data.boxedSignatureArgs.signatureArgs!,
									data.paymentArgs,
								);
							},
							async tx => {
								return { type: 'transaction', subtype: 'both', tx };
							},
						);
						// const { messages } = await payer.wrapper.sendBulkMailWithToken(
						// 	mailer.link,
						// 	mailer.wrapper.cache.getContract(mailer.link.address, this.signer),
						// 	payer.link,
						// 	this.signer,
						// 	me.address,
						// 	feedId,
						// 	uniqueId,
						// 	recipients.map(r => r.address),
						// 	recipients.map(r => r.messageKey.toBytes()),
						// 	chunks[0],
						// 	options?.value || BigNumber.from(0),
						// 	signatureArgs,
						// 	payments.args,
						// );
						// msgs = messages;
					}
					throw new Error('Unsupported payment type');
				} else {
					console.log(`Sending bulk mail, chunk length: ${chunks[0].length} bytes`);
					builder.chain(
						'transaction',
						'both',
						{
							wrapper: mailer.wrapper,
							link: mailer.link,
							signer: this.signer,
							from: me.address,
							feedId,
							uniqueId,
							recipientAddresses: recipients.map(r => r.address),
							recipientMessageKeys: recipients.map(r => r.messageKey.toBytes()),
							chunk: chunks[0],
							value: options?.value || BigNumber.from(0),
						},
						async data => {
							return await data.wrapper.mailing.sendBulkMail(
								data.link,
								data.signer,
								data.from,
								data.feedId,
								data.uniqueId,
								data.recipientAddresses,
								data.recipientMessageKeys,
								data.chunk,
								data.value,
							);
						},
						async tx => {
							return { type: 'transaction', subtype: 'both', tx };
						},
					);
					// const { messages } = await mailer.wrapper.mailing.sendBulkMail(
					// 	mailer.link,
					// 	this.signer,
					// 	me.address,
					// 	feedId,
					// 	uniqueId,
					// 	recipients.map(r => r.address),
					// 	recipients.map(r => r.messageKey.toBytes()),
					// 	chunks[0],
					// 	options?.value || BigNumber.from(0),
					// );
					// msgs = messages;
				}
				// return { pushes: msgs.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
			} else {
				if (feedId !== YLIDE_MAIN_FEED_ID) {
					throw new Error('FeedId is not supported');
				}
				console.log(`Sending bulk mail, chunk length: ${chunks[0].length} bytes`);
				builder.chain(
					'transaction',
					'both',
					{
						wrapper: mailer.wrapper,
						link: mailer.link,
						signer: this.signer,
						from: me.address,
						uniqueId,
						recipientAddresses: recipients.map(r => r.address),
						recipientMessageKeys: recipients.map(r => r.messageKey.toBytes()),
						chunk: chunks[0],
					},
					async data => {
						return data.wrapper.sendBulkMail(
							data.link,
							data.signer,
							data.from,
							data.uniqueId,
							data.recipientAddresses,
							data.recipientMessageKeys,
							data.chunk,
						);
					},
					async tx => {
						return { type: 'transaction', subtype: 'both', tx };
					},
				);
				// const { messages } = await mailer.wrapper.sendBulkMail(
				// 	mailer.link,
				// 	this.signer,
				// 	me.address,
				// 	uniqueId,
				// 	recipients.map(r => r.address),
				// 	recipients.map(r => r.messageKey.toBytes()),
				// 	chunks[0],
				// );
				// return { pushes: messages.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
			}
		} else {
			if (mailer.wrapper instanceof EVMMailerV8Wrapper || mailer.wrapper instanceof EVMMailerV9Wrapper) {
				const firstBlockNumber = await this.signer.provider.getBlockNumber();
				const blockLock = 600;
				// const msgId = await mailer.buildHash(me.address, uniqueId, firstBlockNumber);
				for (let i = 0; i < chunks.length; i++) {
					console.log(`Sending multi mail, current chunk length: ${chunks[i].length} bytes`);
					builder.chain(
						'transaction',
						'content',
						{
							wrapper: mailer.wrapper,
							link: mailer.link,
							signer: this.signer,
							from: me.address,
							uniqueId,
							firstBlockNumber,
							blockLock,
							chunkCount: chunks.length,
							chunkIndex: i,
							chunk: chunks[i],
							value: options?.value || BigNumber.from(0),
						},
						async data => {
							return await data.wrapper.content.sendMessageContentPart(
								data.link,
								data.signer,
								data.from,
								data.uniqueId,
								data.firstBlockNumber,
								data.blockLock,
								data.chunkCount,
								data.chunkIndex,
								data.chunk,
								data.value,
							);
						},
						async tx => {
							return { type: 'transaction', subtype: 'content', tx };
						},
					);
					// const { tx, receipt, logs } = await mailer.wrapper.content.sendMessageContentPart(
					// 	mailer.link,
					// 	this.signer,
					// 	me.address,
					// 	uniqueId,
					// 	firstBlockNumber,
					// 	blockLock,
					// 	chunks.length,
					// 	i,
					// 	chunks[i],
					// 	options?.value || BigNumber.from(0),
					// );
				}
				// const msgs: IEVMMessage[] = [];
				if (generateSignature && payments && mailer.wrapper instanceof EVMMailerV9Wrapper) {
					if (payments.kind === TokenAttachmentContractType.Pay) {
						for (let i = 0; i < recipients.length; i += 210) {
							const recs = recipients.slice(i, i + 210);
							const paymentArgs = payments.args.slice(i, i + 210);
							const boxedSignatureArgs: {
								signatureArgs: IYlideMailer.SignatureArgsStruct | null;
							} = { signatureArgs: null };
							builder.chain(
								'signature',
								'both',
								{
									uniqueId,
									firstBlockNumber,
									chunkCount: chunks.length,
									blockLock,
									recipientAddresses: recs.map(r => r.address),
									messageKeysConcat: ethers.utils.concat(recs.map(r => r.messageKey.toBytes())),
								},
								async data => {
									return generateSignature(
										data.uniqueId,
										data.firstBlockNumber,
										data.chunkCount,
										data.blockLock,
										data.recipientAddresses,
										data.messageKeysConcat,
									);
								},
								async _signatureArgs => {
									boxedSignatureArgs.signatureArgs = _signatureArgs;
									return { type: 'signature', subtype: 'both', tx: null };
								},
							);
							// const signatureArgs = await generateSignature(
							// 	uniqueId,
							// 	firstBlockNumber,
							// 	chunks.length,
							// 	blockLock,
							// 	recs.map(r => `0x${r.address}`),
							// 	ethers.utils.concat(recs.map(r => r.messageKey.toBytes())),
							// );
							const payer = this.getPayerByMailerLinkAndNetwork(mailer.link, network);
							console.log(`Sending bulk mail with token (Pay), chunk length: ${chunks[0].length} bytes`);
							builder.chain(
								'transaction',
								'push',
								{
									wrapper: payer.wrapper,
									link: mailer.link,
									contract: mailer.wrapper.cache.getContract(mailer.link.address, this.signer),
									payer: payer.link,
									signer: this.signer,
									from: me.address,
									feedId,
									uniqueId,
									firstBlockNumber,
									chunkCount: chunks.length,
									blockLock,
									recipientAddresses: recs.map(r => r.address),
									recipientMessageKeys: recs.map(r => r.messageKey.toBytes()),
									value: options?.value || BigNumber.from(0),
									boxedSignatureArgs,
									paymentArgs,
								},
								async data => {
									return data.wrapper.addMailRecipientsWithToken(
										data.link,
										data.contract,
										data.payer,
										data.signer,
										data.from,
										data.feedId,
										data.uniqueId,
										data.firstBlockNumber,
										data.chunkCount,
										data.blockLock,
										data.recipientAddresses,
										data.recipientMessageKeys,
										data.value,
										data.boxedSignatureArgs.signatureArgs!,
										data.paymentArgs,
									);
								},
								async tx => {
									return { type: 'transaction', subtype: 'push', tx };
								},
							);
							// const { messages } = await payer.wrapper.addMailRecipientsWithToken(
							// 	mailer.link,
							// 	mailer.wrapper.cache.getContract(mailer.link.address, this.signer),
							// 	payer.link,
							// 	this.signer,
							// 	me.address,
							// 	feedId,
							// 	uniqueId,
							// 	firstBlockNumber,
							// 	chunks.length,
							// 	blockLock,
							// 	recs.map(r => r.address),
							// 	recs.map(r => r.messageKey.toBytes()),
							// 	options?.value || BigNumber.from(0),
							// 	signatureArgs,
							// 	paymentArgs,
							// );
							// msgs.push(...messages);
						}
					}
					throw new Error('Unsupported payment type');
				} else {
					for (let i = 0; i < recipients.length; i += 210) {
						const recs = recipients.slice(i, i + 210);
						builder.chain(
							'transaction',
							'push',
							{
								wrapper: mailer.wrapper,
								link: mailer.link,
								signer: this.signer,
								from: me.address,
								feedId,
								uniqueId,
								firstBlockNumber,
								chunkCount: chunks.length,
								blockLock,
								recipientAddresses: recs.map(r => r.address),
								recipientMessageKeys: recs.map(r => r.messageKey.toBytes()),
								value: options?.value || BigNumber.from(0),
							},
							async data => {
								return data.wrapper.mailing.addMailRecipients(
									data.link,
									data.signer,
									data.from,
									data.feedId,
									data.uniqueId,
									data.firstBlockNumber,
									data.chunkCount,
									data.blockLock,
									data.recipientAddresses,
									data.recipientMessageKeys,
									data.value,
								);
							},
							async tx => {
								return { type: 'transaction', subtype: 'push', tx };
							},
						);
						// const { messages } = await mailer.wrapper.mailing.addMailRecipients(
						// 	mailer.link,
						// 	this.signer,
						// 	me.address,
						// 	feedId,
						// 	uniqueId,
						// 	firstBlockNumber,
						// 	chunks.length,
						// 	blockLock,
						// 	recs.map(r => r.address),
						// 	recs.map(r => r.messageKey.toBytes()),
						// 	options?.value || BigNumber.from(0),
						// );
						// msgs.push(...messages);
					}
				}

				// return { pushes: msgs.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
			} else {
				const initTime = Math.floor(Date.now() / 1000) - 60;

				for (let i = 0; i < chunks.length; i++) {
					console.log(`Sending multi mail, current chunk length: ${chunks[i].length} bytes`);
					builder.chain(
						'transaction',
						'content',
						{
							wrapper: mailer.wrapper,
							link: mailer.link,
							signer: this.signer,
							from: me.address,
							uniqueId,
							initTime,
							chunkCount: chunks.length,
							chunkIndex: i,
							chunk: chunks[i],
						},
						async data => {
							return await data.wrapper.sendMessageContentPart(
								data.link,
								data.signer,
								data.from,
								data.uniqueId,
								data.initTime,
								data.chunkCount,
								data.chunkIndex,
								data.chunk,
							);
						},
						async tx => {
							return { type: 'transaction', subtype: 'content', tx };
						},
					);
					// await mailer.wrapper.sendMessageContentPart(
					// 	mailer.link,
					// 	this.signer,
					// 	me.address,
					// 	uniqueId,
					// 	initTime,
					// 	chunks.length,
					// 	i,
					// 	chunks[i],
					// );
				}
				const msgs: IEVMMessage[] = [];
				for (let i = 0; i < recipients.length; i += 210) {
					const recs = recipients.slice(i, i + 210);
					builder.chain(
						'transaction',
						'push',
						{
							wrapper: mailer.wrapper,
							link: mailer.link,
							signer: this.signer,
							from: me.address,
							uniqueId,
							initTime,
							recipientAddresses: recs.map(r => r.address),
							recipientMessageKeys: recs.map(r => r.messageKey.toBytes()),
						},
						async data => {
							return await data.wrapper.addMailRecipients(
								data.link,
								data.signer,
								data.from,
								data.uniqueId,
								data.initTime,
								data.recipientAddresses,
								data.recipientMessageKeys,
							);
						},
						async tx => {
							return { type: 'transaction', subtype: 'push', tx };
						},
					);
					// const { messages } = await mailer.wrapper.addMailRecipients(
					// 	mailer.link,
					// 	this.signer,
					// 	me.address,
					// 	uniqueId,
					// 	initTime,
					// 	recs.map(r => r.address),
					// 	recs.map(r => r.messageKey.toBytes()),
					// );
					// msgs.push(...messages);
				}

				// return { pushes: msgs.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
			}
		}

		const sendingProcess = builder.compile(
			results => {
				const txs = results.filter(result => result.type === 'transaction') as {
					type: 'transaction';
					subtype: 'push' | 'content' | 'both';
					tx: ethers.ContractTransaction;
				}[];

				return txs.map(result => ({ type: result.subtype, hash: result.tx.hash }));
			},
			async results => {
				return { contentId: '', pushes: [] };
			},
		);

		return sendingProcess;
	}

	async sendBroadcast(
		from: EVMWalletAccount,
		feedId: Uint256,
		contentData: Uint8Array,
		options?: {
			network?: EVMNetwork;
			value?: BigNumber;
			isPersonal?: boolean;
			isGenericFeed?: boolean;
			extraPayment?: BigNumber;
		},
	): Promise<SendingProcess> {
		await this.ensureAccount(from);
		const network = await this.ensureNetworkOptions('Broadcast message', options);
		const mailer = this.getMailerByNetwork(network);

		const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
		const chunks = MessageChunks.splitMessageChunks(contentData);

		if (!(mailer.wrapper instanceof EVMMailerV8Wrapper) && !(mailer.wrapper instanceof EVMMailerV9Wrapper)) {
			throw new Error('Broadcasts are supported only in MailerV8');
		}

		const builder = new SendingProcessBuilder<{
			type: 'transaction';
			subtype: 'push' | 'content' | 'both';
			tx: ethers.ContractTransaction;
		}>();

		if (chunks.length === 1) {
			if (mailer.wrapper instanceof EVMMailerV8Wrapper) {
				builder.chain(
					'transaction',
					'both',
					{
						wrapper: mailer.wrapper,
						link: mailer.link,
						signer: this.signer,
						from: from.address,
						isPersonal: options?.isPersonal || false,
						feedId,
						uniqueId,
						chunk: chunks[0],
						value: options?.value || BigNumber.from(0),
					},
					async data => {
						return await data.wrapper.broadcast.sendBroadcast(
							data.link,
							data.signer,
							data.from,
							data.isPersonal,
							data.feedId,
							data.uniqueId,
							data.chunk,
							data.value,
						);
					},
					async tx => {
						return { type: 'transaction', subtype: 'both', tx };
					},
				);
				// await mailer.wrapper.broadcast.sendBroadcast(
				// 	mailer.link,
				// 	this.signer,
				// 	from.address,
				// 	options?.isPersonal || false,
				// 	feedId,
				// 	uniqueId,
				// 	chunks[0],
				// 	options?.value || BigNumber.from(0),
				// );
			} else {
				builder.chain(
					'transaction',
					'both',
					{
						wrapper: mailer.wrapper,
						link: mailer.link,
						signer: this.signer,
						from: from.address,
						isPersonal: options?.isPersonal || false,
						isGenericFeed: options?.isGenericFeed || false,
						extraPayment: options?.extraPayment || BigNumber.from(0),
						feedId,
						uniqueId,
						chunk: chunks[0],
						value: options?.value || BigNumber.from(0),
					},
					async data => {
						return await data.wrapper.broadcast.sendBroadcast(
							data.link,
							data.signer,
							data.from,
							data.isPersonal,
							data.isGenericFeed,
							data.extraPayment,
							data.feedId,
							data.uniqueId,
							data.chunk,
							data.value,
						);
					},
					async tx => {
						return { type: 'transaction', subtype: 'both', tx };
					},
				);
				// await mailer.wrapper.broadcast.sendBroadcast(
				// 	mailer.link,
				// 	this.signer,
				// 	from.address,
				// 	options?.isPersonal || false,
				// 	options?.isGenericFeed || false,
				// 	options?.extraPayment || BigNumber.from(0),
				// 	feedId,
				// 	uniqueId,
				// 	chunks[0],
				// 	options?.value || BigNumber.from(0),
				// );
			}

			// return { pushes: messages.map(msg => ({ push: msg })) };
		} else {
			const firstBlockNumber = await this.signer.provider.getBlockNumber();
			const blockLock = 600;
			for (let i = 0; i < chunks.length; i++) {
				builder.chain(
					'transaction',
					'content',
					{
						wrapper: mailer.wrapper,
						link: mailer.link,
						signer: this.signer,
						from: from.address,
						uniqueId,
						firstBlockNumber,
						blockLock,
						chunkCount: chunks.length,
						chunkIndex: i,
						chunk: chunks[i],
						value: options?.value || BigNumber.from(0),
					},
					async data => {
						return await data.wrapper.content.sendMessageContentPart(
							data.link,
							data.signer,
							data.from,
							data.uniqueId,
							data.firstBlockNumber,
							data.blockLock,
							data.chunkCount,
							data.chunkIndex,
							data.chunk,
							data.value,
						);
					},
					async tx => {
						return { type: 'transaction', subtype: 'content', tx };
					},
				);
				// await mailer.wrapper.content.sendMessageContentPart(
				// 	mailer.link,
				// 	this.signer,
				// 	from.address,
				// 	uniqueId,
				// 	firstBlockNumber,
				// 	blockLock,
				// 	chunks.length,
				// 	i,
				// 	chunks[i],
				// 	options?.value || BigNumber.from(0),
				// );
			}
			if (mailer.wrapper instanceof EVMMailerV8Wrapper) {
				builder.chain(
					'transaction',
					'push',
					{
						wrapper: mailer.wrapper,
						link: mailer.link,
						signer: this.signer,
						from: from.address,
						isPersonal: options?.isPersonal || false,
						feedId,
						uniqueId,
						firstBlockNumber,
						chunkCount: chunks.length,
						blockLock,
						value: options?.value || BigNumber.from(0),
					},
					async data => {
						return await data.wrapper.broadcast.sendBroadcastHeader(
							data.link,
							data.signer,
							data.from,
							data.isPersonal,
							data.feedId,
							data.uniqueId,
							data.firstBlockNumber,
							data.chunkCount,
							data.blockLock,
							data.value,
						);
					},
					async tx => {
						return { type: 'transaction', subtype: 'push', tx };
					},
				);
				// await mailer.wrapper.broadcast.sendBroadcastHeader(
				// 	mailer.link,
				// 	this.signer,
				// 	from.address,
				// 	options?.isPersonal || false,
				// 	feedId,
				// 	uniqueId,
				// 	firstBlockNumber,
				// 	chunks.length,
				// 	blockLock,
				// 	options?.value || BigNumber.from(0),
				// );
			} else {
				builder.chain(
					'transaction',
					'push',
					{
						wrapper: mailer.wrapper,
						link: mailer.link,
						signer: this.signer,
						from: from.address,
						isPersonal: options?.isPersonal || false,
						isGenericFeed: options?.isGenericFeed || false,
						extraPayment: options?.extraPayment || BigNumber.from(0),
						feedId,
						uniqueId,
						firstBlockNumber,
						chunkCount: chunks.length,
						blockLock,
						value: options?.value || BigNumber.from(0),
					},
					async data => {
						return await data.wrapper.broadcast.sendBroadcastHeader(
							data.link,
							data.signer,
							data.from,
							data.isPersonal,
							data.isGenericFeed,
							data.extraPayment,
							data.feedId,
							data.uniqueId,
							data.firstBlockNumber,
							data.chunkCount,
							data.blockLock,
							data.value,
						);
					},
					async tx => {
						return { type: 'transaction', subtype: 'push', tx };
					},
				);
				// await mailer.wrapper.broadcast.sendBroadcastHeader(
				// 	mailer.link,
				// 	this.signer,
				// 	from.address,
				// 	options?.isPersonal || false,
				// 	options?.isGenericFeed || false,
				// 	options?.extraPayment || BigNumber.from(0),
				// 	feedId,
				// 	uniqueId,
				// 	firstBlockNumber,
				// 	chunks.length,
				// 	blockLock,
				// 	options?.value || BigNumber.from(0),
				// );
			}

			// return { pushes: messages.map(msg => ({ push: msg })) };
		}

		const sendingProcess = builder.compile(
			results => {
				const txs = results.filter(result => result.type === 'transaction') as {
					type: 'transaction';
					subtype: 'push' | 'content' | 'both';
					tx: ethers.ContractTransaction;
				}[];

				return txs.map(result => ({ type: result.subtype, hash: result.tx.hash }));
			},
			async results => {
				return { contentId: '', pushes: [] };
			},
		);

		return sendingProcess;
	}

	async signBulkMail(
		from: EVMWalletAccount,
		signer: ethers.providers.JsonRpcSigner,
		feedId: Uint256,
		uniqueId: number,
		recipients: Uint256[],
		keys: Uint8Array[],
		content: Uint8Array,
		deadline: number,
		nonce: number,
		contractAddress: string,
		contractType: ContractType,
		options?: { network?: EVMNetwork; value?: BigNumber },
	) {
		await this.ensureAccount(from);
		const network = await this.ensureNetworkOptions('Sign bulk mail', options);
		const mailer = this.getMailerByNetwork(network);
		if (mailer.link.type === EVMMailerContractType.EVMMailerV9 && mailer.wrapper instanceof EVMMailerV9Wrapper) {
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
				contractAddress,
				contractType,
			);
		}
		throw new Error('Delegated call signatures are only supported in MailerV9');
	}

	async signAddMailRecipients(
		from: EVMWalletAccount,
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
		contractAddress: string,
		contractType: ContractType,
		options?: { network?: EVMNetwork; value?: BigNumber },
	) {
		await this.ensureAccount(from);
		const network = await this.ensureNetworkOptions('Sign add mail recipients', options);
		const mailer = this.getMailerByNetwork(network);
		if (mailer.link.type === EVMMailerContractType.EVMMailerV9 && mailer.wrapper instanceof EVMMailerV9Wrapper) {
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
				contractAddress,
				contractType,
			);
		}
		throw new Error('Delegated call signatures are only supported in MailerV9');
	}

	decryptMessageKey(
		recipientAccount: EVMWalletAccount,
		senderPublicKey: EncryptionPublicKey,
		encryptedKey: Uint8Array,
	): Promise<Uint8Array> {
		throw new Error('Native decryption is unavailable in EVM.');
	}

	isFaucetAvailable(): boolean {
		return true;
	}

	async getFaucet(options?: {
		faucetType: EVMNetwork.GNOSIS | EVMNetwork.FANTOM | EVMNetwork.POLYGON;
	}): Promise<AbstractFaucetService> {
		return new EVMFaucetService(this, options?.faucetType || EVMNetwork.GNOSIS, this.options.faucet);
	}

	// Deployments:

	async deployRegistryV3(
		me: EVMWalletAccount,
		previousContractAddress = '0x0000000000000000000000000000000000000000',
		options?: { network?: EVMNetwork; value?: BigNumber },
	): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV3', options);
		return await EVMRegistryV3Wrapper.deploy(this.signer, me.address, previousContractAddress);
	}

	async deployRegistryV4(
		me: EVMWalletAccount,
		previousContractAddress = '0x0000000000000000000000000000000000000000',
		options?: { network?: EVMNetwork; value?: BigNumber },
	): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV4', options);
		return await EVMRegistryV4Wrapper.deploy(this.signer, me.address, previousContractAddress);
	}

	async deployRegistryV5(
		me: EVMWalletAccount,
		previousContractAddress = '0x0000000000000000000000000000000000000000',
		options?: { network?: EVMNetwork; value?: BigNumber },
	): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV5', options);
		return await EVMRegistryV5Wrapper.deploy(this.signer, me.address, previousContractAddress);
	}

	async deployRegistryV6(
		me: EVMWalletAccount,
		options?: { network?: EVMNetwork; value?: BigNumber },
	): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy RegistryV6', options);
		return await EVMRegistryV6Wrapper.deploy(this.signer, me.address);
	}

	async deployMailerV6(me: EVMWalletAccount, options?: { network?: EVMNetwork; value?: BigNumber }): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy MailerV6', options);
		return await EVMMailerV6Wrapper.deploy(this.signer, me.address);
	}

	async deployMailerV7(me: EVMWalletAccount, options?: { network?: EVMNetwork; value?: BigNumber }): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy MailerV7', options);
		return await EVMMailerV7Wrapper.deploy(this.signer, me.address);
	}

	async deployMailerV8(me: EVMWalletAccount, options?: { network?: EVMNetwork; value?: BigNumber }): Promise<string> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Deploy MailerV8', options);
		return await EVMMailerV8Wrapper.deploy(this.signer, me.address);
	}

	async deployMailerV9(me: EVMWalletAccount, options?: { network?: EVMNetwork; value?: BigNumber }): Promise<string> {
		await this.ensureAccount(me);
		await this.ensureNetworkOptions('Deploy MailerV9', options);
		return await EVMMailerV9Wrapper.deploy(this.signer, me.address);
	}
}

const getWalletFactory = (
	wallet: string,
	isWalletAvailable: () => Promise<boolean>,
	provider: (options?: any) => Promise<ethers.Signer>,
	providerObject: () => Promise<any>,
): WalletControllerFactory => {
	return {
		create: async (options?: any) =>
			new EVMWalletController(
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
	frontier: getWalletFactory(
		'frontier',
		async () => !!(window as any).frontier?.ethereum,
		async () => new Web3Provider((window as any).frontier.ethereum, 'any').getSigner(),
		async () => (window as any).frontier.ethereum,
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
			(((window as any).ethereum.isMetaMask && !(window as any).ethereum.isFrontier) ||
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
