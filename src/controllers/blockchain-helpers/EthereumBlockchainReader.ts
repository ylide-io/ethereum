import { Block } from '@ethersproject/providers';
import ethers from 'ethers';

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
	private blocksCache: Record<string, Block> = {};

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
		const block = await this.retryableOperation(rpc => rpc.getBlock(hash));
		this.blocksCache[hash] = block;
		return block;
	}
}
