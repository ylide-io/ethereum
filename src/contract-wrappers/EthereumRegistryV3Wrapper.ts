import { ethers } from 'ethers';
import { YlideRegistryV3, YlideRegistryV3__factory } from '@ylide/ethereum-contracts';
import { ExternalYlidePublicKey, PublicKey, PublicKeyType } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import type { IEVMEnrichedEvent, IEVMRegistryContractLink } from '../misc/types';
import { ContractCache } from './ContractCache';
import type { KeyAttachedEventObject } from '@ylide/ethereum-contracts/lib/YlideRegistryV3';

export class EthereumRegistryV3Wrapper {
	public readonly cache: ContractCache<YlideRegistryV3>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
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

	processKeyAttachedEvent(event: IEVMEnrichedEvent<KeyAttachedEventObject>): {
		address: string;
		key: ExternalYlidePublicKey;
	} {
		const { publicKey, keyVersion, addr } = event.event.parsed;
		return {
			address: addr,
			key: {
				keyVersion: keyVersion.toNumber(),
				publicKey: PublicKey.fromBytes(
					PublicKeyType.YLIDE,
					SmartBuffer.ofHexString(publicKey.toHexString().replace('0x', '').padStart(64, '0')).bytes,
				),
				timestamp: event.block.timestamp,
				registrar: 0,
			},
		};
	}

	async getPublicKeyByAddress(
		registry: IEVMRegistryContractLink,
		address: string,
	): Promise<ExternalYlidePublicKey | null> {
		return await this.cache.contractOperation(registry, async contract => {
			const [entry, contractVersion, contractAddress] = await contract.functions.getPublicKey(address);
			const { publicKey, block, timestamp, keyVersion } = entry;
			if (keyVersion.toNumber() === 0) {
				return null;
			}
			return {
				keyVersion: keyVersion.toNumber(),
				publicKey: PublicKey.fromBytes(
					PublicKeyType.YLIDE,
					SmartBuffer.ofHexString(publicKey.toHexString().replace('0x', '').padStart(64, '0')).bytes,
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
