import type { ethers } from 'ethers';
import type { YlideRegistryV3 } from '@ylide/ethereum-contracts';
import { YlideRegistryV3__factory } from '@ylide/ethereum-contracts';
import { RemotePublicKey, PublicKey, PublicKeyType } from '@ylide/sdk';
import { SmartBuffer } from '@ylide/smart-buffer';
import type { EVMBlockchainReader } from '../controllers/helpers/EVMBlockchainReader';
import type { IEVMEnrichedEvent, IEVMRegistryContractLink } from '../misc/types';
import { ContractCache } from './ContractCache';
import type { KeyAttachedEventObject } from '@ylide/ethereum-contracts/lib/contracts/YlideRegistryV3';

export class EVMRegistryV3Wrapper {
	public readonly cache: ContractCache<YlideRegistryV3>;

	constructor(public readonly blockchainReader: EVMBlockchainReader) {
		this.cache = new ContractCache(YlideRegistryV3__factory, blockchainReader);
	}

	static async deploy(
		signer: ethers.Signer,
		from: string,
		previousContractAddress = '0x0000000000000000000000000000000000000000',
	) {
		const factory = new YlideRegistryV3__factory(signer);
		return (await factory.deploy(previousContractAddress)).address;
	}

	processKeyAttachedEvent(event: IEVMEnrichedEvent<KeyAttachedEventObject>): RemotePublicKey {
		const { publicKey, keyVersion, addr } = event.event.parsed;
		return new RemotePublicKey(
			this.blockchainReader.blockchainGroup,
			this.blockchainReader.blockchain,
			addr.toLowerCase(),
			new PublicKey(
				PublicKeyType.YLIDE,
				keyVersion.toNumber(),
				SmartBuffer.ofHexString(publicKey.toHexString().replace('0x', '').padStart(64, '0')).bytes,
			),
			event.block.timestamp,
			0,
		);
	}

	async getPublicKeyByAddress(registry: IEVMRegistryContractLink, address: string): Promise<RemotePublicKey | null> {
		return await this.cache.contractOperation(registry, async contract => {
			const [entry, contractVersion, contractAddress] = await contract.functions.getPublicKey(address);
			const { publicKey, block, timestamp, keyVersion } = entry;
			if (keyVersion.toNumber() === 0) {
				return null;
			}
			return new RemotePublicKey(
				this.blockchainReader.blockchainGroup,
				this.blockchainReader.blockchain,
				address.toLowerCase(),
				new PublicKey(
					PublicKeyType.YLIDE,
					keyVersion.toNumber(),
					SmartBuffer.ofHexString(publicKey.toHexString().replace('0x', '').padStart(64, '0')).bytes,
				),
				timestamp.toNumber(),
				0,
			);
		});
	}

	async getPublicKeysHistoryForAddress(
		registry: IEVMRegistryContractLink,
		address: string,
	): Promise<RemotePublicKey[]> {
		const currentKey = await this.getPublicKeyByAddress(registry, address);
		return currentKey ? [currentKey] : [];
	}

	async attachPublicKey(
		registry: IEVMRegistryContractLink,
		signer: ethers.Signer,
		from: string,
		publicKey: PublicKey,
		registrar: number,
	): Promise<ethers.ContractTransaction> {
		const contract = this.cache.getContract(registry.address, signer);
		return await contract.attachPublicKey(publicKey.keyBytes, publicKey.keyVersion, { from });
	}
}
