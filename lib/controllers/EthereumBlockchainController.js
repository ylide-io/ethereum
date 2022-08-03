"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ethereumBlockchainFactory = exports.EthereumBlockchainController = void 0;
var smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
var sdk_1 = require("@ylide/sdk");
var constants_1 = require("../misc/constants");
var contracts_1 = require("../contracts");
var web3_1 = __importDefault(require("web3"));
var EthereumBlockchainController = /** @class */ (function (_super) {
    __extends(EthereumBlockchainController, _super);
    function EthereumBlockchainController(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, options) || this;
        _this.MESSAGES_FETCH_LIMIT = 50;
        // @ts-ignore
        _this.web3 = window.www3 = new web3_1.default((options === null || options === void 0 ? void 0 : options.web3Provider) || web3_1.default.givenProvider);
        _this.mailerContract = new contracts_1.MailerContract(_this, options.mailerContractAddress || (options.dev ? constants_1.DEV_MAILER_ADDRESS : constants_1.MAILER_ADDRESS));
        _this.registryContract = new contracts_1.RegistryContract(_this, options.registryContractAddress || (options.dev ? constants_1.DEV_REGISTRY_ADDRESS : constants_1.REGISTRY_ADDRESS));
        return _this;
    }
    EthereumBlockchainController.prototype.getRecipientReadingRules = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    EthereumBlockchainController.prototype.extractAddressFromPublicKey = function (publicKey) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this.registryContract.getAddressByPublicKey(publicKey.bytes)];
            });
        });
    };
    EthereumBlockchainController.prototype.extractPublicKeyFromAddress = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            var rawKey;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.registryContract.getPublicKeyByAddress(address)];
                    case 1:
                        rawKey = _a.sent();
                        if (!rawKey) {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/, sdk_1.PublicKey.fromBytes(sdk_1.PublicKeyType.YLIDE, rawKey)];
                }
            });
        });
    };
    // message history block
    // Query messages by interval options.since (included) - options.to (excluded)
    EthereumBlockchainController.prototype.retrieveMessageHistoryByDates = function (recipientAddress, options) {
        return __awaiter(this, void 0, void 0, function () {
            var fullMessages, _loop_1, this_1, state_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fullMessages = [];
                        console.log('bbb');
                        _loop_1 = function () {
                            var messages, foundDuplicate, _b, _c, _d;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0: return [4 /*yield*/, this_1.queryMessagesList(recipientAddress, null, null)];
                                    case 1:
                                        messages = _e.sent();
                                        if (!messages.length)
                                            return [2 /*return*/, "break"];
                                        foundDuplicate = false;
                                        _c = (_b = fullMessages.push).apply;
                                        _d = [fullMessages];
                                        return [4 /*yield*/, Promise.all(messages.map(function (m) { return __awaiter(_this, void 0, void 0, function () {
                                                var content;
                                                var _a;
                                                return __generator(this, function (_b) {
                                                    switch (_b.label) {
                                                        case 0:
                                                            if (m.msgId === ((_a = options === null || options === void 0 ? void 0 : options.toMessage) === null || _a === void 0 ? void 0 : _a.msgId)) {
                                                                foundDuplicate = true;
                                                            }
                                                            console.log('ggg');
                                                            return [4 /*yield*/, this.retrieveMessageContentByMsgId(m.msgId)];
                                                        case 1:
                                                            content = _b.sent();
                                                            if (content && !content.corrupted) {
                                                                m.isContentLoaded = true;
                                                                m.contentLink = content;
                                                            }
                                                            return [2 /*return*/, m];
                                                    }
                                                });
                                            }); }))];
                                    case 2:
                                        _c.apply(_b, _d.concat([(_e.sent())]));
                                        if (foundDuplicate)
                                            return [2 /*return*/, "break"];
                                        if (messages.length < this_1.MESSAGES_FETCH_LIMIT)
                                            return [2 /*return*/, "break"];
                                        return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 1;
                    case 1:
                        if (!true) return [3 /*break*/, 3];
                        return [5 /*yield**/, _loop_1()];
                    case 2:
                        state_1 = _a.sent();
                        if (state_1 === "break")
                            return [3 /*break*/, 3];
                        return [3 /*break*/, 1];
                    case 3: return [2 /*return*/, fullMessages];
                }
            });
        });
    };
    EthereumBlockchainController.prototype.retrieveAndVerifyMessageContent = function (msg) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.retrieveMessageContentByMsgId(msg.msgId)];
                    case 1:
                        result = _a.sent();
                        if (!result) {
                            return [2 /*return*/, null];
                        }
                        if (result.corrupted) {
                            return [2 /*return*/, result];
                        }
                        if (result.senderAddress !== msg.senderAddress) {
                            return [2 /*return*/, {
                                    msgId: msg.msgId,
                                    corrupted: true,
                                    chunks: [],
                                    reason: sdk_1.MessageContentFailure.NON_INTEGRITY_PARTS,
                                }];
                        }
                        return [2 /*return*/, result];
                }
            });
        });
    };
    EthereumBlockchainController.prototype.retrieveMessageContentByMsgId = function (msgId) {
        return __awaiter(this, void 0, void 0, function () {
            var msgIdAsUint256, messages, _a, decodedChunks, parts, sender, _loop_2, idx, state_2, sortedChunks, contentSize, buf, _i, sortedChunks_1, chunk;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log('hhh');
                        msgIdAsUint256 = BigInt('0x' + msgId).toString(10);
                        console.log('iii: ', msgId);
                        _a = this.processMessages;
                        return [4 /*yield*/, this.mailerContract.contract.getPastEvents('MailContent', {
                                filter: {
                                    msgId: '0x' + msgId,
                                },
                            })];
                    case 1: return [4 /*yield*/, _a.apply(this, [_b.sent()])];
                    case 2:
                        messages = _b.sent();
                        console.log('aaa');
                        if (!messages.length) {
                            return [2 /*return*/, null];
                        }
                        try {
                            decodedChunks = messages.map(function (m) { return ({
                                msg: m,
                                body: _this.mailerContract.decodeContentMessageBody(m.event),
                            }); });
                        }
                        catch (err) {
                            return [2 /*return*/, {
                                    msgId: msgId,
                                    corrupted: true,
                                    chunks: messages.map(function (m) { return ({ createdAt: Number(m.block.timestamp) }); }),
                                    reason: sdk_1.MessageContentFailure.NON_DECRYPTABLE,
                                }];
                        }
                        parts = decodedChunks[0].body.parts;
                        sender = decodedChunks[0].body.sender;
                        if (!decodedChunks.every(function (t) { return t.body.parts === parts; }) || !decodedChunks.every(function (t) { return t.body.sender === sender; })) {
                            return [2 /*return*/, {
                                    msgId: msgId,
                                    corrupted: true,
                                    chunks: decodedChunks.map(function (m) { return ({ createdAt: Number(m.msg.block.timestamp) }); }),
                                    reason: sdk_1.MessageContentFailure.NON_INTEGRITY_PARTS,
                                }];
                        }
                        _loop_2 = function (idx) {
                            if (!decodedChunks.find(function (d) { return d.body.partIdx === idx; })) {
                                return { value: {
                                        msgId: msgId,
                                        corrupted: true,
                                        chunks: decodedChunks.map(function (m) { return ({ createdAt: Number(m.msg.block.timestamp) }); }),
                                        reason: sdk_1.MessageContentFailure.NOT_ALL_PARTS,
                                    } };
                            }
                        };
                        for (idx = 0; idx < parts; idx++) {
                            state_2 = _loop_2(idx);
                            if (typeof state_2 === "object")
                                return [2 /*return*/, state_2.value];
                        }
                        if (decodedChunks.length !== parts) {
                            return [2 /*return*/, {
                                    msgId: msgId,
                                    corrupted: true,
                                    chunks: decodedChunks.map(function (m) { return ({ createdAt: Number(m.msg.block.timestamp) }); }),
                                    reason: sdk_1.MessageContentFailure.DOUBLED_PARTS,
                                }];
                        }
                        sortedChunks = decodedChunks
                            .sort(function (a, b) {
                            return a.body.partIdx - b.body.partIdx;
                        })
                            .map(function (m) { return m.body.content; });
                        contentSize = sortedChunks.reduce(function (p, c) { return p + c.length; }, 0);
                        buf = smart_buffer_1.default.ofSize(contentSize);
                        for (_i = 0, sortedChunks_1 = sortedChunks; _i < sortedChunks_1.length; _i++) {
                            chunk = sortedChunks_1[_i];
                            buf.writeBytes(chunk);
                        }
                        return [2 /*return*/, {
                                msgId: msgId,
                                corrupted: false,
                                storage: 'everscale',
                                createdAt: Math.min.apply(Math, decodedChunks.map(function (d) { return Number(d.msg.block.timestamp); })),
                                senderAddress: sender,
                                parts: parts,
                                content: buf.bytes,
                            }];
                }
            });
        });
    };
    EthereumBlockchainController.prototype.formatPushMessage = function (message) {
        var _a = message.event.returnValues, recipientUint256 = _a.recipient, sender = _a.sender, msgId = _a.msgId, key = _a.key;
        var recipient = (0, sdk_1.bigIntToUint256)(String(recipientUint256));
        var createdAt = message.block.timestamp;
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
    };
    EthereumBlockchainController.prototype.isAddressValid = function (address) {
        return this.web3.utils.isAddress(address);
    };
    EthereumBlockchainController.prototype.processMessages = function (msgs) {
        return __awaiter(this, void 0, void 0, function () {
            var txHashes, blockHashes, batch, txsPromise, blocksPromise, txs, blocks, txMap, blockMap;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        txHashes = msgs.map(function (e) { return e.transactionHash; }).filter(function (e, i, a) { return a.indexOf(e) === i; });
                        blockHashes = msgs.map(function (e) { return e.blockHash; }).filter(function (e, i, a) { return a.indexOf(e) === i; });
                        batch = new this.web3.BatchRequest();
                        txsPromise = Promise.all(txHashes.map(function (txHash) {
                            return new Promise(function (resolve, reject) {
                                batch.add(
                                // @ts-ignore
                                _this.web3.eth.getTransaction.request(txHash, function (err, tx) {
                                    if (err) {
                                        return reject(err);
                                    }
                                    else {
                                        return resolve(tx);
                                    }
                                }));
                            });
                        }));
                        blocksPromise = Promise.all(blockHashes.map(function (blockHash) {
                            return new Promise(function (resolve, reject) {
                                batch.add(
                                // @ts-ignore
                                _this.web3.eth.getBlock.request(blockHash, false, function (err, block) {
                                    if (err) {
                                        return reject(err);
                                    }
                                    else {
                                        return resolve(block);
                                    }
                                }));
                            });
                        }));
                        batch.execute();
                        return [4 /*yield*/, txsPromise];
                    case 1:
                        txs = _a.sent();
                        return [4 /*yield*/, blocksPromise];
                    case 2:
                        blocks = _a.sent();
                        txMap = txs.reduce(function (p, c) {
                            var _a;
                            return (__assign(__assign({}, p), (_a = {}, _a[c.hash] = c, _a)));
                        }, {});
                        blockMap = blocks.reduce(function (p, c) {
                            var _a;
                            return (__assign(__assign({}, p), (_a = {}, _a[c.hash] = c, _a)));
                        }, {});
                        return [2 /*return*/, msgs.map(function (ev) { return ({ event: ev, tx: txMap[ev.transactionHash], block: blockMap[ev.blockHash] }); })];
                }
            });
        });
    };
    // Query messages by interval sinceDate(excluded) - untilDate (excluded)
    EthereumBlockchainController.prototype.queryMessagesList = function (recipientAddress, fromBlock, toBlock) {
        return __awaiter(this, void 0, void 0, function () {
            var events, msgs, messages;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.mailerContract.contract.getPastEvents('MailPush', {
                            filter: {
                                recipient: '0x' + recipientAddress,
                            },
                            fromBlock: fromBlock || 0,
                            toBlock: toBlock || 'latest',
                        })];
                    case 1:
                        events = _a.sent();
                        return [4 /*yield*/, this.processMessages(events)];
                    case 2:
                        msgs = _a.sent();
                        messages = msgs.map(function (ev) { return _this.formatPushMessage(ev); });
                        return [2 /*return*/, messages];
                }
            });
        });
    };
    EthereumBlockchainController.prototype.getExtraEncryptionStrategiesFromAddress = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, []];
            });
        });
    };
    EthereumBlockchainController.prototype.getSupportedExtraEncryptionStrategies = function () {
        return [];
    };
    EthereumBlockchainController.prototype.prepareExtraEncryptionStrategyBulk = function (entries) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('No native strategies supported for Ethereum');
            });
        });
    };
    EthereumBlockchainController.prototype.executeExtraEncryptionStrategy = function (entries, bulk, addedPublicKeyIndex, messageKey) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                throw new Error('No native strategies supported for Ethereum');
            });
        });
    };
    EthereumBlockchainController.prototype.uint256ToAddress = function (value, withPrefix) {
        if (withPrefix === void 0) { withPrefix = true; }
        return '0x' + new smart_buffer_1.default(value.slice(12)).toHexString();
    };
    EthereumBlockchainController.prototype.addressToUint256 = function (address) {
        var lowerAddress = address.toLowerCase();
        var cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
        console.log('yonny: ', ''.padStart(24, '0') + cleanHexAddress);
        return (0, sdk_1.hexToUint256)(''.padStart(24, '0') + cleanHexAddress);
    };
    return EthereumBlockchainController;
}(sdk_1.AbstractBlockchainController));
exports.EthereumBlockchainController = EthereumBlockchainController;
exports.ethereumBlockchainFactory = {
    create: function (options) { return new EthereumBlockchainController(options); },
    blockchain: 'ethereum',
};
//# sourceMappingURL=EthereumBlockchainController.js.map