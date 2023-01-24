"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumContentReader = void 0;
const sdk_1 = require("@ylide/sdk");
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
class EthereumContentReader {
    blockchainReader;
    mailerReader;
    constructor(blockchainReader, mailerReader) {
        this.blockchainReader = blockchainReader;
        this.mailerReader = mailerReader;
        //
    }
    enoughEvents(events) {
        if (!events.length) {
            return false;
        }
        const parts = events[0].args.parts;
        for (let idx = 0; idx < parts; idx++) {
            if (!events.find(e => e.args.partIdx === idx)) {
                return false;
            }
        }
        return true;
    }
    async retrieveMessageContentByMessageHeader(mailer, msg) {
        let i = msg.$$blockchainMetaDontUseThisField.event.blockNumber;
        const totalEvents = [];
        let done = false;
        while (i >= mailer.creationBlock) {
            const partEvents = await this.mailerReader.contractOperation(mailer, async (contract, provider, blockLimit) => {
                const events = await contract.queryFilter(contract.filters.MailContent(msg.msgId), i - blockLimit, i);
                i -= blockLimit;
                return events;
            });
            totalEvents.push(...partEvents);
            if (this.enoughEvents(totalEvents)) {
                done = true;
                break;
            }
        }
        if (!done) {
            return null;
        }
        const messages = await this.blockchainReader.processMessages(totalEvents);
        return this.processMessageContent(msg.msgId, messages);
    }
    processMessageContent(msgId, messagePartEvents) {
        if (!messagePartEvents.length) {
            return null;
        }
        const parts = messagePartEvents[0].event.args.parts;
        const sender = messagePartEvents[0].event.args.sender;
        if (!messagePartEvents.every(t => t.event.args.parts === parts) ||
            !messagePartEvents.every(t => t.event.args.sender === sender)) {
            return {
                msgId,
                corrupted: true,
                chunks: messagePartEvents.map(m => ({ createdAt: m.block.timestamp })),
                reason: sdk_1.MessageContentFailure.NON_INTEGRITY_PARTS,
            };
        }
        for (let idx = 0; idx < parts; idx++) {
            if (!messagePartEvents.find(d => d.event.args.partIdx === idx)) {
                return {
                    msgId,
                    corrupted: true,
                    chunks: messagePartEvents.map(m => ({ createdAt: m.block.timestamp })),
                    reason: sdk_1.MessageContentFailure.NOT_ALL_PARTS,
                };
            }
        }
        if (messagePartEvents.length !== parts) {
            return {
                msgId,
                corrupted: true,
                chunks: messagePartEvents.map(m => ({ createdAt: m.block.timestamp })),
                reason: sdk_1.MessageContentFailure.DOUBLED_PARTS,
            };
        }
        const sortedChunks = messagePartEvents
            .sort((a, b) => {
            return a.event.args.partIdx - b.event.args.partIdx;
        })
            .map(m => smart_buffer_1.default.ofHexString(m.event.args.content).bytes);
        const contentSize = sortedChunks.reduce((p, c) => p + c.length, 0);
        const buf = smart_buffer_1.default.ofSize(contentSize);
        for (const chunk of sortedChunks) {
            buf.writeBytes(chunk);
        }
        return {
            msgId,
            corrupted: false,
            storage: 'evm',
            createdAt: Math.min(...messagePartEvents.map(d => d.block.timestamp)),
            senderAddress: sender,
            parts,
            content: buf.bytes,
        };
    }
    async retrieveAndVerifyMessageContent(mailer, msg) {
        const result = await this.retrieveMessageContentByMessageHeader(mailer, msg);
        if (!result) {
            return null;
        }
        if (result.corrupted) {
            return result;
        }
        if (result.senderAddress !== msg.senderAddress) {
            return {
                msgId: msg.msgId,
                corrupted: true,
                chunks: [],
                reason: sdk_1.MessageContentFailure.NON_INTEGRITY_PARTS,
            };
        }
        return result;
    }
}
exports.EthereumContentReader = EthereumContentReader;
//# sourceMappingURL=EthereumContentReader.js.map