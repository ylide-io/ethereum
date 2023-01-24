"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumBlockchainReader = void 0;
const ethers_1 = __importDefault(require("ethers"));
const semaphore_promise_1 = __importDefault(require("semaphore-promise"));
class EthereumBlockchainReader {
    rpcs;
    blocksCache = {};
    static createEthereumBlockchainReader(rpcs) {
        const internalRPCs = rpcs.map(rpc => {
            let provider;
            if (typeof rpc.rpcUrlOrProvider === 'string') {
                if (rpc.rpcUrlOrProvider.startsWith('ws')) {
                    provider = new ethers_1.default.providers.WebSocketProvider(rpc.rpcUrlOrProvider);
                }
                else if (rpc.rpcUrlOrProvider.startsWith('http')) {
                    provider = new ethers_1.default.providers.JsonRpcProvider(rpc.rpcUrlOrProvider);
                }
                else {
                    throw new Error('Invalid rpcUrlOrProvider: ' + rpc.rpcUrlOrProvider);
                }
            }
            else {
                provider = rpc.rpcUrlOrProvider;
            }
            return {
                rpcUrl: typeof rpc.rpcUrlOrProvider === 'string' ? rpc.rpcUrlOrProvider : undefined,
                provider,
                blockLimit: rpc.blockLimit,
                latestNotSupported: rpc.latestNotSupported || false,
                batchNotSupported: rpc.batchNotSupported || false,
            };
        });
        return new EthereumBlockchainReader(internalRPCs);
    }
    constructor(rpcs) {
        this.rpcs = rpcs;
        //
    }
    async retryableOperation(callback) {
        let lastError;
        const errors = [];
        for (const rpc of this.rpcs) {
            let doBreak = false;
            try {
                return await callback(rpc.provider, rpc.blockLimit, rpc.latestNotSupported, rpc.batchNotSupported, () => (doBreak = true));
            }
            catch (err) {
                lastError = err;
                errors.push({ rpc, err });
                if (doBreak) {
                    break;
                }
                else {
                    continue;
                }
            }
        }
        for (const err of errors) {
            console.error(`${err.rpc.rpcUrl || '[provider] error: '}`, err);
        }
        throw new Error('Was not able to execute in all of RPC providers');
    }
    async getBlockByHash(hash) {
        if (this.blocksCache[hash])
            return this.blocksCache[hash];
        const block = await this.retryableOperation(rpc => rpc.getBlockWithTransactions(hash));
        this.blocksCache[hash] = block;
        return block;
    }
    async getBalance(address) {
        return await this.retryableOperation(async (rpc) => {
            const bn = await rpc.getBalance(address);
            return {
                original: bn.toString(),
                number: Number(ethers_1.default.utils.formatUnits(bn, 'ethers')),
                string: ethers_1.default.utils.formatUnits(bn, 'ethers'),
                e18: bn.toString(),
            };
        });
    }
    async processMessages(msgs) {
        if (!msgs.length) {
            return [];
        }
        const blockHashes = msgs.map(e => e.blockHash).filter((e, i, a) => a.indexOf(e) === i);
        const blocks = await this.retryableOperation(async (rpc, blockLimit, latestNotSupported, batchNotSupported) => {
            const txcs = new semaphore_promise_1.default(3);
            return await Promise.all(blockHashes.map(async (blockHash) => {
                const release = await txcs.acquire();
                try {
                    return await this.getBlockByHash(blockHash);
                }
                catch (err) {
                    // console.log('err: ', err);
                    throw err;
                }
                finally {
                    release();
                }
            }));
        });
        const blockMap = blocks.reduce((p, c) => ({
            ...p,
            [c.hash]: c,
        }), {});
        const txMap = {};
        for (const block of blocks) {
            for (const tx of block.transactions) {
                txMap[tx.hash] = tx;
            }
        }
        return msgs.map(ev => ({ event: ev, tx: txMap[ev.transactionHash], block: blockMap[ev.blockHash] }));
    }
    isAddressValid(address) {
        return ethers_1.default.utils.isAddress(address);
    }
}
exports.EthereumBlockchainReader = EthereumBlockchainReader;
//# sourceMappingURL=EthereumBlockchainReader.js.map