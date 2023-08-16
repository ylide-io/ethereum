import { WebSocketProvider } from '@ethersproject/providers';
import type { ethers } from 'ethers';
import type { EVMBlockchainReader } from '../controllers/helpers/EVMBlockchainReader';
import type { IEVMMailerContractLink, IEVMRegistryContractLink, IEVMYlidePayContractLink } from '../misc/types';

export type SigningContext = ethers.providers.Provider | ethers.Signer;

export class ContractCache<Contract = any> {
	private readonly contractCache: Record<string, Map<SigningContext, Contract>> = {};

	constructor(
		public readonly factory: { connect: (address: string, provider: SigningContext) => Contract },
		public readonly blockchainReader: EVMBlockchainReader,
	) {
		//
	}

	getContract(address: string, provider: SigningContext): Contract {
		if (!this.contractCache[address] || !this.contractCache[address].has(provider)) {
			const contract = this.factory.connect(address, provider);
			if (!this.contractCache[address]) {
				this.contractCache[address] = new Map();
			}
			this.contractCache[address].set(provider, contract);

			return contract;
		} else {
			const result = this.contractCache[address].get(provider);
			if (!result) {
				throw new Error('This should never happen: contract not found');
			}
			return result;
		}
	}

	async contractOperation<T>(
		contractLink: IEVMMailerContractLink | IEVMRegistryContractLink | IEVMYlidePayContractLink,
		callback: (
			contract: Contract,
			provider: ethers.providers.Provider,
			blockLimit: number,
			latestNotSupported: boolean,
			batchNotSupported: boolean,
			stopTrying: () => void,
		) => Promise<T>,
	): Promise<T> {
		return await this.blockchainReader.retryableOperation(
			async (provider, blockLimit, latestNotSupported, batchNotSupported, stopTrying) => {
				if (provider instanceof WebSocketProvider) {
					await provider.ready;
				}
				const contract = this.getContract(contractLink.address, provider);
				return await callback(
					contract,
					provider,
					blockLimit,
					latestNotSupported,
					batchNotSupported,
					stopTrying,
				);
			},
		);
	}
}
