import { WebSocketProvider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import { IEVMMailerContractLink, IEVMRegistryContractLink } from '../misc';

export type SigningContext = ethers.providers.Provider | ethers.Signer;

export class ContractCache<Contract = any> {
	private readonly contractCache: Record<string, Map<SigningContext, Contract>> = {};

	constructor(
		public readonly factory: { connect: (address: string, provider: SigningContext) => Contract },
		public readonly blockchainReader: EthereumBlockchainReader,
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
			return this.contractCache[address].get(provider)!;
		}
	}

	async contractOperation<T>(
		contractLink: IEVMMailerContractLink | IEVMRegistryContractLink,
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
					if (provider.websocket.readyState !== WebSocket.OPEN) {
					}
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