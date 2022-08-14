"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ethereumBlockchainFactory = exports.EthereumBlockchainController = void 0;
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
const sdk_1 = require("@ylide/sdk");
const constants_1 = require("../misc/constants");
const contracts_1 = require("../contracts");
const web3_1 = __importDefault(require("web3"));
const sdk_2 = require("@ylide/sdk");
class EthereumBlockchainController extends sdk_1.AbstractBlockchainController {
    options;
    writeWeb3;
    web3Readers;
    blocksCache = {};
    MESSAGES_FETCH_LIMIT = 50;
    mailerContract;
    registryContract;
    constructor(options = {}) {
        super(options);
        this.options = options;
        // @ts-ignore
        this.writeWeb3 = global.www3 = new web3_1.default(options?.writeWeb3Provider || web3_1.default.givenProvider);
        this.web3Readers = options.web3Readers
            ? options.web3Readers.map(r => new web3_1.default(r))
            : [new web3_1.default(web3_1.default.givenProvider)];
        this.mailerContract = new contracts_1.MailerContract(this, options.mailerContractAddress || (options.dev ? constants_1.DEV_MAILER_ADDRESS : constants_1.MAILER_ADDRESS));
        this.registryContract = new contracts_1.RegistryContract(this, options.registryContractAddress || (options.dev ? constants_1.DEV_REGISTRY_ADDRESS : constants_1.REGISTRY_ADDRESS));
    }
    async executeWeb3Op(callback) {
        for (const w3 of this.web3Readers) {
            try {
                return await callback(w3);
            }
            catch (err) {
                continue;
            }
        }
        throw new Error('Was not able to execute in all of web3 providers');
    }
    async getRecipientReadingRules(address) {
        return [];
    }
    async extractAddressFromPublicKey(publicKey) {
        return this.registryContract.getAddressByPublicKey(publicKey.bytes);
    }
    async extractPublicKeyFromAddress(address) {
        const rawKey = await this.registryContract.getPublicKeyByAddress(address);
        if (!rawKey) {
            return null;
        }
        return sdk_1.PublicKey.fromBytes(sdk_1.PublicKeyType.YLIDE, rawKey);
    }
    async getBlock(n) {
        if (!this.blocksCache[n]) {
            try {
                this.blocksCache[n] = await this.executeWeb3Op(w3 => w3.eth.getBlock(n));
            }
            catch (err) {
                console.log('getBlock err: ', err);
                throw err;
            }
        }
        return this.blocksCache[n];
    }
    async getLastBlockNumber() {
        return this.executeWeb3Op(w3 => w3.eth.getBlockNumber());
    }
    async getBlockNumberByTime(time, firstBlock, lastBlock) {
        console.log(`getBlockNumberByTime ${firstBlock?.number} ${lastBlock?.number}`);
        if (!firstBlock) {
            firstBlock = await this.getBlock(this.options.mailerStartBlock || 0);
        }
        if (time <= firstBlock.timestamp) {
            return firstBlock;
        }
        if (!lastBlock) {
            const lastBlockNumber = await this.getLastBlockNumber();
            lastBlock = await this.getBlock(lastBlockNumber);
        }
        if (time >= lastBlock.timestamp) {
            return lastBlock;
        }
        const middleBlockNumber = Math.floor((firstBlock.number + lastBlock.number) / 2);
        const middleBlock = await this.getBlock(middleBlockNumber);
        console.log('middleBlockNumber: ', middleBlockNumber);
        console.log('time: ', time);
        console.log('middleBlock.timestamp: ', middleBlock.timestamp);
        if (middleBlockNumber === firstBlock.number) {
            return firstBlock;
        }
        else if (time >= middleBlock.timestamp) {
            return this.getBlockNumberByTime(time, middleBlock, lastBlock);
        }
        else {
            return this.getBlockNumberByTime(time, firstBlock, middleBlock);
        }
    }
    async binSearchBlocks(fromTime, toTime) {
        const firstBlock = await this.getBlock(this.options.mailerStartBlock || 0);
        const lastBlockNumber = await this.getLastBlockNumber();
        const lastBlock = await this.getBlock(lastBlockNumber);
        const fromBlock = await this.getBlockNumberByTime(fromTime || 0, firstBlock, lastBlock);
        const toBlock = await this.getBlockNumberByTime(toTime || Number(lastBlock.timestamp), firstBlock, lastBlock);
        return { fromBlock, toBlock };
    }
    async tryRequest(mailerAddress, subject, fromBlockNumber, toBlockNumber) {
        try {
            return {
                result: true,
                data: await this.executeWeb3Op(async (w3) => {
                    const ctrct = new w3.eth.Contract(contracts_1.MAILER_ABI.abi, mailerAddress);
                    return await ctrct.getPastEvents(subject.type === sdk_2.BlockchainSourceSubjectType.RECIPIENT ? 'MailPush' : 'MailBroadcast', {
                        filter: subject.address
                            ? subject.type === sdk_2.BlockchainSourceSubjectType.RECIPIENT
                                ? {
                                    recipient: '0x' + (0, sdk_1.uint256ToHex)(subject.address),
                                }
                                : { sender: this.uint256ToAddress(subject.address) }
                            : undefined,
                        fromBlock: fromBlockNumber,
                        toBlock: toBlockNumber,
                    });
                }),
            };
        }
        catch (err) {
            // debugger;
            // console.log('err: ', err);
            return {
                result: false,
            };
        }
    }
    eventCmpr(a, b) {
        if (a.blockNumber === b.blockNumber) {
            if (a.transactionIndex === b.transactionIndex) {
                return b.logIndex - a.logIndex;
            }
            else {
                return b.transactionIndex - a.transactionIndex;
            }
        }
        else {
            return b.blockNumber - a.blockNumber;
        }
    }
    async retrieveEventsByBounds(mailerAddress, subject, fromBlockNumber, toBlockNumber, limit) {
        const full = await this.tryRequest(mailerAddress, subject, fromBlockNumber, toBlockNumber);
        if (full.result) {
            const sortedData = full.data.sort(this.eventCmpr);
            return limit ? sortedData.slice(0, limit) : sortedData;
        }
        else {
            if (fromBlockNumber === toBlockNumber) {
                return [];
            }
            const middleBlockNumber = Math.floor((toBlockNumber + fromBlockNumber) / 2);
            const middleBlockRealNumber = middleBlockNumber === fromBlockNumber
                ? fromBlockNumber
                : middleBlockNumber === toBlockNumber
                    ? toBlockNumber
                    : middleBlockNumber;
            const leftSide = await this.retrieveEventsByBounds(mailerAddress, subject, fromBlockNumber, middleBlockRealNumber, limit);
            if (!limit || leftSide.length < limit) {
                if (middleBlockRealNumber === fromBlockNumber) {
                    return leftSide;
                }
                else {
                    const rightSide = await this.retrieveEventsByBounds(mailerAddress, subject, middleBlockRealNumber, toBlockNumber, limit ? limit - leftSide.length : undefined);
                    return leftSide.concat(rightSide);
                }
            }
            else {
                return leftSide;
            }
        }
    }
    getDefaultMailerAddress() {
        return this.mailerContract.contractAddress;
    }
    async _retrieveMessageHistoryByTime(mailerAddress, subject, fromTimestamp, toTimestamp, limit) {
        if (!mailerAddress) {
            mailerAddress = this.getDefaultMailerAddress();
        }
        const { fromBlock, toBlock } = await this.binSearchBlocks(fromTimestamp, toTimestamp);
        const events = await this.retrieveEventsByBounds(mailerAddress, subject, fromBlock.number, toBlock.number, limit);
        const msgs = await this.processMessages(events);
        const result = msgs.map(m => this.formatPushMessage(m));
        return result.filter(r => (!fromTimestamp || r.blockchainMeta.block.timestamp > fromTimestamp) &&
            (!toTimestamp || r.blockchainMeta.block.timestamp <= toTimestamp));
    }
    async _retrieveMessageHistoryByBounds(mailerAddress, subject, fromMessage, toMessage, limit) {
        const fromBlockNumber = fromMessage ? fromMessage.blockchainMeta.block.number : 0;
        const toBlockNumber = toMessage ? toMessage.blockchainMeta.block.number : await this.getLastBlockNumber();
        // console.log('fromBlockNumber: ', fromBlockNumber);
        // console.log('toBlockNumber: ', toBlockNumber);
        const rawEvents = await this.retrieveEventsByBounds(mailerAddress, subject, fromBlockNumber, toBlockNumber, limit);
        const topBound = toMessage
            ? rawEvents.findIndex(r => (0, sdk_1.bigIntToUint256)(r.returnValues.msgId) === toMessage.msgId)
            : -1;
        const bottomBound = fromMessage
            ? rawEvents.findIndex(r => (0, sdk_1.bigIntToUint256)(r.returnValues.msgId) === fromMessage.msgId)
            : -1;
        const events = rawEvents.slice(topBound === -1 ? 0 : topBound + 1, bottomBound === -1 ? undefined : bottomBound);
        const msgs = await this.processMessages(events);
        const result = msgs.map(m => this.formatPushMessage(m));
        // console.log('result: ', result);
        const output = result.slice(topBound === -1 ? 0 : topBound + 1, bottomBound === -1 ? undefined : bottomBound);
        // console.log('output: ', output);
        return output;
    }
    async retrieveMessageHistoryByTime(recipient, mailerAddress, fromTimestamp, toTimestamp, limit) {
        if (!mailerAddress) {
            mailerAddress = this.getDefaultMailerAddress();
        }
        return this._retrieveMessageHistoryByTime(mailerAddress, { type: sdk_2.BlockchainSourceSubjectType.RECIPIENT, address: recipient }, fromTimestamp, toTimestamp, limit);
    }
    async retrieveMessageHistoryByBounds(recipient, mailerAddress, fromMessage, toMessage, limit) {
        if (!mailerAddress) {
            mailerAddress = this.getDefaultMailerAddress();
        }
        return this._retrieveMessageHistoryByBounds(mailerAddress, { type: sdk_2.BlockchainSourceSubjectType.RECIPIENT, address: recipient }, fromMessage, toMessage, limit);
    }
    async retrieveBroadcastHistoryByTime(sender, mailerAddress, fromTimestamp, toTimestamp, limit) {
        if (!mailerAddress) {
            mailerAddress = this.getDefaultMailerAddress();
        }
        return this._retrieveMessageHistoryByTime(mailerAddress, { type: sdk_2.BlockchainSourceSubjectType.AUTHOR, address: sender }, fromTimestamp, toTimestamp, limit);
    }
    async retrieveBroadcastHistoryByBounds(sender, mailerAddress, fromMessage, toMessage, limit) {
        if (!mailerAddress) {
            mailerAddress = this.getDefaultMailerAddress();
        }
        return this._retrieveMessageHistoryByBounds(mailerAddress, { type: sdk_2.BlockchainSourceSubjectType.AUTHOR, address: sender }, fromMessage, toMessage, limit);
    }
    async retrieveAndVerifyMessageContent(msg) {
        const result = await this.retrieveMessageContentByMsgId(msg.msgId);
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
    async retrieveMessageContentByMsgId(msgId) {
        const messages = await this.processMessages(await this.mailerContract.contract.getPastEvents('MailContent', {
            filter: {
                msgId: '0x' + msgId,
            },
            fromBlock: 0,
            toBlock: 'latest',
        }));
        if (!messages.length) {
            return null;
        }
        let decodedChunks;
        try {
            decodedChunks = messages.map((m) => ({
                msg: m,
                body: this.mailerContract.decodeContentMessageBody(m.event),
            }));
        }
        catch (err) {
            return {
                msgId,
                corrupted: true,
                chunks: messages.map((m) => ({ createdAt: Number(m.block.timestamp) })),
                reason: sdk_1.MessageContentFailure.NON_DECRYPTABLE,
            };
        }
        const parts = decodedChunks[0].body.parts;
        const sender = decodedChunks[0].body.sender;
        if (!decodedChunks.every(t => t.body.parts === parts) || !decodedChunks.every(t => t.body.sender === sender)) {
            return {
                msgId,
                corrupted: true,
                chunks: decodedChunks.map(m => ({ createdAt: Number(m.msg.block.timestamp) })),
                reason: sdk_1.MessageContentFailure.NON_INTEGRITY_PARTS,
            };
        }
        for (let idx = 0; idx < parts; idx++) {
            if (!decodedChunks.find(d => d.body.partIdx === idx)) {
                return {
                    msgId,
                    corrupted: true,
                    chunks: decodedChunks.map(m => ({ createdAt: Number(m.msg.block.timestamp) })),
                    reason: sdk_1.MessageContentFailure.NOT_ALL_PARTS,
                };
            }
        }
        if (decodedChunks.length !== parts) {
            return {
                msgId,
                corrupted: true,
                chunks: decodedChunks.map(m => ({ createdAt: Number(m.msg.block.timestamp) })),
                reason: sdk_1.MessageContentFailure.DOUBLED_PARTS,
            };
        }
        const sortedChunks = decodedChunks
            .sort((a, b) => {
            return a.body.partIdx - b.body.partIdx;
        })
            .map(m => m.body.content);
        const contentSize = sortedChunks.reduce((p, c) => p + c.length, 0);
        const buf = smart_buffer_1.default.ofSize(contentSize);
        for (const chunk of sortedChunks) {
            buf.writeBytes(chunk);
        }
        return {
            msgId,
            corrupted: false,
            storage: 'ethereum',
            createdAt: Math.min(...decodedChunks.map(d => Number(d.msg.block.timestamp))),
            senderAddress: sender,
            parts,
            content: buf.bytes,
        };
    }
    formatPushMessage(message) {
        const { recipient: recipientUint256, sender, msgId, key } = message.event.returnValues;
        const recipient = (0, sdk_1.bigIntToUint256)(String(recipientUint256));
        const createdAt = message.block.timestamp;
        return {
            msgId: (0, sdk_1.bigIntToUint256)(msgId),
            createdAt: Number(createdAt),
            senderAddress: sender,
            recipientAddress: recipient,
            blockchain: 'ethereum',
            key: smart_buffer_1.default.ofHexString(key.substring(2)).bytes,
            isContentLoaded: false,
            isContentDecrypted: false,
            contentLink: null,
            decryptedContent: null,
            blockchainMeta: message,
            userspaceMeta: null,
        };
    }
    isAddressValid(address) {
        return web3_1.default.utils.isAddress(address);
    }
    async processMessages(msgs) {
        if (!msgs.length) {
            return [];
        }
        const txHashes = msgs.map(e => e.transactionHash).filter((e, i, a) => a.indexOf(e) === i);
        const blockHashes = msgs.map(e => e.blockHash).filter((e, i, a) => a.indexOf(e) === i);
        const { txs, blocks } = await this.executeWeb3Op(async (w3) => {
            const batch = new w3.BatchRequest();
            const txsPromise = Promise.all(txHashes.map(txHash => new Promise((resolve, reject) => {
                batch.add(
                // @ts-ignore
                w3.eth.getTransaction.request(txHash, (err, tx) => {
                    if (err) {
                        return reject(err);
                    }
                    else {
                        return resolve(tx);
                    }
                }));
            })));
            const blocksPromise = Promise.all(blockHashes.map(blockHash => new Promise((resolve, reject) => {
                batch.add(
                // @ts-ignore
                w3.eth.getBlock.request(blockHash, false, (err, block) => {
                    if (err) {
                        return reject(err);
                    }
                    else {
                        return resolve(block);
                    }
                }));
            })));
            batch.execute();
            const txs = await txsPromise;
            const blocks = await blocksPromise;
            return { txs, blocks };
        });
        const txMap = txs.reduce((p, c) => ({
            ...p,
            [c.hash]: c,
        }), {});
        const blockMap = blocks.reduce((p, c) => ({
            ...p,
            [c.hash]: c,
        }), {});
        return msgs.map(ev => ({ event: ev, tx: txMap[ev.transactionHash], block: blockMap[ev.blockHash] }));
    }
    async getExtraEncryptionStrategiesFromAddress(address) {
        return [];
    }
    getSupportedExtraEncryptionStrategies() {
        return [];
    }
    async prepareExtraEncryptionStrategyBulk(entries) {
        throw new Error('No native strategies supported for Ethereum');
    }
    async executeExtraEncryptionStrategy(entries, bulk, addedPublicKeyIndex, messageKey) {
        throw new Error('No native strategies supported for Ethereum');
    }
    uint256ToAddress(value) {
        return '0x' + new smart_buffer_1.default((0, sdk_1.uint256ToUint8Array)(value).slice(12)).toHexString();
    }
    addressToUint256(address) {
        const lowerAddress = address.toLowerCase();
        const cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
        return (0, sdk_1.hexToUint256)(''.padStart(24, '0') + cleanHexAddress);
    }
    compareMessagesTime(a, b) {
        if (a.createdAt === b.createdAt) {
            return a.blockchainMeta.event.logIndex - b.blockchainMeta.event.logIndex;
        }
        else {
            return a.createdAt - b.createdAt;
        }
    }
}
exports.EthereumBlockchainController = EthereumBlockchainController;
exports.ethereumBlockchainFactory = {
    create: (options) => new EthereumBlockchainController(options),
    blockchain: 'ethereum',
};
//# sourceMappingURL=EthereumBlockchainController.js.map