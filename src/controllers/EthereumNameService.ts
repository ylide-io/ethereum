import { AbstractNameService } from '@ylide/sdk';
import type { EthereumBlockchainController } from './EthereumBlockchainController';

// Why we use this? Because we want to be able to change ENS contract address, which is not possible in ethers.js
import { ENS } from '@ensdomains/ensjs';

export class EthereumNameService extends AbstractNameService {
	constructor(public readonly controller: EthereumBlockchainController, public readonly contractAddress: string) {
		super();
	}

	isCandidate(name: string): boolean {
		return name.toLowerCase().endsWith('.eth');
	}

	async resolve(name: string): Promise<string | null> {
		try {
			return this.controller.blockchainReader.retryableOperation(async w3 => {
				const ens = new ENS({
					// TODO: "getContractAddress": () => this.contractAddress,
				});
				await ens.setProvider(w3 as any);
				const result = await ens.getAddr(name);
				if (typeof result === 'string') {
					return result;
				} else if (typeof result === 'undefined') {
					return null;
				} else {
					return result.addr;
				}
			});
		} catch (err) {
			return null;
		}
	}

	async reverseResolve(address: string): Promise<string | null> {
		try {
			return this.controller.blockchainReader.retryableOperation(async w3 => {
				const ens = new ENS();
				await ens.setProvider(w3 as any);
				const result = await ens.getName(address);
				if (result) {
					return result.name;
				} else {
					return null;
				}
				// return w3.lookupAddress(address);
			});
		} catch (err) {
			return null;
		}
	}
}
