"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ethereumWalletFactory = exports.EthereumWalletController = void 0;
const sdk_1 = require("@ylide/sdk");
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
class EthereumWalletController extends sdk_1.AbstractWalletController {
    blockchainController;
    constructor(blockchainController, options = {}) {
        super(blockchainController, options);
        this.blockchainController = blockchainController;
    }
    async signMagicString(magicString) {
        const me = await this.getAuthenticatedAccount();
        if (!me) {
            throw new Error(`Can't derive without auth`);
        }
        const result = await this.blockchainController.writeWeb3.eth.personal.sign(magicString, me.address, 'null');
        return (0, sdk_1.sha256)(smart_buffer_1.default.ofHexString(result).bytes);
    }
    // account block
    async getAuthenticatedAccount() {
        const accounts = await this.blockchainController.writeWeb3.eth.getAccounts();
        if (accounts.length) {
            return {
                blockchain: 'ethereum',
                address: accounts[0].toString(),
                publicKey: null,
            };
        }
        else {
            return null;
        }
    }
    async attachPublicKey(publicKey) {
        const me = await this.getAuthenticatedAccount();
        if (!me) {
            throw new Error('Not authorized');
        }
        await this.blockchainController.registryContract.attachPublicKey(me.address, publicKey);
    }
    async requestAuthentication() {
        const accounts = await this.blockchainController.writeWeb3.eth.requestAccounts();
        if (accounts.length) {
            return {
                blockchain: 'everscale',
                address: accounts[0].toString(),
                publicKey: null,
            };
        }
        else {
            throw new Error('Not authenticated');
        }
    }
    async disconnectAccount() {
        // await this.blockchainController.web3.eth.;
    }
    async publishMessage(me, contentData, recipients) {
        const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
        const chunks = sdk_1.MessageChunks.splitMessageChunks(contentData);
        if (chunks.length === 1 && recipients.length === 1) {
            const transaction = await this.blockchainController.mailerContract.sendSmallMail(me.address, uniqueId, recipients[0].address, recipients[0].messageKey.toBytes(), chunks[0]);
            // console.log('transaction: ', transaction);
            return (0, sdk_1.bigIntToUint256)(transaction.events.MailContent.returnValues.msgId);
        }
        else if (chunks.length === 1 && recipients.length < Math.ceil((15.5 * 1024 - chunks[0].byteLength) / 70)) {
            const transaction = await this.blockchainController.mailerContract.sendBulkMail(me.address, uniqueId, recipients.map(r => r.address), recipients.map(r => r.messageKey.toBytes()), chunks[0]);
            // console.log('transaction: ', transaction);
            return (0, sdk_1.bigIntToUint256)(transaction.events.MailContent.returnValues.msgId);
        }
        else {
            const initTime = Math.floor(Date.now() / 1000);
            const msgId = await this.blockchainController.mailerContract.buildHash(me.address, uniqueId, initTime);
            for (let i = 0; i < chunks.length; i++) {
                await this.blockchainController.mailerContract.sendMultipartMailPart(me.address, uniqueId, initTime, chunks.length, i, chunks[i]);
            }
            for (let i = 0; i < recipients.length; i += 210) {
                const recs = recipients.slice(i, i + 210);
                await this.blockchainController.mailerContract.addRecipients(me.address, uniqueId, initTime, recs.map(r => r.address), recs.map(r => r.messageKey.toBytes()));
            }
            return msgId;
        }
    }
    async broadcastMessage(me, contentData) {
        const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
        const chunks = sdk_1.MessageChunks.splitMessageChunks(contentData);
        if (chunks.length === 1) {
            const transaction = await this.blockchainController.mailerContract.broadcastMail(me.address, uniqueId, chunks[0]);
            return (0, sdk_1.bigIntToUint256)(transaction.events.MailBroadcast.returnValues.msgId);
        }
        else {
            const initTime = Math.floor(Date.now() / 1000);
            const msgId = await this.blockchainController.mailerContract.buildHash(me.address, uniqueId, initTime);
            for (let i = 0; i < chunks.length; i++) {
                await this.blockchainController.mailerContract.sendMultipartMailPart(me.address, uniqueId, initTime, chunks.length, i, chunks[i]);
            }
            await this.blockchainController.mailerContract.broadcastMailHeader(me.address, uniqueId, initTime);
            return msgId;
        }
    }
    decryptMessageKey(senderPublicKey, recipientAccount, encryptedKey) {
        throw new Error('Native decryption is unavailable in Ethereum.');
    }
}
exports.EthereumWalletController = EthereumWalletController;
exports.ethereumWalletFactory = {
    create: (options) => new EthereumWalletController(options),
    // @ts-ignore
    isWalletAvailable: async () => !!(window['ethereum'] || window['web3']),
    blockchain: 'ethereum',
    wallet: 'web3',
};
//# sourceMappingURL=EthereumWalletController.js.map