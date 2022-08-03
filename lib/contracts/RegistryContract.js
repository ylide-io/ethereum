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
exports.RegistryContract = void 0;
var smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
var misc_1 = require("../misc");
var RegistryContract = /** @class */ (function () {
    function RegistryContract(blockchainController, contractAddress) {
        this.blockchainController = blockchainController;
        this.contractAddress = contractAddress;
        this.contract = new this.blockchainController.web3.eth.Contract(REGISTRY_ABI.abi, this.contractAddress);
    }
    RegistryContract.prototype.estimateAndCall = function (address, method, args) {
        return __awaiter(this, void 0, void 0, function () {
            var data, gasPrice, gas;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        data = this.blockchainController.web3.eth.abi.encodeFunctionCall(REGISTRY_ABI.abi.find(function (t) { return t.name === method; }), args);
                        return [4 /*yield*/, this.blockchainController.web3.eth.getGasPrice()];
                    case 1:
                        gasPrice = _b.sent();
                        return [4 /*yield*/, this.blockchainController.web3.eth.estimateGas({
                                to: this.contract.options.address,
                                data: data,
                            })];
                    case 2:
                        gas = _b.sent();
                        return [4 /*yield*/, (_a = this.contract.methods)[method].apply(_a, args).send({ from: address, gas: gas, gasPrice: gasPrice })];
                    case 3: return [2 /*return*/, _b.sent()];
                }
            });
        });
    };
    RegistryContract.prototype.getAddressByPublicKey = function (publicKey) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // const messages = await this.blockchainController.gqlQueryMessages(
                // 	getContractMessagesQuery(this.publicKeyToAddress(publicKey), this.contractAddress),
                // );
                // if (messages.length) {
                // 	return this.decodePublicKeyToAddressMessageBody(messages[0].body);
                // } else {
                return [2 /*return*/, null];
            });
        });
    };
    RegistryContract.prototype.getPublicKeyByAddress = function (address) {
        return __awaiter(this, void 0, void 0, function () {
            var events;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.contract.getPastEvents('AddressToPublicKey', {
                            filter: {
                                addr: address,
                            },
                            fromBlock: 0,
                            toBlock: 'latest',
                        })];
                    case 1:
                        events = _a.sent();
                        if (events.length) {
                            return [2 /*return*/, this.decodeAddressToPublicKeyMessageBody(events[events.length - 1])];
                        }
                        else {
                            return [2 /*return*/, null];
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    RegistryContract.prototype.attachPublicKey = function (address, publicKey) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.estimateAndCall(address, 'attachPublicKey', [(0, misc_1.publicKeyToBigIntString)(publicKey)])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    RegistryContract.prototype.attachAddress = function (address, publicKey) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.estimateAndCall(address, 'attachAddress', [(0, misc_1.publicKeyToBigIntString)(publicKey)])];
                    case 1:
                        _a.sent();
                        return [2 /*return*/, true];
                }
            });
        });
    };
    RegistryContract.prototype.decodePublicKeyToAddressMessageBody = function (ev) {
        var addr = ev.returnValues.addr;
        return addr;
    };
    RegistryContract.prototype.decodeAddressToPublicKeyMessageBody = function (ev) {
        var publicKey = ev.returnValues.publicKey;
        return smart_buffer_1.default.ofHexString(BigInt(publicKey).toString(16).padStart(64, '0')).bytes;
    };
    return RegistryContract;
}());
exports.RegistryContract = RegistryContract;
var REGISTRY_ABI = {
    _format: 'hh-sol-artifact-1',
    contractName: 'YlideRegistryV1',
    sourceName: 'contracts/YlideRegistryV1.sol',
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
                    internalType: 'address',
                    name: 'addr',
                    type: 'address',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'publicKey',
                    type: 'uint256',
                },
            ],
            name: 'AddressToPublicKey',
            type: 'event',
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: 'uint256',
                    name: 'publicKey',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'address',
                    name: 'addr',
                    type: 'address',
                },
            ],
            name: 'PublicKeyToAddress',
            type: 'event',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'publicKey',
                    type: 'uint256',
                },
            ],
            name: 'attachAddress',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'publicKey',
                    type: 'uint256',
                },
            ],
            name: 'attachPublicKey',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
    ],
    bytecode: '0x608060405234801561001057600080fd5b50610223806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632bdf8f681461003b578063bd672d1514610057575b600080fd5b6100556004803603810190610050919061013a565b610073565b005b610071600480360381019061006c919061013a565b6100c4565b005b3373ffffffffffffffffffffffffffffffffffffffff167f3fb5d86f1a84499e73ea94b123d98ab2e39807af01937208e404e14448b2c9df826040516100b99190610176565b60405180910390a250565b807f05c98cadc254df6236cdf4d65b2c11dc30599c026068003ec3b694b76e0b30b2336040516100f491906101d2565b60405180910390a250565b600080fd5b6000819050919050565b61011781610104565b811461012257600080fd5b50565b6000813590506101348161010e565b92915050565b6000602082840312156101505761014f6100ff565b5b600061015e84828501610125565b91505092915050565b61017081610104565b82525050565b600060208201905061018b6000830184610167565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006101bc82610191565b9050919050565b6101cc816101b1565b82525050565b60006020820190506101e760008301846101c3565b9291505056fea26469706673582212205f4e14425717baab29baa0d70d8efd137e70bc0084ed1f3697220f6e9c16173664736f6c63430008090033',
    deployedBytecode: '0x608060405234801561001057600080fd5b50600436106100365760003560e01c80632bdf8f681461003b578063bd672d1514610057575b600080fd5b6100556004803603810190610050919061013a565b610073565b005b610071600480360381019061006c919061013a565b6100c4565b005b3373ffffffffffffffffffffffffffffffffffffffff167f3fb5d86f1a84499e73ea94b123d98ab2e39807af01937208e404e14448b2c9df826040516100b99190610176565b60405180910390a250565b807f05c98cadc254df6236cdf4d65b2c11dc30599c026068003ec3b694b76e0b30b2336040516100f491906101d2565b60405180910390a250565b600080fd5b6000819050919050565b61011781610104565b811461012257600080fd5b50565b6000813590506101348161010e565b92915050565b6000602082840312156101505761014f6100ff565b5b600061015e84828501610125565b91505092915050565b61017081610104565b82525050565b600060208201905061018b6000830184610167565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006101bc82610191565b9050919050565b6101cc816101b1565b82525050565b60006020820190506101e760008301846101c3565b9291505056fea26469706673582212205f4e14425717baab29baa0d70d8efd137e70bc0084ed1f3697220f6e9c16173664736f6c63430008090033',
    linkReferences: {},
    deployedLinkReferences: {},
};
//# sourceMappingURL=RegistryContract.js.map