import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
import {
	AbstractWalletController,
	IGenericAccount,
	MessageChunks,
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
import { BigNumber, BigNumberish, ethers } from 'ethers';

import { EVM_CHAINS, EVM_CHAIN_ID_TO_NETWORK, EVM_CHUNK_SIZES, EVM_NAMES } from '../misc/constants';
import {
	ContractType,
	EVMNetwork,
	IEVMMailerContractLink,
	IEVMMessage,
	IEVMRegistryContractLink,
	IEVMYlidePayContractLink,
	IEVMYlideSafeContractLink,
	Options,
	Recipient,
} from '../misc/types';
import { EthereumBlockchainController } from './EthereumBlockchainController';
import { EthereumBlockchainReader } from './helpers/EthereumBlockchainReader';

import { EthereumMailerV6Wrapper } from '../contract-wrappers/EthereumMailerV6Wrapper';
import { EthereumMailerV7Wrapper } from '../contract-wrappers/EthereumMailerV7Wrapper';
import { EthereumMailerV8Wrapper } from '../contract-wrappers/v8/EthereumMailerV8Wrapper';
import { EthereumMailerV9Wrapper } from '../contract-wrappers/v9';

import { EthereumPayV1Wrapper } from '../contract-wrappers/EthereumPayV1Wrapper';
import { EthereumRegistryV3Wrapper } from '../contract-wrappers/EthereumRegistryV3Wrapper';
import { EthereumRegistryV4Wrapper } from '../contract-wrappers/EthereumRegistryV4Wrapper';
import { EthereumRegistryV5Wrapper } from '../contract-wrappers/EthereumRegistryV5Wrapper';
import { EthereumRegistryV6Wrapper } from '../contract-wrappers/EthereumRegistryV6Wrapper';
import { EthereumSafeV1Wrapper } from '../contract-wrappers/EthereumSafeV1Wrapper.ts';
import {
	EVMContracts,
	MailerWrapper,
	formatRecipientsToObj,
	formatRecipientsToTuple,
	hexPrefix,
	processMailResponse,
} from '../misc';
import { EVM_CONTRACTS } from '../misc/contractConstants';

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
	readonly payers: {
		link: IEVMYlidePayContractLink;
		wrapper: EthereumPayV1Wrapper;
	}[] = [];
	readonly safes: {
		link: IEVMYlideSafeContractLink;
		wrapper: EthereumSafeV1Wrapper;
	}[] = [];

	private lastCurrentAccount: IGenericAccount | null = null;
	readonly providerObject: any;
	private readonly evmContractsTest: EVMContracts | null;

	constructor(options: {
		wallet: string;
		signer: JsonRpcSigner;
		onNetworkSwitchRequest: NetworkSwitchHandler;
		providerObject?: any;
		onSwitchAccountRequest?: SwitchAccountCallback;
		evmContractsTest?: EVMContracts;
	}) {
		super(options);

		this.providerObject = options.providerObject || (window as any).ethereum;
		this.signer = options.signer;

		this._wallet = options.wallet;

		this.onSwitchAccountRequest = options?.onSwitchAccountRequest || null;

		this.evmContractsTest = options.evmContractsTest || null;

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

	private evmContracts() {
		return this.evmContractsTest || EVM_CONTRACTS;
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
		const id = this.evmContracts()[network].currentRegistryId;
		const existing = this.registries.find(r => r.link.id === id);
		if (existing) {
			return existing;
		} else {
			const link = this.evmContracts()[network].registryContracts.find(r => r.id === id);
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
		const id = this.evmContracts()[network].currentMailerId;
		const existing = this.mailers.find(r => r.link.id === id);
		if (existing) {
			return existing;
		} else {
			const link = this.evmContracts()[network].mailerContracts.find(r => r.id === id);
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

	private getPayerByMailerLinkAndNetwork(
		mailerLink: IEVMMailerContractLink,
		network: EVMNetwork,
	): {
		link: IEVMYlidePayContractLink;
		wrapper: EthereumPayV1Wrapper;
	} {
		const existing = this.payers.find(r => r.link.id === mailerLink.pay?.id);
		if (existing) {
			return existing;
		} else {
			const link = this.evmContracts()[network].payContracts?.find(r => r.id === mailerLink.pay?.id);
			if (!link) {
				throw new Error(`Network ${network} has no current pay contract`);
			}
			const wrapper = new EthereumBlockchainController.payWrappers[link.type](this.blockchainReader);
			this.payers.push({
				link,
				wrapper,
			});
			return { link, wrapper };
		}
	}

	private getYlideSafeByMailerLinkAndNetwork(
		mailerLink: IEVMMailerContractLink,
		network: EVMNetwork,
	): {
		link: IEVMYlideSafeContractLink;
		wrapper: EthereumSafeV1Wrapper;
	} {
		const existing = this.safes.find(r => r.link.id === mailerLink.safe?.id);
		if (existing) {
			return existing;
		} else {
			const link = this.evmContracts()[network].safeContracts?.find(r => r.id === mailerLink.safe?.id);
			if (!link) {
				throw new Error(`Network ${network} has no current safe contract`);
			}
			const wrapper = new EthereumBlockchainController.safeWrappers[link.type](this.blockchainReader);
			this.safes.push({
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
		if (!options || typeof options.network === 'undefined' || !this.evmContracts()[options.network]) {
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
		recipients: Recipient[],
		options?: Options,
	): Promise<SendMailResult> {
		await this.ensureAccount(me);
		const network = await this.ensureNetworkOptions('Publish message', options);
		const { link, wrapper } = this.getMailerByNetwork(network);

		const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
		const chunkSize = EVM_CHUNK_SIZES[network];
		const chunks = MessageChunks.splitMessageChunks(contentData, chunkSize);
		const from = me.address;

		if (
			chunks.length === 1 &&
			recipients.length === 1 &&
			!(wrapper instanceof EthereumMailerV8Wrapper) &&
			!(wrapper instanceof EthereumMailerV9Wrapper)
		) {
			return this.#sendSmallMail({
				link,
				wrapper,
				feedId,
				chunks,
				uniqueId,
				from,
				recipients,
			});
		} else if (chunks.length === 1 && recipients.length < Math.ceil((15.5 * 1024 - chunks[0].byteLength) / 70)) {
			return this.#sendBulkMail({
				link,
				wrapper,
				feedId,
				chunks,
				uniqueId,
				from,
				recipients,
				network,
				options,
			});
		}
		return this.#sendLargeMail({
			link,
			wrapper,
			feedId,
			chunks,
			uniqueId,
			from,
			recipients,
			network,
			options,
		});
	}

	#sendSmallMail({
		link,
		wrapper,
		feedId,
		chunks,
		uniqueId,
		from,
		recipients,
	}: {
		link: IEVMMailerContractLink;
		wrapper: EthereumMailerV6Wrapper | EthereumMailerV7Wrapper;

		feedId: Uint256;
		chunks: Uint8Array[];
		uniqueId: number;
		from: string;
		recipients: Recipient[];
	}) {
		if (feedId !== YLIDE_MAIN_FEED_ID) {
			throw new Error('FeedId is not supported');
		}
		console.log(`Sending small mail, chunk length: ${chunks[0].length} bytes`);
		return processMailResponse(
			wrapper.sendSmallMail(
				link,
				this.signer,
				from,
				uniqueId,
				recipients[0].address,
				recipients[0].messageKey.toBytes(),
				chunks[0],
			),
		);
	}

	async #sendBulkMail({
		link,
		wrapper,
		feedId,
		chunks,
		uniqueId,
		from,
		recipients,
		options,
		network,
	}: {
		link: IEVMMailerContractLink;
		wrapper: MailerWrapper;
		feedId: Uint256;
		chunks: Uint8Array[];
		uniqueId: number;
		from: string;
		recipients: Recipient[];
		options?: Options;
		network: EVMNetwork;
	}) {
		if (wrapper instanceof EthereumMailerV9Wrapper) {
			const wrapperArgs = {
				mailer: link,
				signer: this.signer,
				from,
				value: options?.value || BigNumber.from(0),
			};
			const sendBulkArgs = {
				feedId: hexPrefix(feedId),
				uniqueId,
				content: chunks[0],
				...formatRecipientsToObj(recipients),
			};
			if (options?.supplement) {
				const [chainId, nonce] = await Promise.all([
					this.getCurrentChainId(),
					wrapper.mailing.getNonce(link, from),
				]);
				const ylideSignArgs = {
					mailer: link,
					nonce,
					chainId,
					deadline: options.supplement.deadline,
					signer: this.signer,
				};
				if (options.supplement.kind === ContractType.PAY) {
					console.log('Signing message');
					const payer = this.getPayerByMailerLinkAndNetwork(link, network);
					const signatureArgs = await wrapper.mailing.signBulkMail(ylideSignArgs, sendBulkArgs, {
						contractAddress: payer.link.address,
						contractType: options.supplement.kind,
					});
					console.log(`Sending bulk mail with token (Pay), chunk length: ${chunks[0].length} bytes`);
					return processMailResponse(
						payer.wrapper.sendBulkMailWithToken(
							wrapperArgs,
							sendBulkArgs,
							signatureArgs,
							wrapper,
							payer.link,
							options.supplement.data,
						),
					);
				} else if (options.supplement.kind === ContractType.SAFE) {
					console.log('Signing message');
					const ylideSafe = this.getYlideSafeByMailerLinkAndNetwork(link, network);
					const signatureArgs = await wrapper.mailing.signBulkMail(ylideSignArgs, sendBulkArgs, {
						contractAddress: ylideSafe.link.address,
						contractType: options.supplement.kind,
					});
					console.log(`Sending bulk mail as Safe, chunk length: ${chunks[0].length} bytes`);
					return processMailResponse(
						ylideSafe.wrapper.sendBulkMail(
							wrapperArgs,
							sendBulkArgs,
							signatureArgs,
							wrapper,
							ylideSafe.link,
							options.supplement.data,
						),
					);
				}
			}
			console.log(`Sending bulk mail, chunk length: ${chunks[0].length} bytes`);
			return processMailResponse(wrapper.mailing.sendBulkMail(wrapperArgs, sendBulkArgs));
		} else if (wrapper instanceof EthereumMailerV8Wrapper) {
			console.log(`Sending bulk mail, chunk length: ${chunks[0].length} bytes`);
			return processMailResponse(
				wrapper.mailing.sendBulkMail(
					link,
					this.signer,
					from,
					feedId,
					uniqueId,
					...formatRecipientsToTuple(recipients),
					chunks[0],
					options?.value || BigNumber.from(0),
				),
			);
		}
		if (feedId !== YLIDE_MAIN_FEED_ID) {
			throw new Error('FeedId is not supported');
		}
		console.log(`Sending bulk mail, chunk length: ${chunks[0].length} bytes`);
		return processMailResponse(
			wrapper.sendBulkMail(link, this.signer, from, uniqueId, ...formatRecipientsToTuple(recipients), chunks[0]),
		);
	}

	async #sendLargeMail({
		link,
		wrapper,
		feedId,
		chunks,
		uniqueId,
		from,
		recipients,
		options,
		network,
	}: {
		link: IEVMMailerContractLink;
		wrapper: MailerWrapper;
		feedId: Uint256;
		chunks: Uint8Array[];
		uniqueId: number;
		from: string;
		recipients: Recipient[];
		options?: Options;
		network: EVMNetwork;
	}) {
		const msgs: IEVMMessage[] = [];
		if (wrapper instanceof EthereumMailerV8Wrapper || wrapper instanceof EthereumMailerV9Wrapper) {
			const firstBlockNumber = await this.signer.provider.getBlockNumber();
			const blockCountLock = 600;
			for (let i = 0; i < chunks.length; i++) {
				console.log(`Sending multi mail, current chunk length: ${chunks[i].length} bytes`);
				await wrapper.content.sendMessageContentPart(
					link,
					this.signer,
					from,
					uniqueId,
					firstBlockNumber,
					blockCountLock,
					chunks.length,
					i,
					chunks[i],
					options?.value || BigNumber.from(0),
				);
			}
			if (wrapper instanceof EthereumMailerV9Wrapper) {
				const wrapperArgs = {
					mailer: link,
					signer: this.signer,
					from,
					value: options?.value || BigNumber.from(0),
				};
				const getAddMailRecipientsArgs = (rs: Recipient[]) => ({
					feedId: hexPrefix(feedId),
					uniqueId,
					firstBlockNumber,
					partsCount: chunks.length,
					blockCountLock,
					...formatRecipientsToObj(rs),
				});
				if (options?.supplement) {
					const chainId = await this.getCurrentChainId();
					const { deadline } = options.supplement;
					const getYlideSignArgs = (nonce: BigNumberish) => ({
						mailer: link,
						nonce,
						chainId,
						deadline,
						signer: this.signer,
					});
					if (options.supplement.kind === ContractType.PAY) {
						const payer = this.getPayerByMailerLinkAndNetwork(link, network);
						for (let i = 0; i < recipients.length; i += 210) {
							console.log('Signing message');
							const nonce = await wrapper.mailing.getNonce(link, from);
							const recs = recipients.slice(i, i + 210);
							const paymentArgs = options.supplement.data.slice(i, i + 210);
							const signatureArgs = await wrapper.mailing.signAddMailRecipients(
								getYlideSignArgs(nonce),
								getAddMailRecipientsArgs(recs),
								{
									contractAddress: payer.link.address,
									contractType: options.supplement.kind,
								},
							);
							console.log(
								`add mail recipients with token (Pay), chunk length: ${chunks[0].length} bytes`,
							);
							const { messages } = await payer.wrapper.addMailRecipientsWithToken(
								wrapperArgs,
								getAddMailRecipientsArgs(recs),
								signatureArgs,
								wrapper,
								payer.link,
								paymentArgs,
							);
							msgs.push(...messages);
						}
					} else if (options.supplement.kind === ContractType.SAFE) {
						const ylideSafe = this.getYlideSafeByMailerLinkAndNetwork(link, network);
						for (let i = 0; i < recipients.length; i += 210) {
							console.log('Signing message');
							const nonce = await wrapper.mailing.getNonce(link, from);
							const recs = recipients.slice(i, i + 210);
							const safeRecs = options.supplement.data.safeRecipients.slice(i, i + 210);
							const signatureArgs = await wrapper.mailing.signAddMailRecipients(
								getYlideSignArgs(nonce),
								getAddMailRecipientsArgs(recs),
								{
									contractAddress: ylideSafe.link.address,
									contractType: options.supplement.kind,
								},
							);
							console.log(`add mail recipients as Safe, chunk length: ${chunks[0].length} bytes`);
							const { messages } = await ylideSafe.wrapper.addMailRecipients(
								wrapperArgs,
								getAddMailRecipientsArgs(recs),
								signatureArgs,
								wrapper,
								ylideSafe.link,
								{
									safeSender: options.supplement.data.safeSender,
									safeRecipients: safeRecs,
								},
							);
							msgs.push(...messages);
						}
					}
				}
			} else {
				for (let i = 0; i < recipients.length; i += 210) {
					const recs = recipients.slice(i, i + 210);
					const { messages } = await wrapper.mailing.addMailRecipients(
						link,
						this.signer,
						from,
						feedId,
						uniqueId,
						firstBlockNumber,
						chunks.length,
						blockCountLock,
						...formatRecipientsToTuple(recs),
						options?.value || BigNumber.from(0),
					);
					msgs.push(...messages);
				}
			}

			return { pushes: msgs.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
		}

		const initTime = Math.floor(Date.now() / 1000) - 60;

		for (let i = 0; i < chunks.length; i++) {
			console.log(`Sending multi mail, current chunk length: ${chunks[i].length} bytes`);
			await wrapper.sendMessageContentPart(
				link,
				this.signer,
				from,
				uniqueId,
				initTime,
				chunks.length,
				i,
				chunks[i],
			);
		}
		for (let i = 0; i < recipients.length; i += 210) {
			const recs = recipients.slice(i, i + 210);
			const { messages } = await wrapper.addMailRecipients(
				link,
				this.signer,
				from,
				uniqueId,
				initTime,
				...formatRecipientsToTuple(recs),
			);
			msgs.push(...messages);
		}

		return { pushes: msgs.map(msg => ({ recipient: msg.recipientAddress, push: msg })) };
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

	async deployPayV1(me: IGenericAccount, options: { network: EVMNetwork }): Promise<string> {
		await this.ensureAccount(me);
		await this.ensureNetworkOptions('Deploy MailerV9', options);
		const mailer = this.getMailerByNetwork(options.network);
		if (mailer.wrapper instanceof EthereumMailerV9Wrapper) {
			return await EthereumPayV1Wrapper.deploy(this.signer, mailer.link.address);
		}
		throw new Error("Can't deploy PayV1 on this network");
	}

	async deploySafeV1(me: IGenericAccount, options: { network: EVMNetwork }): Promise<string> {
		await this.ensureAccount(me);
		await this.ensureNetworkOptions('Deploy MailerV9', options);
		const mailer = this.getMailerByNetwork(options.network);
		if (mailer.wrapper instanceof EthereumMailerV9Wrapper) {
			return await EthereumSafeV1Wrapper.deploy(this.signer, mailer.link.address);
		}
		throw new Error("Can't deploy SafeV1 on this network");
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
