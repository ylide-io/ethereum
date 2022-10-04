"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumBlockchainSource = void 0;
const sdk_1 = require("@ylide/sdk");
class EthereumBlockchainSource extends sdk_1.BlockchainSource {
    reader;
    subject;
    _pullCycle;
    limit;
    meta;
    lastBlockChecked = 0;
    constructor(reader, subject, _pullCycle = 5000, limit = 50, meta = null) {
        super(reader, subject, _pullCycle, limit, meta);
        this.reader = reader;
        this.subject = subject;
        this._pullCycle = _pullCycle;
        this.limit = limit;
        this.meta = meta;
    }
    // async getBefore(entry: GenericEntryPure<IMessage>, limit: number): Promise<GenericEntryPure<IMessage>[]> {
    // 	if (this.subject.type === BlockchainSourceSubjectType.RECIPIENT) {
    // 		return (
    // 			await this.reader.retrieveMessageHistoryByBounds(this.subject.address, undefined, entry.link, limit)
    // 		).map(msg => ({
    // 			link: msg,
    // 			time: msg.createdAt,
    // 		}));
    // 	} else {
    // 		return (
    // 			await this.reader.retrieveBroadcastHistoryByBounds(this.subject.address, undefined, entry.link, limit)
    // 		).map(msg => ({
    // 			link: msg,
    // 			time: msg.createdAt,
    // 		}));
    // 	}
    // }
    async getAfterBlock(blockNumber, limit) {
        return (await this.reader.retrieveHistorySinceBlock(this.subject, blockNumber, this.lastMessage || undefined)).map(msg => ({
            link: msg,
            time: msg.createdAt,
        }));
    }
    // async getLast(limit: number): Promise<GenericEntryPure<IMessage>[]> {
    // 	if (this.subject.type === BlockchainSourceSubjectType.RECIPIENT) {
    // 		return (
    // 			await this.reader.retrieveMessageHistoryByBounds(this.subject.address, undefined, undefined, limit)
    // 		).map(msg => ({
    // 			link: msg,
    // 			time: msg.createdAt,
    // 		}));
    // 	} else {
    // 		return (
    // 			await this.reader.retrieveBroadcastHistoryByBounds(this.subject.address, undefined, undefined, limit)
    // 		).map(msg => ({
    // 			link: msg,
    // 			time: msg.createdAt,
    // 		}));
    // 	}
    // }
    async pull() {
        let messages;
        const lastBlockNumber = await this.reader.getLastBlockNumber();
        if (this.lastBlockChecked) {
            messages = await this.getAfterBlock(this.lastBlockChecked, this.limit);
        }
        else {
            messages = this.lastMessage
                ? await this.getAfter({ link: this.lastMessage, time: this.lastMessage.createdAt }, this.limit)
                : await this.getLast(this.limit);
        }
        this.lastBlockChecked = lastBlockNumber;
        if (messages.length) {
            this.lastMessage = messages[0].link;
            this.emit('messages', { reader: this.reader, subject: this.subject, messages });
            for (const message of messages) {
                this.emit('message', { reader: this.reader, subject: this.subject, message });
            }
        }
    }
}
exports.EthereumBlockchainSource = EthereumBlockchainSource;
//# sourceMappingURL=EthereumBlockchainSource.js.map