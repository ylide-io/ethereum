"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumListSource = void 0;
const eventemitter3_1 = __importDefault(require("eventemitter3"));
const sdk_1 = require("@ylide/sdk");
/**
 * @internal
 */
class EthereumListSource extends eventemitter3_1.default {
    reader;
    subject;
    _pullCycle;
    limit;
    meta;
    pullTimer;
    lastMessage = null;
    lastBlockChecked = 0;
    constructor(reader, subject, _pullCycle = 120000, limit = 50, meta = null) {
        super();
        this.reader = reader;
        this.subject = subject;
        this._pullCycle = _pullCycle;
        this.limit = limit;
        this.meta = meta;
    }
    pause() {
        if (this.pullTimer) {
            this.pullTimer();
        }
    }
    resume(since) {
        this.lastMessage = since || null;
        this.lastBlockChecked = since ? since.$$blockchainMetaDontUseThisField.block.number : 0;
        if (!this.pullTimer) {
            this.pullTimer = (0, sdk_1.asyncTimer)(this.pull.bind(this), this._pullCycle);
        }
    }
    compare(a, b) {
        if (a.createdAt === b.createdAt) {
            return this.reader.compareMessagesTime(a, b);
        }
        else {
            return a.createdAt - b.createdAt;
        }
    }
    async getBefore(entry, limit) {
        if (this.subject.type === sdk_1.BlockchainSourceType.DIRECT) {
            return await this.reader.retrieveMessageHistoryByBounds(this.subject.sender, this.subject.recipient, undefined, entry, limit);
        }
        else {
            return await this.reader.retrieveBroadcastHistoryByBounds(this.subject.sender, undefined, entry, limit);
        }
    }
    async getAfter(entry, limit) {
        if (this.subject.type === sdk_1.BlockchainSourceType.DIRECT) {
            return await this.reader.retrieveMessageHistoryByBounds(this.subject.sender, this.subject.recipient, entry, undefined, limit);
        }
        else {
            return await this.reader.retrieveBroadcastHistoryByBounds(this.subject.sender, entry, undefined, limit);
        }
    }
    async getLast(limit, upToIncluding) {
        if (this.subject.type === sdk_1.BlockchainSourceType.DIRECT) {
            return await this.reader.advancedRetrieveMessageHistoryByBounds(this.subject.sender, this.subject.recipient, upToIncluding, true, undefined, false, limit);
        }
        else {
            return await this.reader.retrieveBroadcastHistoryByBounds(this.subject.sender, undefined, undefined, limit);
        }
    }
    async getAfterBlock(blockNumber, limit) {
        return await this.reader.retrieveHistorySinceBlock(this.subject, blockNumber, this.lastMessage || undefined);
    }
    async pull() {
        // const messages = this.lastMessage
        // 	? await this.getAfter(this.lastMessage, this.limit)
        // 	: await this.getLast(this.limit);
        const lastBlockNumber = await this.reader.getLastBlockNumber();
        let messages;
        if (this.lastBlockChecked) {
            messages = await this.getAfterBlock(this.lastBlockChecked, this.limit);
        }
        else {
            messages = this.lastMessage
                ? await this.getAfter(this.lastMessage, this.limit)
                : await this.getLast(this.limit);
        }
        this.lastBlockChecked = lastBlockNumber;
        if (messages.length) {
            this.lastMessage = messages[0];
            this.emit('messages', { reader: this.reader, subject: this.subject, messages });
        }
    }
}
exports.EthereumListSource = EthereumListSource;
//# sourceMappingURL=EthereumListSource.js.map