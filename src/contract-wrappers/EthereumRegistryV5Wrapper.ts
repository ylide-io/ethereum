import { ethers } from 'ethers';
import { YlideRegistryV5, YlideRegistryV5__factory } from '@ylide/ethereum-contracts';
import { ExternalYlidePublicKey, PublicKey, PublicKeyType } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import type { IEVMEnrichedEvent, IEVMRegistryContractLink } from '../misc/types';
import { ContractCache } from './ContractCache';
import type { KeyAttachedEventObject } from '@ylide/ethereum-contracts/lib/contracts/YlideRegistryV5';

export class EthereumRegistryV5Wrapper {
	public readonly cache: ContractCache<YlideRegistryV5>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlideRegistryV5__factory, blockchainReader);
	}

	static async deploy(
		signer: ethers.Signer,
		from: string,
		previousContractAddress = '0x0000000000000000000000000000000000000000',
	) {
		const factory = new YlideRegistryV5__factory(signer);
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

	async getOwner(registry: IEVMRegistryContractLink): Promise<string> {
		return await this.cache.contractOperation(registry, async contract => {
			return await contract.owner();
		});
	}

	async setOwner(
		registry: IEVMRegistryContractLink,
		signer: ethers.Signer,
		from: string,
		owner: string,
	): Promise<ethers.ContractTransaction> {
		const contract = this.cache.getContract(registry.address, signer);
		return await contract.transferOwnership(owner, { from });
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

	async getBonuces(registry: IEVMRegistryContractLink): Promise<{ newcomer: string; referrer: string }> {
		return await this.cache.contractOperation(registry, async contract => {
			const [newcomerBonus] = await contract.functions.newcomerBonus();
			const [referrerBonus] = await contract.functions.referrerBonus();
			return {
				newcomer: ethers.utils.formatUnits(newcomerBonus, 'ether'),
				referrer: ethers.utils.formatUnits(referrerBonus, 'ether'),
			};
		});
	}

	async setBonuses(
		registry: IEVMRegistryContractLink,
		signer: ethers.Signer,
		from: string,
		newcomerBonus: string,
		referrerBonus: string,
	): Promise<ethers.ContractTransaction> {
		const contract = this.cache.getContract(registry.address, signer);
		return await contract.setBonuses(
			ethers.utils.parseUnits(newcomerBonus, 'ether'),
			ethers.utils.parseUnits(referrerBonus, 'ether'),
			{ from },
		);
	}

	async addBonucer(
		registry: IEVMRegistryContractLink,
		signer: ethers.Signer,
		from: string,
		bonucerAddress: string,
	): Promise<ethers.ContractTransaction> {
		const contract = this.cache.getContract(registry.address, signer);
		return await contract.setBonucer(bonucerAddress, true, { from });
	}

	async removeBonucer(
		registry: IEVMRegistryContractLink,
		signer: ethers.Signer,
		from: string,
		bonucerAddress: string,
	): Promise<ethers.ContractTransaction> {
		const contract = this.cache.getContract(registry.address, signer);
		return await contract.setBonucer(bonucerAddress, false, { from });
	}

	async getIsBonucer(registry: IEVMRegistryContractLink, bonucerAddress: string): Promise<boolean> {
		return await this.cache.contractOperation(registry, async contract => {
			const [isBonucer] = await contract.functions.bonucers(bonucerAddress);
			return isBonucer;
		});
	}

	async attachPublicKeyByAdmin(
		registry: IEVMRegistryContractLink,
		signer: ethers.Signer,
		from: string,
		txSignature: { v: number; r: string; s: string },
		address: string,
		publicKey: Uint8Array,
		keyVersion: number,
		referrer: string | null,
		payBonus: boolean,
		value: string,
	): Promise<ethers.ContractTransaction> {
		const contract = this.cache.getContract(registry.address, signer);
		return await contract.attachPublicKeyByAdmin(
			txSignature.v,
			txSignature.r,
			txSignature.s,
			address,
			publicKey,
			keyVersion,
			referrer || '0x0000000000000000000000000000000000000000',
			payBonus,
			{ value, from },
		);
	}
}
