"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumMailerV8Reader = void 0;
const ethereum_contracts_1 = require("@ylide/ethereum-contracts");
const BlockNumberRingBufferIndex_1 = require("../misc/BlockNumberRingBufferIndex");
class EthereumMailerV8Reader {
    blockchainReader;
    mailerContractCache = {};
    constructor(blockchainReader) {
        this.blockchainReader = blockchainReader;
        //
    }
    getMailerContract(address, provider) {
        if (!this.mailerContractCache[address] || !this.mailerContractCache[address].has(provider)) {
            const contract = ethereum_contracts_1.YlideMailerV8__factory.connect(address, provider);
            if (!this.mailerContractCache[address]) {
                this.mailerContractCache[address] = new Map();
            }
            this.mailerContractCache[address].set(provider, contract);
            return contract;
        }
        else {
            return this.mailerContractCache[address].get(provider);
        }
    }
    async contractOperation(mailer, callback) {
        return await this.blockchainReader.retryableOperation(async (provider, blockLimit, latestNotSupported, batchNotSupported, stopTrying) => {
            const contract = this.getMailerContract(mailer.address, provider);
            return await callback(contract, provider, blockLimit, latestNotSupported, batchNotSupported, stopTrying);
        });
    }
    async getRecipientToPushIndex(mailer, recipient) {
        return await this.contractOperation(mailer, async (contract) => {
            const [bn] = await contract.functions.recipientToPushIndex(recipient);
            const index = bn.toHexString().replace('0x', '').padStart(64, '0');
            return BlockNumberRingBufferIndex_1.BlockNumberRingBufferIndex.decodeIndexValue(index);
        });
    }
    async getRecipientMessagesCount(mailer, recipient) {
        return await this.contractOperation(mailer, async (contract) => {
            const [bn] = await contract.functions.recipientMessagesCount(recipient);
            return bn.toNumber();
        });
    }
    async getSenderToBroadcastIndex(mailer, sender) {
        return await this.contractOperation(mailer, async (contract) => {
            const [bn] = await contract.functions.senderToBroadcastIndex(sender);
            const index = bn.toHexString().replace('0x', '').padStart(64, '0');
            return BlockNumberRingBufferIndex_1.BlockNumberRingBufferIndex.decodeIndexValue(index);
        });
    }
    async getSenderMessagesCount(mailer, sender) {
        return await this.contractOperation(mailer, async (contract) => {
            const [bn] = await contract.functions.broadcastMessagesCount(sender);
            return bn.toNumber();
        });
    }
    async getMessageContentEvents(mailer, msgId, fromBlock, toBlock) {
        return await this.contractOperation(mailer, async (contract) => {
            return await contract.queryFilter(contract.filters.MailContent('0x' + msgId), fromBlock, toBlock);
        });
    }
    async getMessagePushEvents(mailer, recipient, sender, fromBlock, toBlock) {
        return await this.contractOperation(mailer, async (contract) => {
            return await contract.queryFilter(contract.filters.MailPush(recipient ? `0x${recipient}` : null, sender), fromBlock, toBlock);
        });
    }
}
exports.EthereumMailerV8Reader = EthereumMailerV8Reader;
//# sourceMappingURL=EthereumMailerV8Reader.js.map