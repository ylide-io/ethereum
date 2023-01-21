import { ethers } from 'ethers';
import { YlideRegistryV5, YlideRegistryV5__factory } from '@ylide/ethereum-contracts';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';

export class EthereumRegistryV5Reader {
	private readonly registryContractCache: Record<string, Map<ethers.providers.Provider, YlideRegistryV5>> = {};

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		//
	}

	private getRegistryContract(address: string, provider: ethers.providers.Provider): YlideRegistryV5 {
		if (!this.registryContractCache[address] || !this.registryContractCache[address].has(provider)) {
			const contract = YlideRegistryV5__factory.connect(address, provider);
			if (!this.registryContractCache[address]) {
				this.registryContractCache[address] = new Map();
			}
			this.registryContractCache[address].set(provider, contract);

			return contract;
		} else {
			return this.registryContractCache[address].get(provider)!;
		}
	}

	//
}
