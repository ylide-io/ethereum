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
} from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { EthereumBlockchainController } from '.';

export class EthereumWalletController extends AbstractWalletController {
	constructor(
		public readonly blockchainController: EthereumBlockchainController,
		options: {
			dev?: boolean;
			mailerContractAddress?: string;
			registryContractAddress?: string;
			endpoint?: string;
		} = {},
	) {
		super(blockchainController, options);
	}

	async signMagicString(magicString: string): Promise<Uint8Array> {
		const me = await this.getAuthenticatedAccount();
		if (!me) {
			throw new Error(`Can't derive without auth`);
		}
		const result = await this.blockchainController.writeWeb3.eth.personal.sign(magicString, me.address, 'null');
		return sha256(SmartBuffer.ofHexString(result).bytes);
	}

	// account block
	async getAuthenticatedAccount(): Promise<IGenericAccount | null> {
		const accounts: string[] = await this.blockchainController.writeWeb3.eth.getAccounts();
		if (accounts.length) {
			return {
				blockchain: 'ethereum',
				address: accounts[0].toString(),
				publicKey: null,
			};
		} else {
			return null;
		}
	}

	async attachPublicKey(publicKey: Uint8Array) {
		const me = await this.getAuthenticatedAccount();
		if (!me) {
			throw new Error('Not authorized');
		}
		await this.blockchainController.registryContract.attachPublicKey(me.address, publicKey);
	}

	async requestAuthentication(): Promise<null | IGenericAccount> {
		const accounts: string[] = await this.blockchainController.writeWeb3.eth.requestAccounts();
		if (accounts.length) {
			return {
				blockchain: 'everscale',
				address: accounts[0].toString(),
				publicKey: null,
			};
		} else {
			throw new Error('Not authenticated');
		}
	}

	async disconnectAccount(): Promise<void> {
		// await this.blockchainController.web3.eth.;
	}

	async publishMessage(
		me: IGenericAccount,
		contentData: Uint8Array,
		recipients: { address: Uint256; messageKey: MessageKey }[],
	): Promise<Uint256 | null> {
		const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
		const chunks = MessageChunks.splitMessageChunks(contentData);
		if (chunks.length === 1 && recipients.length === 1) {
			const transaction = await this.blockchainController.mailerContract.sendSmallMail(
				me.address,
				uniqueId,
				recipients[0].address,
				recipients[0].messageKey.toBytes(),
				chunks[0],
			);
			// console.log('transaction: ', transaction);
			return bigIntToUint256(transaction.events.MailContent.returnValues.msgId);
		} else if (chunks.length === 1 && recipients.length < Math.ceil((15.5 * 1024 - chunks[0].byteLength) / 70)) {
			const transaction = await this.blockchainController.mailerContract.sendBulkMail(
				me.address,
				uniqueId,
				recipients.map(r => r.address),
				recipients.map(r => r.messageKey.toBytes()),
				chunks[0],
			);
			// console.log('transaction: ', transaction);
			return bigIntToUint256(transaction.events.MailContent.returnValues.msgId);
		} else {
			const initTime = Math.floor(Date.now() / 1000);
			const msgId = await this.blockchainController.mailerContract.buildHash(me.address, uniqueId, initTime);
			for (let i = 0; i < chunks.length; i++) {
				await this.blockchainController.mailerContract.sendMultipartMailPart(
					me.address,
					uniqueId,
					initTime,
					chunks.length,
					i,
					chunks[i],
				);
			}
			for (let i = 0; i < recipients.length; i += 210) {
				const recs = recipients.slice(i, i + 210);
				await this.blockchainController.mailerContract.addRecipients(
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

	async broadcastMessage(me: IGenericAccount, contentData: Uint8Array): Promise<Uint256 | null> {
		const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
		const chunks = MessageChunks.splitMessageChunks(contentData);
		if (chunks.length === 1) {
			const transaction = await this.blockchainController.mailerContract.broadcastMail(
				me.address,
				uniqueId,
				chunks[0],
			);
			return bigIntToUint256(transaction.events.MailBroadcast.returnValues.msgId);
		} else {
			const initTime = Math.floor(Date.now() / 1000);
			const msgId = await this.blockchainController.mailerContract.buildHash(me.address, uniqueId, initTime);
			for (let i = 0; i < chunks.length; i++) {
				await this.blockchainController.mailerContract.sendMultipartMailPart(
					me.address,
					uniqueId,
					initTime,
					chunks.length,
					i,
					chunks[i],
				);
			}
			await this.blockchainController.mailerContract.broadcastMailHeader(me.address, uniqueId, initTime);
			return msgId;
		}
	}

	decryptMessageKey(
		senderPublicKey: PublicKey,
		recipientAccount: IGenericAccount,
		encryptedKey: Uint8Array,
	): Promise<Uint8Array> {
		throw new Error('Native decryption is unavailable in Ethereum.');
	}
}

export const ethereumWalletFactory: WalletControllerFactory = {
	create: (options?: any) => new EthereumWalletController(options),
	// @ts-ignore
	isWalletAvailable: async () => !!(window['ethereum'] || window['web3']),
	blockchain: 'ethereum',
	wallet: 'web3',
};
