import type { BlockWithTransactions } from '@ethersproject/abstract-provider';
import type { Transaction } from 'ethers';
import { ethers } from 'ethers';
import Semaphore from 'semaphore-promise';
import type { IEVMEnrichedEvent, IEVMEvent } from '../../misc/types';
import { BetterWebSocketProvider } from './BetterWebSocketProvider';
import { ethersBlockToInternalBlock, ethersTxToInternalTx } from './ethersHelper';

export interface IRPCDescriptor {
	chainId: number;
	rpcUrlOrProvider: string | ethers.providers.Provider;
	blockLimit: number;
	latestNotSupported?: boolean;
	batchNotSupported?: boolean;
	ensAddress?: string | null;
}

export interface IInternalRPCDescriptor {
	rpcUrl?: string;
	provider: ethers.providers.Provider;
	blockLimit: number;
	latestNotSupported: boolean;
	batchNotSupported: boolean;
}

export class EVMBlockchainReader {
	private blocksCache: Record<string, BlockWithTransactions> = {};
	private blocksCacheByNumber: Record<number, BlockWithTransactions> = {};

	static createEVMBlockchainReader(blockchainGroup: string, blockchain: string, rpcs: IRPCDescriptor[]) {
		const internalRPCs: IInternalRPCDescriptor[] = rpcs.map(rpc => {
			let provider;
			if (typeof rpc.rpcUrlOrProvider === 'string') {
				if (rpc.rpcUrlOrProvider.startsWith('ws')) {
					provider = new BetterWebSocketProvider(rpc.rpcUrlOrProvider, {
						name: 'YlideUnknownNetworkName',
						chainId: rpc.chainId,
						ensAddress: rpc.ensAddress || undefined,
					});
				} else if (rpc.rpcUrlOrProvider.startsWith('http')) {
					provider = new ethers.providers.StaticJsonRpcProvider(rpc.rpcUrlOrProvider, {
						name: 'YlideUnknownNetworkName',
						chainId: rpc.chainId,
						ensAddress: rpc.ensAddress || undefined,
					});
				} else {
					throw new Error('Invalid rpcUrlOrProvider: ' + rpc.rpcUrlOrProvider);
				}
			} else {
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

		return new EVMBlockchainReader(blockchainGroup, blockchain, internalRPCs);
	}

	private constructor(
		public readonly blockchainGroup: string,
		public readonly blockchain: string,
		private readonly rpcs: IInternalRPCDescriptor[],
	) {
		//
	}

	async init() {
		for (const rpc of this.rpcs) {
			if (rpc.rpcUrl === 'http://localhost:8545/') {
				await (rpc.provider as ethers.providers.JsonRpcProvider).send('hardhat_mine', ['0x81']);
			}
		}
	}

	async retryableOperation<T>(
		callback: (
			provider: ethers.providers.Provider,
			blockLimit: number,
			latestNotSupported: boolean,
			batchNotSupported: boolean,
			stopTrying: () => void,
		) => Promise<T>,
	): Promise<T> {
		let lastError;
		const errors: { rpc: IInternalRPCDescriptor; err: any }[] = [];
		for (const rpc of this.rpcs) {
			let doBreak = false;
			try {
				return await callback(
					rpc.provider,
					rpc.blockLimit,
					rpc.latestNotSupported,
					rpc.batchNotSupported,
					() => (doBreak = true),
				);
			} catch (err: any) {
				lastError = err;
				errors.push({ rpc, err });
				if (doBreak) {
					break;
				} else {
					continue;
				}
			}
		}
		for (const err of errors) {
			console.error(`${err.rpc.rpcUrl || '[provider] error: '}`, err);
		}
		throw new Error('Was not able to execute in all of RPC providers');
	}

	async getBlockByHash(hash: string) {
		if (this.blocksCache[hash]) return this.blocksCache[hash];
		const block = await this.retryableOperation(rpc => rpc.getBlockWithTransactions(hash));
		this.blocksCache[hash] = block;
		return block;
	}

	async getBlockByBlockNumber(blockNumber: number) {
		if (this.blocksCacheByNumber[blockNumber]) return this.blocksCacheByNumber[blockNumber];
		const block = await this.retryableOperation(rpc => rpc.getBlockWithTransactions(blockNumber));
		this.blocksCacheByNumber[blockNumber] = block;
		return block;
	}

	async getBalance(address: string): Promise<{ original: string; numeric: number; textual: string; e18: string }> {
		return await this.retryableOperation(async rpc => {
			const bn = await rpc.getBalance(address);
			return {
				original: bn.toString(),
				numeric: Number(ethers.utils.formatUnits(bn, 'ether')),
				textual: ethers.utils.formatUnits(bn, 'ether'),
				e18: bn.toString(),
			};
		});
	}

	async enrichEvents<T>(msgs: IEVMEvent<T>[]): Promise<IEVMEnrichedEvent<T>[]> {
		if (!msgs.length) {
			return [];
		}
		let blocks: BlockWithTransactions[];
		if (this.blockchain !== 'SHARDEUM') {
			const blockHashes = msgs.map(e => e.blockHash).filter((e, i, a) => a.indexOf(e) === i);
			blocks = await this.retryableOperation(async (rpc, blockLimit, latestNotSupported, batchNotSupported) => {
				const txcs = new Semaphore(3);
				return await Promise.all(
					blockHashes.map(async blockHash => {
						const release = await txcs.acquire();
						try {
							return await this.getBlockByHash(blockHash);
						} catch (err) {
							// console.log('err: ', err);
							throw err;
						} finally {
							release();
						}
					}),
				);
			});
		} else {
			const blockNumbers = msgs
				.map(e => String(e.blockNumber).substring(0, String(e.blockNumber).length - 1))
				.filter((e, i, a) => a.indexOf(e) === i);
			blocks = await this.retryableOperation(async (rpc, blockLimit, latestNotSupported, batchNotSupported) => {
				const txcs = new Semaphore(3);
				return await Promise.all(
					blockNumbers.map(async blockNumber => {
						const release = await txcs.acquire();
						try {
							return await this.getBlockByBlockNumber(Number(blockNumber));
						} catch (err) {
							// console.log('err: ', err);
							throw err;
						} finally {
							release();
						}
					}),
				);
			});
		}
		const txMap: Record<string, Transaction> = {};
		for (const block of blocks) {
			for (const tx of block.transactions) {
				txMap[tx.hash] = tx;
			}
		}

		return msgs.map(ev => ({
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			block: ethersBlockToInternalBlock(blocks.find(b => b.hash === ev.blockHash)!),
			tx: ethersTxToInternalTx(txMap[ev.transactionHash]),
			event: ev,
		}));
	}

	isAddressValid(address: string) {
		return ethers.utils.isAddress(address);
	}
}
