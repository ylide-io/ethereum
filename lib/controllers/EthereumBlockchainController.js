"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evmBlockchainFactories = exports.EthereumBlockchainController = void 0;
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
const sdk_1 = require("@ylide/sdk");
const web3_1 = __importDefault(require("web3"));
const constants_1 = require("../misc/constants");
const contracts_1 = require("../contracts");
const misc_1 = require("../misc");
const contractUtils_1 = require("../contracts/contractUtils");
const EthereumNameService_1 = require("./EthereumNameService");
const semaphore_promise_1 = require("semaphore-promise");
class EthereumBlockchainController extends sdk_1.AbstractBlockchainController {
    options;
    web3Readers;
    blocksCache = {};
    MESSAGES_FETCH_LIMIT = 50;
    mailerContractAddress;
    mailerFirstBlock = 0;
    registryContractAddress;
    registryFirstBlock = 0;
    network;
    chainId;
    nameService = null;
    txcs = new semaphore_promise_1.Semaphore(3);
    constructor(options = {}) {
        super(options);
        this.options = options;
        if (options.network === undefined) {
            throw new Error('You must provide network for EVM controller');
        }
        this.network = options.network;
        this.chainId = misc_1.EVM_CHAINS[options.network];
        const chainNodes = misc_1.EVM_RPCS[options.network];
        this.web3Readers = options.web3Readers
            ? options.web3Readers.map(r => ({
                web3: new web3_1.default(r),
                blockLimit: 0,
                latestNotSupported: false,
                batchNotSupported: false,
            }))
            : chainNodes.map(data => {
                const url = data.rpc;
                if (url.startsWith('ws')) {
                    return {
                        web3: new web3_1.default(new web3_1.default.providers.WebsocketProvider(url)),
                        blockLimit: data.blockLimit || 0,
                        latestNotSupported: data.lastestNotSupported || false,
                        batchNotSupported: data.batchNotSupported || false,
                    };
                }
                else {
                    return {
                        web3: new web3_1.default(new web3_1.default.providers.HttpProvider(url)),
                        blockLimit: data.blockLimit || 0,
                        latestNotSupported: data.lastestNotSupported || false,
                        batchNotSupported: data.batchNotSupported || false,
                    };
                }
            });
        this.mailerContractAddress = options.mailerContractAddress || constants_1.EVM_CONTRACTS[this.network].mailer.address;
        this.registryContractAddress = options.registryContractAddress || constants_1.EVM_CONTRACTS[this.network].registry.address;
        this.registryFirstBlock = constants_1.EVM_CONTRACTS[this.network].registry.fromBlock || 0;
        this.mailerFirstBlock = constants_1.EVM_CONTRACTS[this.network].mailer.fromBlock || 0;
        this.nameService = options?.nameServiceAddress
            ? new EthereumNameService_1.EthereumNameService(this, options?.nameServiceAddress)
            : this.tryGetNameService();
    }
    blockchainGroup() {
        return 'evm';
    }
    blockchain() {
        return misc_1.EVM_NAMES[this.network];
    }
    tryGetNameService() {
        return constants_1.EVM_ENS[this.network] ? new EthereumNameService_1.EthereumNameService(this, constants_1.EVM_ENS[this.network]) : null;
    }
    isReadingBySenderAvailable() {
        return false;
    }
    defaultNameService() {
        return this.nameService;
    }
    async init() {
        // np
    }
    async getBalance(address) {
        return await this.executeWeb3Op(async (w3) => {
            const stringValue = await w3.eth.getBalance(address);
            // Web3.utils.fromWei(
            return {
                original: stringValue,
                number: Number(web3_1.default.utils.fromWei(stringValue)),
                string: web3_1.default.utils.fromWei(stringValue),
                e18: stringValue,
            };
        });
    }
    async getRecipientIndex(recipient, mailerAddress) {
        return await this.executeWeb3Op(async (w3) => {
            return contracts_1.MailerContract.extractRecipientIndex(recipient, w3, mailerAddress);
        });
    }
    async executeWeb3Op(callback) {
        let lastError;
        const errors = [];
        for (const w3 of this.web3Readers) {
            let doBreak = false;
            try {
                return await callback(w3.web3, w3.blockLimit, w3.latestNotSupported, w3.batchNotSupported, () => (doBreak = true));
            }
            catch (err) {
                lastError = err;
                if (err && typeof err.message === 'string' && err.message.includes('blocks range')) {
                    throw err;
                }
                errors.push(err);
                if (doBreak) {
                    break;
                }
                else {
                    continue;
                }
            }
        }
        // console.error('lastError: ', lastError);
        // errors.forEach(err => console.error('w3 err: ', err));
        throw new Error('Was not able to execute in all of web3 providers');
    }
    async getRecipientReadingRules(address) {
        return [];
    }
    async getAddressByPublicKey(publicKey) {
        return null;
    }
    async getPublicKeyByAddress(registryAddress, address) {
        return await this.executeWeb3Op(async (w3, blockLimit) => {
            const result = await contracts_1.RegistryContract.extractPublicKeyFromAddress(address, w3, registryAddress);
            // console.log('extractPublicKeyFromAddress result: ', result);
            if (result) {
                return result;
            }
            else {
                return null;
            }
        });
    }
    async extractAddressFromPublicKey(publicKey) {
        return this.getAddressByPublicKey(publicKey.bytes);
    }
    async extractPublicKeyFromAddress(address) {
        const rawKey = await this.getPublicKeyByAddress(this.registryContractAddress, address);
        if (!rawKey) {
            return null;
        }
        return {
            publicKey: sdk_1.PublicKey.fromBytes(sdk_1.PublicKeyType.YLIDE, rawKey.publicKey),
            timestamp: rawKey.timestamp,
            keyVersion: rawKey.keyVersion,
        };
    }
    async getBlock(n) {
        if (!this.blocksCache[n]) {
            try {
                this.blocksCache[n] = await this.executeWeb3Op(w3 => w3.eth.getBlock(n));
            }
            catch (err) {
                // console.log('getBlock err: ', err);
                throw err;
            }
        }
        return this.blocksCache[n];
    }
    async getLastBlockNumber() {
        return this.executeWeb3Op(w3 => w3.eth.getBlockNumber());
    }
    async getBlockNumberByTime(time, firstBlock, lastBlock) {
        if (!firstBlock) {
            firstBlock = await this.getBlock(this.mailerFirstBlock || 0);
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
        const firstBlock = await this.getBlock(this.mailerFirstBlock || 0);
        const lastBlockNumber = await this.getLastBlockNumber();
        const lastBlock = await this.getBlock(lastBlockNumber);
        const fromBlock = await this.getBlockNumberByTime(fromTime || 0, firstBlock, lastBlock);
        const toBlock = await this.getBlockNumberByTime(toTime || Number(lastBlock.timestamp), firstBlock, lastBlock);
        return { fromBlock, toBlock };
    }
    async doEventsRequest(mailerAddress, subject, w3, fromBlock, toBlock) {
        const ctrct = new w3.eth.Contract(contracts_1.MAILER_ABI.abi, mailerAddress);
        return await ctrct.getPastEvents(subject.type === sdk_1.BlockchainSourceType.DIRECT ? 'MailPush' : 'MailBroadcast', {
            filter: subject.type === sdk_1.BlockchainSourceType.DIRECT
                ? subject.recipient
                    ? {
                        recipient: '0x' + (0, sdk_1.uint256ToHex)(subject.recipient),
                    }
                    : {}
                : subject.sender
                    ? { sender: subject.sender }
                    : {},
            fromBlock,
            toBlock,
        });
    }
    async tryRequest(mailerAddress, subject, fromBlockNumber, toBlockNumber) {
        try {
            return {
                result: true,
                data: await this.executeWeb3Op(async (w3, blockLimit, latestNotSupported, b, doBreak) => {
                    if (blockLimit && toBlockNumber - fromBlockNumber > blockLimit) {
                        doBreak();
                        throw new Error(`Block limit is ${blockLimit}`);
                    }
                    return this.doEventsRequest(mailerAddress, subject, w3, fromBlockNumber, toBlockNumber);
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
    async _retrieveEventsSinceBlock(mailerAddress, subject, fromBlockNumber, limit) {
        const full = await this.executeWeb3Op(async (w3, blockLimit, latestNotSupported) => {
            if (latestNotSupported) {
                const lastBlock = await w3.eth.getBlockNumber();
                return await this.doEventsRequest(mailerAddress, subject, w3, fromBlockNumber, lastBlock);
            }
            else {
                return await this.doEventsRequest(mailerAddress, subject, w3, fromBlockNumber, 'latest');
            }
        });
        const sortedData = full.sort(this.eventCmpr);
        return limit ? sortedData.slice(0, limit) : sortedData;
    }
    getDefaultMailerAddress() {
        return this.mailerContractAddress;
    }
    async _retrieveMessageHistoryByTime(mailerAddress, subject, fromTimestamp, toTimestamp, limit) {
        if (!mailerAddress) {
            mailerAddress = this.getDefaultMailerAddress();
        }
        const { fromBlock, toBlock } = await this.binSearchBlocks(fromTimestamp, toTimestamp);
        const events = await this.retrieveEventsByBounds(mailerAddress, subject, fromBlock.number, toBlock.number, limit);
        const msgs = await this.processMessages(events);
        const result = msgs.map(m => subject.type === sdk_1.BlockchainSourceType.DIRECT ? this.formatPushMessage(m) : this.formatBroadcastMessage(m));
        return result.filter(r => (!fromTimestamp || r.$$blockchainMetaDontUseThisField.block.timestamp > fromTimestamp) &&
            (!toTimestamp || r.$$blockchainMetaDontUseThisField.block.timestamp <= toTimestamp));
    }
    async retrieveHistorySinceBlock(subject, fromBlock, firstMessage) {
        const rawEvents = await this._retrieveEventsSinceBlock(this.getDefaultMailerAddress(), subject, fromBlock);
        const bottomBound = firstMessage
            ? rawEvents.findIndex(r => (0, sdk_1.bigIntToUint256)(r.returnValues.msgId) === firstMessage.msgId)
            : -1;
        const events = rawEvents.slice(0, bottomBound === -1 ? undefined : bottomBound);
        const msgs = await this.processMessages(events);
        return msgs.map(m => subject.type === sdk_1.BlockchainSourceType.DIRECT ? this.formatPushMessage(m) : this.formatBroadcastMessage(m));
    }
    async advancedRetrieveMessageHistoryByBounds(sender, recipient, fromMessage, fromMessageIncluding = false, fromBlockNumber, toMessage, toMessageIncluding = false, limit) {
        const _toBlockNumber = await this.getLastBlockNumber();
        return {
            messages: await this.iterateMailers(limit, async (mailer) => {
                if (sender === null && recipient) {
                    const indexation = await this.executeWeb3Op(async (w3) => {
                        return await contracts_1.MailerContract.extractRecipientIndex(recipient, w3, mailer.address);
                    });
                    if (!indexation.length) {
                        return [];
                    }
                }
                return await this._retrieveMessageHistoryByBounds(mailer.address, { type: sdk_1.BlockchainSourceType.DIRECT, sender, recipient }, fromMessage, fromMessageIncluding, fromBlockNumber, toMessage, toMessageIncluding, _toBlockNumber, limit);
            }),
            toBlockNumber: _toBlockNumber,
        };
    }
    async _retrieveMessageHistoryByBounds(mailerAddress, subject, fromMessage, fromMessageIncluding = false, fromBlockNumber, toMessage, toMessageIncluding = false, toBlockNumber, limit) {
        const _fromBlockNumber = fromBlockNumber ||
            (fromMessage ? fromMessage.$$blockchainMetaDontUseThisField.block.number : this.mailerFirstBlock || 0);
        const _toBlockNumber = toBlockNumber ||
            (toMessage ? toMessage.$$blockchainMetaDontUseThisField.block.number : await this.getLastBlockNumber());
        const rawEvents = await this.retrieveEventsByBounds(mailerAddress, subject, _fromBlockNumber, _toBlockNumber, limit);
        const topBound = toMessage
            ? rawEvents.findIndex(r => (0, sdk_1.bigIntToUint256)(r.returnValues.msgId) === toMessage.msgId)
            : -1;
        const bottomBound = fromMessage
            ? rawEvents.findIndex(r => (0, sdk_1.bigIntToUint256)(r.returnValues.msgId) === fromMessage.msgId)
            : -1;
        const events = rawEvents.slice(topBound === -1 ? 0 : (toMessageIncluding ? topBound - 1 : topBound) + 1, bottomBound === -1 ? undefined : fromMessageIncluding ? bottomBound + 1 : bottomBound);
        const msgs = await this.processMessages(events);
        const result = msgs.map(m => subject.type === sdk_1.BlockchainSourceType.DIRECT ? this.formatPushMessage(m) : this.formatBroadcastMessage(m));
        const output = result;
        return output;
    }
    async iterateMailers(limit, callback) {
        const mailers = [constants_1.EVM_CONTRACTS[this.network].mailer, ...(constants_1.EVM_CONTRACTS[this.network].legacyMailers || [])];
        const totalList = await Promise.all(mailers.map(callback));
        const msgs = totalList.flat();
        msgs.sort((a, b) => {
            return b.createdAt - a.createdAt;
        });
        return limit !== undefined ? msgs.slice(0, limit) : msgs;
    }
    async retrieveMessageHistoryByTime(sender, recipient, fromTimestamp, toTimestamp, limit) {
        return this.iterateMailers(limit, mailer => this._retrieveMessageHistoryByTime(mailer.address, { type: sdk_1.BlockchainSourceType.DIRECT, sender, recipient }, fromTimestamp, toTimestamp, limit));
    }
    async retrieveMessageHistoryByBounds(sender, recipient, fromMessage, toMessage, limit) {
        return this.iterateMailers(limit, mailer => this._retrieveMessageHistoryByBounds(mailer.address, { type: sdk_1.BlockchainSourceType.DIRECT, sender, recipient }, fromMessage, false, undefined, toMessage, false, undefined, limit));
    }
    async retrieveBroadcastHistoryByTime(sender, fromTimestamp, toTimestamp, limit) {
        return this.iterateMailers(limit, mailer => this._retrieveMessageHistoryByTime(mailer.address, { type: sdk_1.BlockchainSourceType.BROADCAST, sender }, fromTimestamp, toTimestamp, limit));
    }
    async retrieveBroadcastHistoryByBounds(sender, fromMessage, toMessage, limit) {
        return this.iterateMailers(limit, mailer => this._retrieveMessageHistoryByBounds(mailer.address, { type: sdk_1.BlockchainSourceType.BROADCAST, sender }, fromMessage, false, undefined, toMessage, false, undefined, limit));
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
    processMessageContent(msgId, messagePartEvents) {
        if (!messagePartEvents.length) {
            return null;
        }
        let decodedChunks;
        try {
            decodedChunks = messagePartEvents.map((m) => ({
                msg: m,
                body: (0, contractUtils_1.decodeContentMessageBody)(m.event),
            }));
        }
        catch (err) {
            return {
                msgId,
                corrupted: true,
                chunks: messagePartEvents.map((m) => ({ createdAt: Number(m.block.timestamp) })),
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
            storage: 'evm',
            createdAt: Math.min(...decodedChunks.map(d => Number(d.msg.block.timestamp))),
            senderAddress: sender,
            parts,
            content: buf.bytes,
        };
    }
    async retrieveMessageContentByMsgId(msgId) {
        const messages = await this.processMessages(await this.executeWeb3Op(async (w3) => {
            const ctrct = new w3.eth.Contract(contracts_1.MAILER_ABI.abi, constants_1.EVM_CONTRACTS[this.network].mailer.address);
            const lastBlock = await w3.eth.getBlockNumber();
            try {
                return await ctrct.getPastEvents('MailContent', {
                    filter: {
                        msgId: '0x' + msgId,
                    },
                    fromBlock: this.mailerFirstBlock || 0,
                    toBlock: lastBlock,
                });
            }
            catch (err) {
                if (err && typeof err.message === 'string' && err.message.includes('range')) {
                    const max = err.message.includes('max: ')
                        ? parseInt(err.message.split('max: ')[1], 10) - 1
                        : 9999;
                    const result = [];
                    for (let i = lastBlock; i > this.mailerFirstBlock || 0; i -= max) {
                        const tempEvents = await ctrct.getPastEvents('MailContent', {
                            filter: {
                                msgId: '0x' + msgId,
                            },
                            fromBlock: Math.max(i - max, 0),
                            toBlock: i,
                        });
                        result.push(...tempEvents);
                    }
                    return result;
                }
                else {
                    throw err;
                }
            }
        }));
        return this.processMessageContent(msgId, messages);
    }
    formatPushMessage(message) {
        const { recipient: recipientUint256, sender, msgId, key } = message.event.returnValues;
        const recipient = (0, sdk_1.bigIntToUint256)(String(recipientUint256));
        const createdAt = message.block.timestamp;
        return {
            isBroadcast: false,
            msgId: (0, sdk_1.bigIntToUint256)(msgId),
            createdAt: Number(createdAt),
            senderAddress: sender,
            recipientAddress: recipient,
            blockchain: misc_1.EVM_NAMES[this.network],
            key: smart_buffer_1.default.ofHexString(key ? key.substring(2) : '').bytes,
            $$blockchainMetaDontUseThisField: message,
        };
    }
    formatBroadcastMessage(message) {
        const { sender, msgId } = message.event.returnValues;
        const createdAt = message.block.timestamp;
        return {
            isBroadcast: true,
            msgId: (0, sdk_1.bigIntToUint256)(msgId),
            createdAt: Number(createdAt),
            senderAddress: sender,
            recipientAddress: sender,
            blockchain: misc_1.EVM_NAMES[this.network],
            key: new Uint8Array(),
            $$blockchainMetaDontUseThisField: message,
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
        const { txs, blocks } = await this.executeWeb3Op(async (w3, a, b, c) => {
            const noBatch = async () => {
                return {
                    txs: await Promise.all(txHashes.map(async (txHash) => {
                        const release = await this.txcs.acquire();
                        try {
                            return await w3.eth.getTransaction(txHash);
                        }
                        catch (err) {
                            // console.log('err: ', err);
                            throw err;
                        }
                        finally {
                            release();
                        }
                    })),
                    blocks: await Promise.all(blockHashes.map(async (blockHash) => {
                        const release = await this.txcs.acquire();
                        try {
                            return await w3.eth.getBlock(blockHash);
                        }
                        catch (err) {
                            // console.log('err: ', err);
                            throw err;
                        }
                        finally {
                            release();
                        }
                    })),
                };
            };
            if (c) {
                return await noBatch();
            }
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
            try {
                const _txs = await txsPromise;
                const _blocks = await blocksPromise;
                for (let i = 0; i < _txs.length; i++) {
                    // try one more time...
                    if (!_txs[i]) {
                        await (0, sdk_1.asyncDelay)(500);
                        _txs[i] = await w3.eth.getTransaction(txHashes[i]);
                    }
                }
                return { txs: _txs, blocks: _blocks };
            }
            catch (err) {
                return await noBatch();
            }
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
            return (a.$$blockchainMetaDontUseThisField.event.logIndex - b.$$blockchainMetaDontUseThisField.event.logIndex);
        }
        else {
            return a.createdAt - b.createdAt;
        }
    }
}
exports.EthereumBlockchainController = EthereumBlockchainController;
function getBlockchainFactory(network) {
    return {
        create: async (options) => new EthereumBlockchainController(Object.assign({ network }, options || {})),
        blockchain: misc_1.EVM_NAMES[network],
        blockchainGroup: 'evm',
    };
}
exports.evmBlockchainFactories = {
    [misc_1.EVMNetwork.LOCAL_HARDHAT]: getBlockchainFactory(misc_1.EVMNetwork.LOCAL_HARDHAT),
    [misc_1.EVMNetwork.ETHEREUM]: getBlockchainFactory(misc_1.EVMNetwork.ETHEREUM),
    [misc_1.EVMNetwork.BNBCHAIN]: getBlockchainFactory(misc_1.EVMNetwork.BNBCHAIN),
    [misc_1.EVMNetwork.POLYGON]: getBlockchainFactory(misc_1.EVMNetwork.POLYGON),
    [misc_1.EVMNetwork.AVALANCHE]: getBlockchainFactory(misc_1.EVMNetwork.AVALANCHE),
    [misc_1.EVMNetwork.OPTIMISM]: getBlockchainFactory(misc_1.EVMNetwork.OPTIMISM),
    [misc_1.EVMNetwork.ARBITRUM]: getBlockchainFactory(misc_1.EVMNetwork.ARBITRUM),
    [misc_1.EVMNetwork.CRONOS]: getBlockchainFactory(misc_1.EVMNetwork.CRONOS),
    [misc_1.EVMNetwork.FANTOM]: getBlockchainFactory(misc_1.EVMNetwork.FANTOM),
    [misc_1.EVMNetwork.KLAYTN]: getBlockchainFactory(misc_1.EVMNetwork.KLAYTN),
    [misc_1.EVMNetwork.GNOSIS]: getBlockchainFactory(misc_1.EVMNetwork.GNOSIS),
    [misc_1.EVMNetwork.AURORA]: getBlockchainFactory(misc_1.EVMNetwork.AURORA),
    [misc_1.EVMNetwork.CELO]: getBlockchainFactory(misc_1.EVMNetwork.CELO),
    [misc_1.EVMNetwork.MOONBEAM]: getBlockchainFactory(misc_1.EVMNetwork.MOONBEAM),
    [misc_1.EVMNetwork.MOONRIVER]: getBlockchainFactory(misc_1.EVMNetwork.MOONRIVER),
    [misc_1.EVMNetwork.METIS]: getBlockchainFactory(misc_1.EVMNetwork.METIS),
    [misc_1.EVMNetwork.ASTAR]: getBlockchainFactory(misc_1.EVMNetwork.ASTAR),
};
//# sourceMappingURL=EthereumBlockchainController.js.map