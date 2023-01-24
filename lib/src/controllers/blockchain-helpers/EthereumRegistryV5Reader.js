"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumRegistryV5Reader = void 0;
const ethereum_contracts_1 = require("@ylide/ethereum-contracts");
const sdk_1 = require("@ylide/sdk");
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
class EthereumRegistryV5Reader {
    blockchainReader;
    registryContractCache = {};
    constructor(blockchainReader) {
        this.blockchainReader = blockchainReader;
        //
    }
    getRegistryContract(address, provider) {
        if (!this.registryContractCache[address] || !this.registryContractCache[address].has(provider)) {
            const contract = ethereum_contracts_1.YlideRegistryV5__factory.connect(address, provider);
            if (!this.registryContractCache[address]) {
                this.registryContractCache[address] = new Map();
            }
            this.registryContractCache[address].set(provider, contract);
            return contract;
        }
        else {
            return this.registryContractCache[address].get(provider);
        }
    }
    async contractOperation(registry, callback) {
        return await this.blockchainReader.retryableOperation(async (provider, blockLimit, latestNotSupported, batchNotSupported, stopTrying) => {
            const contract = this.getRegistryContract(registry.address, provider);
            return await callback(contract, provider, blockLimit, latestNotSupported, batchNotSupported, stopTrying);
        });
    }
    async getPublicKeyByAddress(registry, address) {
        return await this.contractOperation(registry, async (contract) => {
            const [entry, contractVersion, contractAddress] = await contract.functions.getPublicKey(address);
            const { publicKey, block, timestamp, keyVersion } = entry;
            if (keyVersion.toNumber() === 0) {
                return null;
            }
            return {
                keyVersion: keyVersion.toNumber(),
                publicKey: sdk_1.PublicKey.fromBytes(sdk_1.PublicKeyType.YLIDE, smart_buffer_1.default.ofHexString(publicKey.toHexString()).bytes),
                timestamp: timestamp.toNumber(),
            };
        });
    }
}
exports.EthereumRegistryV5Reader = EthereumRegistryV5Reader;
//# sourceMappingURL=EthereumRegistryV5Reader.js.map