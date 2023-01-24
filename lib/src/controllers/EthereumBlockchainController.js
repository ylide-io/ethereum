"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumBlockchainController = void 0;
const sdk_1 = require("@ylide/sdk");
const misc_1 = require("../misc");
const EthereumBlockchainReader_1 = require("./blockchain-helpers/EthereumBlockchainReader");
const EthereumContentReader_1 = require("./blockchain-helpers/EthereumContentReader");
const EthereumHistoryReader_1 = require("./blockchain-helpers/EthereumHistoryReader");
const EthereumMailerV8Reader_1 = require("./blockchain-helpers/EthereumMailerV8Reader");
const EthereumRegistryV5Reader_1 = require("./blockchain-helpers/EthereumRegistryV5Reader");
class EthereumBlockchainController extends sdk_1.AbstractBlockchainController {
    options;
    blockchainReader;
    historyReader;
    contentReader;
    mailerV8Reader;
    registryV5Reader;
    network;
    chainId;
    mailerV8;
    registryV5;
    constructor(options = {}) {
        super(options);
        this.options = options;
        if (options.network === undefined) {
            throw new Error('You must provide network for EVM controller');
        }
        this.network = options.network;
        this.chainId = misc_1.EVM_CHAINS[options.network];
        this.blockchainReader = EthereumBlockchainReader_1.EthereumBlockchainReader.createEthereumBlockchainReader(options.web3Readers ||
            misc_1.EVM_RPCS[options.network].map(rpc => ({
                rpcUrlOrProvider: rpc.rpc,
                blockLimit: rpc.blockLimit || 1000,
                latestNotSupported: rpc.lastestNotSupported,
                batchNotSupported: rpc.batchNotSupported,
            })));
        this.mailerV8Reader = new EthereumMailerV8Reader_1.EthereumMailerV8Reader(this.blockchainReader);
        this.registryV5Reader = new EthereumRegistryV5Reader_1.EthereumRegistryV5Reader(this.blockchainReader);
        this.mailerV8 = {
            address: options.mailerContractAddress || misc_1.EVM_CONTRACTS[this.network].mailer.address,
            creationBlock: misc_1.EVM_CONTRACTS[this.network].mailer.fromBlock || 0,
        };
        this.registryV5 = {
            address: options.registryContractAddress || misc_1.EVM_CONTRACTS[this.network].registry.address,
            creationBlock: misc_1.EVM_CONTRACTS[this.network].registry.fromBlock || 0,
        };
        this.historyReader = new EthereumHistoryReader_1.EthereumHistoryReader(this.blockchainReader, this.mailerV8Reader, this.registryV5Reader);
        this.contentReader = new EthereumContentReader_1.EthereumContentReader(this.blockchainReader, this.mailerV8Reader);
    }
    blockchain() {
        return misc_1.EVM_NAMES[this.network];
    }
    blockchainGroup() {
        return 'evm';
    }
    async init() {
        // no-op
    }
    // private tryGetNameService(): EthereumNameService | null {
    // 	return EVM_ENS[this.network] ? new EthereumNameService(this, EVM_ENS[this.network]!) : null;
    // }
    defaultNameService() {
        throw new Error('Method not implemented.');
    }
    isReadingBySenderAvailable() {
        return false;
    }
    isAddressValid(address) {
        return this.blockchainReader.isAddressValid(address);
    }
    addressToUint256(address) {
        const lowerAddress = address.toLowerCase();
        const cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
        return (0, sdk_1.hexToUint256)(''.padStart(24, '0') + cleanHexAddress);
    }
    getRecipientReadingRules(address) {
        throw new Error('Method not implemented.');
    }
    async retrieveMessageHistoryDesc(sender, recipient, fromMessage, toMessage, limit) {
        return await this.historyReader.retrieveMessageHistoryDesc(this.mailerV8, sender, recipient, fromMessage, toMessage, limit);
    }
    async retrieveBroadcastHistoryDesc(sender, fromMessage, toMessage, limit) {
        return await this.historyReader.retrieveBroadcastHistoryDesc(this.mailerV8, sender, fromMessage, toMessage, limit);
    }
    retrieveMessageContentByMessageHeader(msg) {
        return this.contentReader.retrieveAndVerifyMessageContent(this.mailerV8, msg);
    }
    extractPublicKeyFromAddress(address) {
        return this.registryV5Reader.getPublicKeyByAddress(this.registryV5, address);
    }
    getBalance(address) {
        return this.blockchainReader.getBalance(address);
    }
    async getExtraEncryptionStrategiesFromAddress(address) {
        return [];
    }
    getSupportedExtraEncryptionStrategies() {
        return [];
    }
    prepareExtraEncryptionStrategyBulk(entries) {
        throw new Error('No native strategies supported for Ethereum');
    }
    executeExtraEncryptionStrategy(entries, bulk, addedPublicKeyIndex, messageKey) {
        throw new Error('No native strategies supported for Ethereum');
    }
    compareMessagesTime(a, b) {
        if (a.createdAt === b.createdAt) {
            return (a.$$blockchainMetaDontUseThisField.event.logIndex - b.$$blockchainMetaDontUseThisField.event.logIndex);
        }
        else {
            return a.createdAt - b.createdAt;
        }
    }
}
exports.EthereumBlockchainController = EthereumBlockchainController;
//# sourceMappingURL=EthereumBlockchainController.js.map