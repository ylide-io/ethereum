import { ethers } from 'ethers';
import { YlideRegistryV3, YlideRegistryV3__factory } from '@ylide/ethereum-contracts';
import { ExternalYlidePublicKey, PublicKey, PublicKeyType } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import { IEVMRegistryContractLink } from '../misc';
import { ContractCache } from './ContractCache';

export class EthereumRegistryV3Wrapper {
	private readonly cache: ContractCache<YlideRegistryV3>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlideRegistryV3__factory, blockchainReader);
	}

	private async contractOperation<T>(
		registry: IEVMRegistryContractLink,
		callback: (
			contract: YlideRegistryV3,
			provider: ethers.providers.Provider,
			blockLimit: number,
			latestNotSupported: boolean,
			batchNotSupported: boolean,
			stopTrying: () => void,
		) => Promise<T>,
	): Promise<T> {
		return await this.blockchainReader.retryableOperation(
			async (provider, blockLimit, latestNotSupported, batchNotSupported, stopTrying) => {
				const contract = this.cache.getContract(registry.address, provider);
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

	async getPublicKeyByAddress(
		registry: IEVMRegistryContractLink,
		address: string,
	): Promise<ExternalYlidePublicKey | null> {
		return await this.contractOperation(registry, async contract => {
			const [entry, contractVersion, contractAddress] = await contract.functions.getPublicKey(address);
			const { publicKey, block, timestamp, keyVersion } = entry;
			if (keyVersion.toNumber() === 0) {
				return null;
			}
			return {
				keyVersion: keyVersion.toNumber(),
				publicKey: PublicKey.fromBytes(
					PublicKeyType.YLIDE,
					SmartBuffer.ofHexString(publicKey.toHexString().replace('0x', '')).bytes,
				),
				timestamp: timestamp.toNumber(),
				registrar: 0,
			};
		});
	}

	async getPublicKeysHistoryForAddress(
		registry: IEVMRegistryContractLink,
		address: string,
	): Promise<ExternalYlidePublicKey[]> {
		const currentKey = await this.getPublicKeyByAddress(registry, address);
		return currentKey ? [currentKey] : [];
	}

	async attachPublicKey(
		registry: IEVMRegistryContractLink,
		signer: ethers.Signer,
		from: string,
		publicKey: ExternalYlidePublicKey,
	): Promise<ethers.ContractTransaction> {
		const contract = this.cache.getContract(registry.address, signer);
		return await contract.attachPublicKey(publicKey.publicKey.bytes, publicKey.keyVersion, { from });
	}
}
