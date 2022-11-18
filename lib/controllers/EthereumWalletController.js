"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evmWalletFactories = exports.EthereumWalletController = void 0;
const sdk_1 = require("@ylide/sdk");
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
const web3_1 = __importDefault(require("web3"));
const contracts_1 = require("../contracts");
const misc_1 = require("../misc");
class EthereumWalletController extends sdk_1.AbstractWalletController {
    writeWeb3;
    defaultMailerContract;
    defaultRegistryContract;
    mailerContractAddress;
    registryContractAddress;
    onNetworkSwitchRequest;
    _wallet;
    lastCurrentAccount = null;
    providerObject;
    constructor(options = {}) {
        super(options);
        if (!options || !options.wallet) {
            throw new Error('You have to pass valid wallet param to the options of EthereumWalletController constructor');
        }
        this.providerObject = options.providerObject || window.ethereum;
        this._wallet = options.wallet;
        this.onSwitchAccountRequest = options?.onSwitchAccountRequest || null;
        if (!options || !options.onNetworkSwitchRequest) {
            throw new Error('You have to pass valid onNetworkSwitchRequest param to the options of EthereumWalletController constructor');
        }
        this.onNetworkSwitchRequest = options.onNetworkSwitchRequest;
        // @ts-ignore
        window.ethWallet = this;
        this.writeWeb3 = new web3_1.default(options?.writeWeb3Provider || web3_1.default.givenProvider);
        this.mailerContractAddress = options.mailerContractAddress;
        this.registryContractAddress = options.registryContractAddress;
        if (this.mailerContractAddress) {
            this.defaultMailerContract = new contracts_1.MailerContract(this.writeWeb3, this.mailerContractAddress);
        }
        if (this.registryContractAddress) {
            this.defaultRegistryContract = new contracts_1.RegistryContract(this.writeWeb3, this.registryContractAddress);
        }
    }
    handleError(err) {
        console.error(`Error in EthereumWalletController of "${this.wallet()}": `, err); // tslint:disable-line
    }
    blockchainGroup() {
        return 'evm';
    }
    wallet() {
        return this._wallet;
    }
    async init() {
        try {
            this.lastCurrentAccount = await this.getAuthenticatedAccount();
            if (this.providerObject) {
                this.providerObject.on('accountsChanged', (data) => {
                    if (data.length && !this.lastCurrentAccount) {
                        this.lastCurrentAccount = {
                            blockchain: 'evm',
                            address: data[0].toString().toLowerCase(),
                            publicKey: null,
                        };
                        this.emit(sdk_1.WalletEvent.LOGIN, this.lastCurrentAccount);
                    }
                    else if (!data.length && this.lastCurrentAccount) {
                        this.lastCurrentAccount = null;
                        this.emit(sdk_1.WalletEvent.LOGOUT);
                    }
                    else if (data.length && this.lastCurrentAccount) {
                        this.lastCurrentAccount = {
                            blockchain: 'evm',
                            address: data[0].toString().toLowerCase(),
                            publicKey: null,
                        };
                        this.emit(sdk_1.WalletEvent.ACCOUNT_CHANGED, this.lastCurrentAccount);
                    }
                });
                this.providerObject.on('chainChanged', (chainId) => {
                    const evmNetwork = misc_1.EVM_CHAIN_ID_TO_NETWORK[Number(BigInt(chainId).toString(10))];
                    this.emit(sdk_1.WalletEvent.BLOCKCHAIN_CHANGED, misc_1.EVM_NAMES[evmNetwork] || chainId);
                });
            }
        }
        catch (err) {
            this.handleError(err);
            throw err;
        }
    }
    async deployMailer() {
        const newInstance = new this.writeWeb3.eth.Contract(contracts_1.MAILER_ABI.abi);
        const tx = await newInstance
            .deploy({
            data: contracts_1.MAILER_ABI.bytecode,
        })
            .send({
            from: (await this.getAuthenticatedAccount()).address,
        });
        console.log('contract address: ', tx.options.address); // tslint:disable-line
    }
    async deployRegistry() {
        const newInstance = new this.writeWeb3.eth.Contract(contracts_1.REGISTRY_ABI.abi);
        const tx = await newInstance
            .deploy({
            data: contracts_1.REGISTRY_ABI.bytecode,
        })
            .send({
            from: (await this.getAuthenticatedAccount()).address,
        });
        console.log('contract address: ', tx.options.address); // tslint:disable-line
    }
    async ensureAccount(needAccount) {
        let me = await this.getAuthenticatedAccount();
        if (!me || me.address !== needAccount.address) {
            await this.switchAccountRequest(me, needAccount);
            me = await this.getAuthenticatedAccount();
        }
        if (!me || me.address !== needAccount.address) {
            throw new sdk_1.YlideError(sdk_1.YlideErrorType.ACCOUNT_UNREACHABLE, { currentAccount: me, needAccount });
        }
    }
    async requestYlidePrivateKey(me) {
        throw new Error('Method not available.');
    }
    async signMagicString(account, magicString) {
        await this.ensureAccount(account);
        const result = await this.writeWeb3.eth.personal.sign(magicString, account.address, 'null');
        return (0, sdk_1.sha256)(smart_buffer_1.default.ofHexString(result).bytes);
    }
    addressToUint256(address) {
        const lowerAddress = address.toLowerCase();
        const cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
        return (0, sdk_1.hexToUint256)(''.padStart(24, '0') + cleanHexAddress);
    }
    // account block
    async getAuthenticatedAccount() {
        const accounts = await this.writeWeb3.eth.getAccounts();
        if (accounts.length) {
            this.lastCurrentAccount = {
                blockchain: 'evm',
                address: accounts[0].toString().toLowerCase(),
                publicKey: null,
            };
            return this.lastCurrentAccount;
        }
        else {
            this.lastCurrentAccount = null;
            return null;
        }
    }
    async getCurrentChainId() {
        return await this.writeWeb3.eth.net.getId();
    }
    async getCurrentNetwork() {
        const chainId = await this.getCurrentChainId();
        const res = misc_1.EVM_CHAIN_ID_TO_NETWORK[chainId];
        if (res === undefined) {
            throw new Error(`ChainID ${chainId} is not supported.`);
        }
        return res;
    }
    async getCurrentBlockchain() {
        return misc_1.EVM_NAMES[await this.getCurrentNetwork()];
    }
    async ensureNetworkOptions(reason, options) {
        if (!options || !misc_1.EVM_CONTRACTS[options.network]) {
            throw new Error(`Please, pass network param in options in order to execute this request`);
        }
        const { network: expectedNetwork } = options;
        const network = await this.getCurrentNetwork();
        if (expectedNetwork !== network) {
            await this.onNetworkSwitchRequest(reason, network, expectedNetwork, misc_1.EVM_CHAINS[network]);
        }
        const newNetwork = await this.getCurrentNetwork();
        if (expectedNetwork !== newNetwork) {
            throw new Error('Sorry, but you have to switch to the appropriate network before executing this operation');
        }
        return newNetwork;
    }
    async deployRegistryV3(previousContractAddress) {
        const me = await this.getAuthenticatedAccount();
        const address = await contracts_1.RegistryContract.deployContract(this.writeWeb3, me.address, previousContractAddress);
        return address;
    }
    async deployMailerV6() {
        const me = await this.getAuthenticatedAccount();
        const address = await contracts_1.MailerContract.deployContract(this.writeWeb3, me.address);
        return address;
    }
    async attachPublicKey(me, publicKey, options) {
        await this.ensureAccount(me);
        if (this.defaultRegistryContract) {
            await this.defaultRegistryContract.attachPublicKey(me.address, publicKey, 2);
            return;
        }
        const network = await this.ensureNetworkOptions('Attach public key', options);
        const registryContract = new contracts_1.RegistryContract(this.writeWeb3, misc_1.EVM_CONTRACTS[network].registry.address);
        await registryContract.attachPublicKey(me.address, publicKey, 2);
    }
    async requestAuthentication() {
        const accounts = await this.writeWeb3.eth.requestAccounts();
        if (accounts.length) {
            this.lastCurrentAccount = {
                blockchain: 'evm',
                address: accounts[0].toString().toLowerCase(),
                publicKey: null,
            };
            return this.lastCurrentAccount;
        }
        else {
            throw new Error('Not authenticated');
        }
    }
    isMultipleAccountsSupported() {
        return true;
    }
    async disconnectAccount(account) {
        //
    }
    async publishMessage(me, contentData, recipients, options) {
        await this.ensureAccount(me);
        const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
        const chunks = sdk_1.MessageChunks.splitMessageChunks(contentData);
        let mailer = this.defaultMailerContract;
        if (!mailer) {
            const network = await this.ensureNetworkOptions('Publish message', options);
            mailer = new contracts_1.MailerContract(this.writeWeb3, misc_1.EVM_CONTRACTS[network].mailer.address);
        }
        if (chunks.length === 1 && recipients.length === 1) {
            const transaction = await mailer.sendSmallMail(me.address, uniqueId, recipients[0].address, recipients[0].messageKey.toBytes(), chunks[0]);
            return (0, sdk_1.bigIntToUint256)(transaction.events.MailContent.returnValues.msgId);
        }
        else if (chunks.length === 1 && recipients.length < Math.ceil((15.5 * 1024 - chunks[0].byteLength) / 70)) {
            const transaction = await mailer.sendBulkMail(me.address, uniqueId, recipients.map(r => r.address), recipients.map(r => r.messageKey.toBytes()), chunks[0]);
            return (0, sdk_1.bigIntToUint256)(transaction.events.MailContent.returnValues.msgId);
        }
        else {
            const initTime = Math.floor(Date.now() / 1000);
            const msgId = await mailer.buildHash(me.address, uniqueId, initTime);
            for (let i = 0; i < chunks.length; i++) {
                await mailer.sendMultipartMailPart(me.address, uniqueId, initTime, chunks.length, i, chunks[i]);
            }
            for (let i = 0; i < recipients.length; i += 210) {
                const recs = recipients.slice(i, i + 210);
                await mailer.addRecipients(me.address, uniqueId, initTime, recs.map(r => r.address), recs.map(r => r.messageKey.toBytes()));
            }
            return msgId;
        }
    }
    async broadcastMessage(me, contentData, options) {
        await this.ensureAccount(me);
        const uniqueId = Math.floor(Math.random() * 4 * 10 ** 9);
        const chunks = sdk_1.MessageChunks.splitMessageChunks(contentData);
        let mailer = this.defaultMailerContract;
        if (!mailer) {
            const network = await this.ensureNetworkOptions('Broadcast message', options);
            mailer = new contracts_1.MailerContract(this.writeWeb3, misc_1.EVM_CONTRACTS[network].mailer.address);
        }
        if (chunks.length === 1) {
            const transaction = await mailer.broadcastMail(me.address, uniqueId, chunks[0]);
            return (0, sdk_1.bigIntToUint256)(transaction.events.MailContent.returnValues.msgId);
        }
        else {
            const initTime = Math.floor(Date.now() / 1000);
            const msgId = await mailer.buildHash(me.address, uniqueId, initTime);
            for (let i = 0; i < chunks.length; i++) {
                await mailer.sendMultipartMailPart(me.address, uniqueId, initTime, chunks.length, i, chunks[i]);
            }
            await mailer.broadcastMailHeader(me.address, uniqueId, initTime);
            return msgId;
        }
    }
    decryptMessageKey(recipientAccount, senderPublicKey, encryptedKey) {
        throw new Error('Native decryption is unavailable in Ethereum.');
    }
}
exports.EthereumWalletController = EthereumWalletController;
// export const ethereumWalletFactory: WalletControllerFactory = {
// 	create: async (options?: any) => new EthereumWalletController(options),
// 	// @ts-ignore
// 	isWalletAvailable: async () => !!(window['ethereum'] || window['web3']), // tslint:disable-line
// 	blockchainGroup: 'evm',
// 	wallet: 'web3',
// };
function getWalletFactory(wallet, isWalletAvailable, provider, providerObject) {
    return {
        create: async (options) => new EthereumWalletController(Object.assign({
            wallet,
            writeWeb3Provider: await provider(options),
            providerObject: await providerObject(),
        }, options || {})),
        blockchainGroup: 'evm',
        wallet,
        isWalletAvailable,
    };
}
const wnd = window;
exports.evmWalletFactories = {
    binance: getWalletFactory('binance', async () => !!wnd.BinanceChain, async () => {
        return new web3_1.default(wnd.BinanceChain);
    }, async () => {
        return wnd.BinanceChain;
    }),
    coinbase: getWalletFactory('coinbase', async () => wnd.ethereum &&
        (wnd.ethereum.isCoinbaseWallet ||
            (wnd.ethereum.providers?.length && wnd.ethereum.providers.find((p) => p.isCoinbaseWallet))), async () => {
        if (wnd.ethereum.isCoinbaseWallet) {
            return new web3_1.default(wnd.ethereum);
        }
        else {
            return new web3_1.default(wnd.ethereum.providers.find((p) => p.isCoinbaseWallet));
        }
    }, async () => {
        if (wnd.ethereum.isCoinbaseWallet) {
            return wnd.ethereum;
        }
        else {
            return wnd.ethereum.providers.find((p) => p.isCoinbaseWallet);
        }
    }),
    trustwallet: getWalletFactory('trustwallet', async () => !!wnd.trustwallet, async () => new web3_1.default(wnd.trustwallet), async () => wnd.trustwallet),
    metamask: getWalletFactory('metamask', async () => wnd.ethereum &&
        (wnd.ethereum.isMetaMask ||
            (wnd.ethereum.providers?.length && wnd.ethereum.providers.find((p) => p.isMetaMask))), async () => {
        if (wnd.ethereum.providers?.length) {
            return new web3_1.default(wnd.ethereum.providers.find((p) => p.isMetaMask));
        }
        else {
            return new web3_1.default(wnd.ethereum);
        }
    }, async () => {
        if (wnd.ethereum.providers?.length) {
            return wnd.ethereum.providers.find((p) => p.isMetaMask);
        }
        else {
            return wnd.ethereum;
        }
    }),
    walletconnect: getWalletFactory('walletconnect', async () => true, async (options) => {
        return new web3_1.default(options.walletConnectProvider);
    }, async () => {
        return null;
    }),
};
//# sourceMappingURL=EthereumWalletController.js.map