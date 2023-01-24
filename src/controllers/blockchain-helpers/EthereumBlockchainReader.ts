import { Log } from '@ethersproject/providers';
import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { ethers, Transaction } from 'ethers';
import Semaphore from 'semaphore-promise';
import { IEthereumMessage } from '../../misc';

export interface IRPCDescriptor {
	rpcUrlOrProvider: string | ethers.providers.Provider;
	blockLimit: number;
	latestNotSupported?: boolean;
	batchNotSupported?: boolean;
}

export interface IInternalRPCDescriptor {
	rpcUrl?: string;
	provider: ethers.providers.Provider;
	blockLimit: number;
	latestNotSupported: boolean;
	batchNotSupported: boolean;
}

export class EthereumBlockchainReader {
	private blocksCache: Record<string, BlockWithTransactions> = {};

	static createEthereumBlockchainReader(rpcs: IRPCDescriptor[]) {
		const internalRPCs: IInternalRPCDescriptor[] = rpcs.map(rpc => {
			let provider;
			if (typeof rpc.rpcUrlOrProvider === 'string') {
				if (rpc.rpcUrlOrProvider.startsWith('ws')) {
					provider = new ethers.providers.WebSocketProvider(rpc.rpcUrlOrProvider);
				} else if (rpc.rpcUrlOrProvider.startsWith('http')) {
					provider = new ethers.providers.JsonRpcProvider(rpc.rpcUrlOrProvider);
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

		return new EthereumBlockchainReader(internalRPCs);
	}

	private constructor(private readonly rpcs: IInternalRPCDescriptor[]) {
		//
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

	async getBalance(address: string): Promise<{ original: string; number: number; string: string; e18: string }> {
		return await this.retryableOperation(async rpc => {
			const bn = await rpc.getBalance(address);
			return {
				original: bn.toString(),
				number: Number(ethers.utils.formatUnits(bn, 'ether')),
				string: ethers.utils.formatUnits(bn, 'ether'),
				e18: bn.toString(),
			};
		});
	}

	async processMessages<T extends Log>(msgs: T[]): Promise<IEthereumMessage<T>[]> {
		if (!msgs.length) {
			return [];
		}
		const blockHashes = msgs.map(e => e.blockHash).filter((e, i, a) => a.indexOf(e) === i);
		const blocks = await this.retryableOperation(async (rpc, blockLimit, latestNotSupported, batchNotSupported) => {
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
		const blockMap: Record<string, BlockWithTransactions> = blocks.reduce(
			(p, c) => ({
				...p,
				[c.hash]: c,
			}),
			{},
		);
		const txMap: Record<string, Transaction> = {};
		for (const block of blocks) {
			for (const tx of block.transactions) {
				txMap[tx.hash] = tx;
			}
		}

		return msgs.map(ev => ({ event: ev, tx: txMap[ev.transactionHash], block: blockMap[ev.blockHash] }));
	}

	isAddressValid(address: string) {
		return ethers.utils.isAddress(address);
	}
}
