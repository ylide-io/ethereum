"use strict";
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
exports.MailerContract = void 0;
var sdk_1 = require("@ylide/sdk");
var smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
var misc_1 = require("../misc");
var MailerContract = /** @class */ (function () {
    function MailerContract(blockchainController, contractAddress) {
        this.blockchainController = blockchainController;
        this.contractAddress = contractAddress;
        this.contract = new this.blockchainController.web3.eth.Contract(MAILER_ABI.abi, this.contractAddress);
    }
    MailerContract.prototype.buildHash = function (address, uniqueId, time) {
        return __awaiter(this, void 0, void 0, function () {
            var lowerAddress, cleanHexAddress, addressBytes, args, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        lowerAddress = address.toLowerCase();
                        cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
                        addressBytes = smart_buffer_1.default.ofHexString(''.padStart(24, '0') + cleanHexAddress).bytes;
                        args = {
                            senderAddress: (0, misc_1.publicKeyToBigIntString)(addressBytes),
                            uniqueId: uniqueId,
                            time: time,
                        };
                        return [4 /*yield*/, this.contract.methods.buildHash(args).call()];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, (0, sdk_1.bigIntToUint256)(BigInt(result._hash).toString(10))];
                }
            });
        });
    };
    MailerContract.prototype.estimateAndCall = function (address, method, args) {
        return __awaiter(this, void 0, void 0, function () {
            var data, gasPrice, gas;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        data = this.blockchainController.web3.eth.abi.encodeFunctionCall(MAILER_ABI.abi.find(function (t) { return t.name === method; }), args);
                        console.log('123');
                        return [4 /*yield*/, this.blockchainController.web3.eth.getGasPrice()];
                    case 1:
                        gasPrice = _b.sent();
                        return [4 /*yield*/, this.blockchainController.web3.eth.estimateGas({
                                to: this.contract.options.address,
                                data: data,
                            })];
                    case 2:
                        gas = _b.sent();
                        console.log('456');
                        return [4 /*yield*/, (_a = this.contract.methods)[method].apply(_a, args).send({ from: address, gas: gas, gasPrice: gasPrice })];
                    case 3: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    MailerContract.prototype.setFees = function (address, _contentPartFee, _recipientFee) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.estimateAndCall(address, 'setFees', [
                            _contentPartFee.toString(10),
                            _recipientFee.toString(10),
                        ])];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MailerContract.prototype.transferOwnership = function (address, newOwner) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.estimateAndCall(address, 'transferOwnership', [newOwner])];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MailerContract.prototype.setBeneficiary = function (address, _beneficiary) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.estimateAndCall(address, 'setBeneficiary', [_beneficiary])];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MailerContract.prototype.addRecipients = function (address, uniqueId, initTime, recipients, keys) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.estimateAndCall(address, 'addRecipients', [
                            uniqueId,
                            initTime,
                            recipients.map(function (r) { return '0x' + r; }),
                            keys.map(function (k) { return '0x' + new smart_buffer_1.default(k).toBase64String(); }),
                        ])];
                    case 1: 
                    // uint32 uniqueId, uint32 initTime, address[] recipients, bytes[] keys
                    return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MailerContract.prototype.sendMultipartMailPart = function (address, uniqueId, initTime, parts, partIdx, content) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.estimateAndCall(address, 'sendMultipartMailPart', [
                            uniqueId,
                            initTime,
                            parts,
                            partIdx,
                            '0x' + new smart_buffer_1.default(content).toHexString(),
                        ])];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MailerContract.prototype.sendSmallMail = function (address, uniqueId, recipient, key, content) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.estimateAndCall(address, 'sendSmallMail', [
                            uniqueId,
                            '0x' + recipient,
                            '0x' + new smart_buffer_1.default(key).toHexString(),
                            '0x' + new smart_buffer_1.default(content).toHexString(),
                        ])];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MailerContract.prototype.sendBulkMail = function (address, uniqueId, recipients, keys, content) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log('abc');
                        return [4 /*yield*/, this.estimateAndCall(address, 'sendBulkMail', [
                                uniqueId,
                                recipients.map(function (r) { return '0x' + r; }),
                                keys.map(function (k) { return '0x' + new smart_buffer_1.default(k).toHexString(); }),
                                '0x' + new smart_buffer_1.default(content).toHexString(),
                            ])];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    MailerContract.prototype.decodeContentMessageBody = function (ev) {
        var _a = ev.returnValues, msgId = _a.msgId, sender = _a.sender, parts = _a.parts, partIdx = _a.partIdx, content = _a.content;
        return {
            sender: sender,
            msgId: (0, sdk_1.bigIntToUint256)(msgId),
            parts: Number(parts),
            partIdx: Number(partIdx),
            content: smart_buffer_1.default.ofHexString(content.substring(2)).bytes,
        };
    };
    return MailerContract;
}());
exports.MailerContract = MailerContract;
var MAILER_ABI = {
    _format: 'hh-sol-artifact-1',
    contractName: 'YlideMailerV4',
    sourceName: 'contracts/YlideMailerV4.sol',
    abi: [
        {
            inputs: [],
            stateMutability: 'nonpayable',
            type: 'constructor',
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: 'uint256',
                    name: 'msgId',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'address',
                    name: 'sender',
                    type: 'address',
                },
                {
                    indexed: false,
                    internalType: 'uint16',
                    name: 'parts',
                    type: 'uint16',
                },
                {
                    indexed: false,
                    internalType: 'uint16',
                    name: 'partIdx',
                    type: 'uint16',
                },
                {
                    indexed: false,
                    internalType: 'bytes',
                    name: 'content',
                    type: 'bytes',
                },
            ],
            name: 'MailContent',
            type: 'event',
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: 'uint256',
                    name: 'recipient',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'address',
                    name: 'sender',
                    type: 'address',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'msgId',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'bytes',
                    name: 'key',
                    type: 'bytes',
                },
            ],
            name: 'MailPush',
            type: 'event',
        },
        {
            inputs: [
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint32',
                    name: 'initTime',
                    type: 'uint32',
                },
                {
                    internalType: 'uint256[]',
                    name: 'recipients',
                    type: 'uint256[]',
                },
                {
                    internalType: 'bytes[]',
                    name: 'keys',
                    type: 'bytes[]',
                },
            ],
            name: 'addRecipients',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [],
            name: 'beneficiary',
            outputs: [
                {
                    internalType: 'address payable',
                    name: '',
                    type: 'address',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'senderAddress',
                    type: 'uint256',
                },
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint32',
                    name: 'time',
                    type: 'uint32',
                },
            ],
            name: 'buildHash',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '_hash',
                    type: 'uint256',
                },
            ],
            stateMutability: 'pure',
            type: 'function',
        },
        {
            inputs: [],
            name: 'contentPartFee',
            outputs: [
                {
                    internalType: 'uint128',
                    name: '',
                    type: 'uint128',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'senderAddress',
                    type: 'uint256',
                },
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint32',
                    name: 'initTime',
                    type: 'uint32',
                },
            ],
            name: 'getMsgId',
            outputs: [
                {
                    internalType: 'uint256',
                    name: 'msgId',
                    type: 'uint256',
                },
            ],
            stateMutability: 'pure',
            type: 'function',
        },
        {
            inputs: [],
            name: 'owner',
            outputs: [
                {
                    internalType: 'address',
                    name: '',
                    type: 'address',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [],
            name: 'recipientFee',
            outputs: [
                {
                    internalType: 'uint128',
                    name: '',
                    type: 'uint128',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint256[]',
                    name: 'recipients',
                    type: 'uint256[]',
                },
                {
                    internalType: 'bytes[]',
                    name: 'keys',
                    type: 'bytes[]',
                },
                {
                    internalType: 'bytes',
                    name: 'content',
                    type: 'bytes',
                },
            ],
            name: 'sendBulkMail',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint32',
                    name: 'initTime',
                    type: 'uint32',
                },
                {
                    internalType: 'uint16',
                    name: 'parts',
                    type: 'uint16',
                },
                {
                    internalType: 'uint16',
                    name: 'partIdx',
                    type: 'uint16',
                },
                {
                    internalType: 'bytes',
                    name: 'content',
                    type: 'bytes',
                },
            ],
            name: 'sendMultipartMailPart',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint256',
                    name: 'recipient',
                    type: 'uint256',
                },
                {
                    internalType: 'bytes',
                    name: 'key',
                    type: 'bytes',
                },
                {
                    internalType: 'bytes',
                    name: 'content',
                    type: 'bytes',
                },
            ],
            name: 'sendSmallMail',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'address payable',
                    name: '_beneficiary',
                    type: 'address',
                },
            ],
            name: 'setBeneficiary',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint128',
                    name: '_contentPartFee',
                    type: 'uint128',
                },
                {
                    internalType: 'uint128',
                    name: '_recipientFee',
                    type: 'uint128',
                },
            ],
            name: 'setFees',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [],
            name: 'terminate',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'address',
                    name: 'newOwner',
                    type: 'address',
                },
            ],
            name: 'transferOwnership',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
    ],
    bytecode: '0x60806040526000600160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff1602179055506000600160106101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555034801561008457600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550611afa806100d46000396000f3fe608060405234801561001057600080fd5b50600436106100ea5760003560e01c8063409537a91161008c57806362dc23f31161006657806362dc23f31461020f5780638da5cb5b1461022b578063ef83767014610249578063f2fde38b14610279576100ea565b8063409537a9146101a557806340bda402146101d557806345c6c858146101f3576100ea565b80631eecf500116100c85780631eecf500146101315780631f2dcdbc1461014f57806332760c7a1461016b57806338af3eed14610187576100ea565b80630c08bf88146100ef5780631918b8fa146100f95780631c31f71014610115575b600080fd5b6100f7610295565b005b610113600480360381019061010e9190610f09565b610326565b005b61012f600480360381019061012a919061100e565b6104f9565b005b610139610595565b6040516101469190611066565b60405180910390f35b6101696004803603810190610164919061112d565b6105b7565b005b61018560048036038101906101809190611222565b61083b565b005b61018f610909565b60405161019c9190611271565b60405180910390f35b6101bf60048036038101906101ba919061128c565b61092f565b6040516101cc91906112ee565b60405180910390f35b6101dd6109be565b6040516101ea9190611066565b60405180910390f35b61020d60048036038101906102089190611309565b6109e0565b005b610229600480360381019061022491906113ea565b610bab565b005b610233610d1e565b60405161024091906114a5565b60405180910390f35b610263600480360381019061025e919061128c565b610d42565b60405161027091906112ee565b60405180910390f35b610293600480360381019061028e91906114ec565b610d58565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146102ed57600080fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b60006103493373ffffffffffffffffffffffffffffffffffffffff16884261092f565b9050807fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d29336001600087876040516103859594939291906115f7565b60405180910390a2857f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e338388886040516103c39493929190611645565b60405180910390a26000600160109054906101000a90046fffffffffffffffffffffffffffffffff16600160009054906101000a90046fffffffffffffffffffffffffffffffff1661041591906116b4565b6fffffffffffffffffffffffffffffffff1611156104f057600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc600160109054906101000a90046fffffffffffffffffffffffffffffffff16600160009054906101000a90046fffffffffffffffffffffffffffffffff166104b191906116b4565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f193505050501580156104ee573d6000803e3d6000fd5b505b50505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461055157600080fd5b80600260006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b600160009054906101000a90046fffffffffffffffffffffffffffffffff1681565b60006105da3373ffffffffffffffffffffffffffffffffffffffff16894261092f565b9050807fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d29336001600087876040516106169594939291906115f7565b60405180910390a260005b878790508110156106b95787878281811061063f5761063e6116fa565b5b905060200201357f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e338489898681811061067c5761067b6116fa565b5b905060200281019061068e9190611738565b60405161069e9493929190611645565b60405180910390a280806106b19061179b565b915050610621565b50600087879050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166106fb91906117e4565b600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff16610736919061183e565b111561083157600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc88889050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166107b791906117e4565b600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166107f2919061183e565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f1935050505015801561082f573d6000803e3d6000fd5b505b5050505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461089357600080fd5b81600160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555080600160106101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff1602179055505050565b600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000808460001b8460e01b8460e01b6040516020016109509392919061190c565b604051602081830303815290604052905060028160405161097191906119c3565b602060405180830381855afa15801561098e573d6000803e3d6000fd5b5050506040513d601f19601f820116820180604052508101906109b19190611a06565b60001c9150509392505050565b600160109054906101000a90046fffffffffffffffffffffffffffffffff1681565b6000610a033373ffffffffffffffffffffffffffffffffffffffff16888861092f565b905060005b85859050811015610aa057858582818110610a2657610a256116fa565b5b905060200201357f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e3384878786818110610a6357610a626116fa565b5b9050602002810190610a759190611738565b604051610a859493929190611645565b60405180910390a28080610a989061179b565b915050610a08565b50600085859050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff16610ae291906117e4565b1115610ba257600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc86869050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff16610b6391906117e4565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610ba0573d6000803e3d6000fd5b505b50505050505050565b8463ffffffff16421015610bbe57600080fd5b6102588563ffffffff1642610bd39190611a33565b10610bdd57600080fd5b6000610c003373ffffffffffffffffffffffffffffffffffffffff16888861092f565b9050807fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d293387878787604051610c3a959493929190611a76565b60405180910390a26000600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff161115610d1557600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610d13573d6000803e3d6000fd5b505b50505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000610d4f84848461092f565b90509392505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610db057600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614610e2557806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b50565b600080fd5b600080fd5b600063ffffffff82169050919050565b610e4b81610e32565b8114610e5657600080fd5b50565b600081359050610e6881610e42565b92915050565b6000819050919050565b610e8181610e6e565b8114610e8c57600080fd5b50565b600081359050610e9e81610e78565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f840112610ec957610ec8610ea4565b5b8235905067ffffffffffffffff811115610ee657610ee5610ea9565b5b602083019150836001820283011115610f0257610f01610eae565b5b9250929050565b60008060008060008060808789031215610f2657610f25610e28565b5b6000610f3489828a01610e59565b9650506020610f4589828a01610e8f565b955050604087013567ffffffffffffffff811115610f6657610f65610e2d565b5b610f7289828a01610eb3565b9450945050606087013567ffffffffffffffff811115610f9557610f94610e2d565b5b610fa189828a01610eb3565b92509250509295509295509295565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610fdb82610fb0565b9050919050565b610feb81610fd0565b8114610ff657600080fd5b50565b60008135905061100881610fe2565b92915050565b60006020828403121561102457611023610e28565b5b600061103284828501610ff9565b91505092915050565b60006fffffffffffffffffffffffffffffffff82169050919050565b6110608161103b565b82525050565b600060208201905061107b6000830184611057565b92915050565b60008083601f84011261109757611096610ea4565b5b8235905067ffffffffffffffff8111156110b4576110b3610ea9565b5b6020830191508360208202830111156110d0576110cf610eae565b5b9250929050565b60008083601f8401126110ed576110ec610ea4565b5b8235905067ffffffffffffffff81111561110a57611109610ea9565b5b60208301915083602082028301111561112657611125610eae565b5b9250929050565b60008060008060008060006080888a03121561114c5761114b610e28565b5b600061115a8a828b01610e59565b975050602088013567ffffffffffffffff81111561117b5761117a610e2d565b5b6111878a828b01611081565b9650965050604088013567ffffffffffffffff8111156111aa576111a9610e2d565b5b6111b68a828b016110d7565b9450945050606088013567ffffffffffffffff8111156111d9576111d8610e2d565b5b6111e58a828b01610eb3565b925092505092959891949750929550565b6111ff8161103b565b811461120a57600080fd5b50565b60008135905061121c816111f6565b92915050565b6000806040838503121561123957611238610e28565b5b60006112478582860161120d565b92505060206112588582860161120d565b9150509250929050565b61126b81610fd0565b82525050565b60006020820190506112866000830184611262565b92915050565b6000806000606084860312156112a5576112a4610e28565b5b60006112b386828701610e8f565b93505060206112c486828701610e59565b92505060406112d586828701610e59565b9150509250925092565b6112e881610e6e565b82525050565b600060208201905061130360008301846112df565b92915050565b6000806000806000806080878903121561132657611325610e28565b5b600061133489828a01610e59565b965050602061134589828a01610e59565b955050604087013567ffffffffffffffff81111561136657611365610e2d565b5b61137289828a01611081565b9450945050606087013567ffffffffffffffff81111561139557611394610e2d565b5b6113a189828a016110d7565b92509250509295509295509295565b600061ffff82169050919050565b6113c7816113b0565b81146113d257600080fd5b50565b6000813590506113e4816113be565b92915050565b60008060008060008060a0878903121561140757611406610e28565b5b600061141589828a01610e59565b965050602061142689828a01610e59565b955050604061143789828a016113d5565b945050606061144889828a016113d5565b935050608087013567ffffffffffffffff81111561146957611468610e2d565b5b61147589828a01610eb3565b92509250509295509295509295565b600061148f82610fb0565b9050919050565b61149f81611484565b82525050565b60006020820190506114ba6000830184611496565b92915050565b6114c981611484565b81146114d457600080fd5b50565b6000813590506114e6816114c0565b92915050565b60006020828403121561150257611501610e28565b5b6000611510848285016114d7565b91505092915050565b6000819050919050565b6000819050919050565b600061154861154361153e84611519565b611523565b6113b0565b9050919050565b6115588161152d565b82525050565b6000819050919050565b600061158361157e6115798461155e565b611523565b6113b0565b9050919050565b61159381611568565b82525050565b600082825260208201905092915050565b82818337600083830152505050565b6000601f19601f8301169050919050565b60006115d68385611599565b93506115e38385846115aa565b6115ec836115b9565b840190509392505050565b600060808201905061160c6000830188611496565b611619602083018761154f565b611626604083018661158a565b81810360608301526116398184866115ca565b90509695505050505050565b600060608201905061165a6000830187611496565b61166760208301866112df565b818103604083015261167a8184866115ca565b905095945050505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60006116bf8261103b565b91506116ca8361103b565b9250826fffffffffffffffffffffffffffffffff038211156116ef576116ee611685565b5b828201905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600080fd5b600080fd5b600080fd5b6000808335600160200384360303811261175557611754611729565b5b80840192508235915067ffffffffffffffff8211156117775761177661172e565b5b60208301925060018202360383131561179357611792611733565b5b509250929050565b60006117a682610e6e565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8214156117d9576117d8611685565b5b600182019050919050565b60006117ef82610e6e565b91506117fa83610e6e565b9250817fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff048311821515161561183357611832611685565b5b828202905092915050565b600061184982610e6e565b915061185483610e6e565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0382111561188957611888611685565b5b828201905092915050565b6000819050919050565b6000819050919050565b6118b96118b482611894565b61189e565b82525050565b60007fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b6000819050919050565b611906611901826118bf565b6118eb565b82525050565b600061191882866118a8565b60208201915061192882856118f5565b60048201915061193882846118f5565b600482019150819050949350505050565b600081519050919050565b600081905092915050565b60005b8381101561197d578082015181840152602081019050611962565b8381111561198c576000848401525b50505050565b600061199d82611949565b6119a78185611954565b93506119b781856020860161195f565b80840191505092915050565b60006119cf8284611992565b915081905092915050565b6119e381611894565b81146119ee57600080fd5b50565b600081519050611a00816119da565b92915050565b600060208284031215611a1c57611a1b610e28565b5b6000611a2a848285016119f1565b91505092915050565b6000611a3e82610e6e565b9150611a4983610e6e565b925082821015611a5c57611a5b611685565b5b828203905092915050565b611a70816113b0565b82525050565b6000608082019050611a8b6000830188611496565b611a986020830187611a67565b611aa56040830186611a67565b8181036060830152611ab88184866115ca565b9050969550505050505056fea26469706673582212202f9b958d5d59f7995144635a477a137143e1a37a95380cc47d0740fb57a265cc64736f6c63430008090033',
    deployedBytecode: '0x608060405234801561001057600080fd5b50600436106100ea5760003560e01c8063409537a91161008c57806362dc23f31161006657806362dc23f31461020f5780638da5cb5b1461022b578063ef83767014610249578063f2fde38b14610279576100ea565b8063409537a9146101a557806340bda402146101d557806345c6c858146101f3576100ea565b80631eecf500116100c85780631eecf500146101315780631f2dcdbc1461014f57806332760c7a1461016b57806338af3eed14610187576100ea565b80630c08bf88146100ef5780631918b8fa146100f95780631c31f71014610115575b600080fd5b6100f7610295565b005b610113600480360381019061010e9190610f09565b610326565b005b61012f600480360381019061012a919061100e565b6104f9565b005b610139610595565b6040516101469190611066565b60405180910390f35b6101696004803603810190610164919061112d565b6105b7565b005b61018560048036038101906101809190611222565b61083b565b005b61018f610909565b60405161019c9190611271565b60405180910390f35b6101bf60048036038101906101ba919061128c565b61092f565b6040516101cc91906112ee565b60405180910390f35b6101dd6109be565b6040516101ea9190611066565b60405180910390f35b61020d60048036038101906102089190611309565b6109e0565b005b610229600480360381019061022491906113ea565b610bab565b005b610233610d1e565b60405161024091906114a5565b60405180910390f35b610263600480360381019061025e919061128c565b610d42565b60405161027091906112ee565b60405180910390f35b610293600480360381019061028e91906114ec565b610d58565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146102ed57600080fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b60006103493373ffffffffffffffffffffffffffffffffffffffff16884261092f565b9050807fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d29336001600087876040516103859594939291906115f7565b60405180910390a2857f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e338388886040516103c39493929190611645565b60405180910390a26000600160109054906101000a90046fffffffffffffffffffffffffffffffff16600160009054906101000a90046fffffffffffffffffffffffffffffffff1661041591906116b4565b6fffffffffffffffffffffffffffffffff1611156104f057600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc600160109054906101000a90046fffffffffffffffffffffffffffffffff16600160009054906101000a90046fffffffffffffffffffffffffffffffff166104b191906116b4565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f193505050501580156104ee573d6000803e3d6000fd5b505b50505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461055157600080fd5b80600260006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b600160009054906101000a90046fffffffffffffffffffffffffffffffff1681565b60006105da3373ffffffffffffffffffffffffffffffffffffffff16894261092f565b9050807fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d29336001600087876040516106169594939291906115f7565b60405180910390a260005b878790508110156106b95787878281811061063f5761063e6116fa565b5b905060200201357f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e338489898681811061067c5761067b6116fa565b5b905060200281019061068e9190611738565b60405161069e9493929190611645565b60405180910390a280806106b19061179b565b915050610621565b50600087879050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166106fb91906117e4565b600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff16610736919061183e565b111561083157600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc88889050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166107b791906117e4565b600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166107f2919061183e565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f1935050505015801561082f573d6000803e3d6000fd5b505b5050505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461089357600080fd5b81600160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555080600160106101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff1602179055505050565b600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000808460001b8460e01b8460e01b6040516020016109509392919061190c565b604051602081830303815290604052905060028160405161097191906119c3565b602060405180830381855afa15801561098e573d6000803e3d6000fd5b5050506040513d601f19601f820116820180604052508101906109b19190611a06565b60001c9150509392505050565b600160109054906101000a90046fffffffffffffffffffffffffffffffff1681565b6000610a033373ffffffffffffffffffffffffffffffffffffffff16888861092f565b905060005b85859050811015610aa057858582818110610a2657610a256116fa565b5b905060200201357f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e3384878786818110610a6357610a626116fa565b5b9050602002810190610a759190611738565b604051610a859493929190611645565b60405180910390a28080610a989061179b565b915050610a08565b50600085859050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff16610ae291906117e4565b1115610ba257600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc86869050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff16610b6391906117e4565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610ba0573d6000803e3d6000fd5b505b50505050505050565b8463ffffffff16421015610bbe57600080fd5b6102588563ffffffff1642610bd39190611a33565b10610bdd57600080fd5b6000610c003373ffffffffffffffffffffffffffffffffffffffff16888861092f565b9050807fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d293387878787604051610c3a959493929190611a76565b60405180910390a26000600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff161115610d1557600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610d13573d6000803e3d6000fd5b505b50505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000610d4f84848461092f565b90509392505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610db057600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614610e2557806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b50565b600080fd5b600080fd5b600063ffffffff82169050919050565b610e4b81610e32565b8114610e5657600080fd5b50565b600081359050610e6881610e42565b92915050565b6000819050919050565b610e8181610e6e565b8114610e8c57600080fd5b50565b600081359050610e9e81610e78565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f840112610ec957610ec8610ea4565b5b8235905067ffffffffffffffff811115610ee657610ee5610ea9565b5b602083019150836001820283011115610f0257610f01610eae565b5b9250929050565b60008060008060008060808789031215610f2657610f25610e28565b5b6000610f3489828a01610e59565b9650506020610f4589828a01610e8f565b955050604087013567ffffffffffffffff811115610f6657610f65610e2d565b5b610f7289828a01610eb3565b9450945050606087013567ffffffffffffffff811115610f9557610f94610e2d565b5b610fa189828a01610eb3565b92509250509295509295509295565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000610fdb82610fb0565b9050919050565b610feb81610fd0565b8114610ff657600080fd5b50565b60008135905061100881610fe2565b92915050565b60006020828403121561102457611023610e28565b5b600061103284828501610ff9565b91505092915050565b60006fffffffffffffffffffffffffffffffff82169050919050565b6110608161103b565b82525050565b600060208201905061107b6000830184611057565b92915050565b60008083601f84011261109757611096610ea4565b5b8235905067ffffffffffffffff8111156110b4576110b3610ea9565b5b6020830191508360208202830111156110d0576110cf610eae565b5b9250929050565b60008083601f8401126110ed576110ec610ea4565b5b8235905067ffffffffffffffff81111561110a57611109610ea9565b5b60208301915083602082028301111561112657611125610eae565b5b9250929050565b60008060008060008060006080888a03121561114c5761114b610e28565b5b600061115a8a828b01610e59565b975050602088013567ffffffffffffffff81111561117b5761117a610e2d565b5b6111878a828b01611081565b9650965050604088013567ffffffffffffffff8111156111aa576111a9610e2d565b5b6111b68a828b016110d7565b9450945050606088013567ffffffffffffffff8111156111d9576111d8610e2d565b5b6111e58a828b01610eb3565b925092505092959891949750929550565b6111ff8161103b565b811461120a57600080fd5b50565b60008135905061121c816111f6565b92915050565b6000806040838503121561123957611238610e28565b5b60006112478582860161120d565b92505060206112588582860161120d565b9150509250929050565b61126b81610fd0565b82525050565b60006020820190506112866000830184611262565b92915050565b6000806000606084860312156112a5576112a4610e28565b5b60006112b386828701610e8f565b93505060206112c486828701610e59565b92505060406112d586828701610e59565b9150509250925092565b6112e881610e6e565b82525050565b600060208201905061130360008301846112df565b92915050565b6000806000806000806080878903121561132657611325610e28565b5b600061133489828a01610e59565b965050602061134589828a01610e59565b955050604087013567ffffffffffffffff81111561136657611365610e2d565b5b61137289828a01611081565b9450945050606087013567ffffffffffffffff81111561139557611394610e2d565b5b6113a189828a016110d7565b92509250509295509295509295565b600061ffff82169050919050565b6113c7816113b0565b81146113d257600080fd5b50565b6000813590506113e4816113be565b92915050565b60008060008060008060a0878903121561140757611406610e28565b5b600061141589828a01610e59565b965050602061142689828a01610e59565b955050604061143789828a016113d5565b945050606061144889828a016113d5565b935050608087013567ffffffffffffffff81111561146957611468610e2d565b5b61147589828a01610eb3565b92509250509295509295509295565b600061148f82610fb0565b9050919050565b61149f81611484565b82525050565b60006020820190506114ba6000830184611496565b92915050565b6114c981611484565b81146114d457600080fd5b50565b6000813590506114e6816114c0565b92915050565b60006020828403121561150257611501610e28565b5b6000611510848285016114d7565b91505092915050565b6000819050919050565b6000819050919050565b600061154861154361153e84611519565b611523565b6113b0565b9050919050565b6115588161152d565b82525050565b6000819050919050565b600061158361157e6115798461155e565b611523565b6113b0565b9050919050565b61159381611568565b82525050565b600082825260208201905092915050565b82818337600083830152505050565b6000601f19601f8301169050919050565b60006115d68385611599565b93506115e38385846115aa565b6115ec836115b9565b840190509392505050565b600060808201905061160c6000830188611496565b611619602083018761154f565b611626604083018661158a565b81810360608301526116398184866115ca565b90509695505050505050565b600060608201905061165a6000830187611496565b61166760208301866112df565b818103604083015261167a8184866115ca565b905095945050505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60006116bf8261103b565b91506116ca8361103b565b9250826fffffffffffffffffffffffffffffffff038211156116ef576116ee611685565b5b828201905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600080fd5b600080fd5b600080fd5b6000808335600160200384360303811261175557611754611729565b5b80840192508235915067ffffffffffffffff8211156117775761177661172e565b5b60208301925060018202360383131561179357611792611733565b5b509250929050565b60006117a682610e6e565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8214156117d9576117d8611685565b5b600182019050919050565b60006117ef82610e6e565b91506117fa83610e6e565b9250817fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff048311821515161561183357611832611685565b5b828202905092915050565b600061184982610e6e565b915061185483610e6e565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0382111561188957611888611685565b5b828201905092915050565b6000819050919050565b6000819050919050565b6118b96118b482611894565b61189e565b82525050565b60007fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b6000819050919050565b611906611901826118bf565b6118eb565b82525050565b600061191882866118a8565b60208201915061192882856118f5565b60048201915061193882846118f5565b600482019150819050949350505050565b600081519050919050565b600081905092915050565b60005b8381101561197d578082015181840152602081019050611962565b8381111561198c576000848401525b50505050565b600061199d82611949565b6119a78185611954565b93506119b781856020860161195f565b80840191505092915050565b60006119cf8284611992565b915081905092915050565b6119e381611894565b81146119ee57600080fd5b50565b600081519050611a00816119da565b92915050565b600060208284031215611a1c57611a1b610e28565b5b6000611a2a848285016119f1565b91505092915050565b6000611a3e82610e6e565b9150611a4983610e6e565b925082821015611a5c57611a5b611685565b5b828203905092915050565b611a70816113b0565b82525050565b6000608082019050611a8b6000830188611496565b611a986020830187611a67565b611aa56040830186611a67565b8181036060830152611ab88184866115ca565b9050969550505050505056fea26469706673582212202f9b958d5d59f7995144635a477a137143e1a37a95380cc47d0740fb57a265cc64736f6c63430008090033',
    linkReferences: {},
    deployedLinkReferences: {},
};
//# sourceMappingURL=MailerContract.js.map