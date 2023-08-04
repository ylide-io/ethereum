import { ethers } from 'ethers';
import type { YlideRegistryV4 } from '@ylide/ethereum-contracts';
import { YlideRegistryV4__factory } from '@ylide/ethereum-contracts';
import { RemotePublicKey, PublicKey, PublicKeyType } from '@ylide/sdk';
import { SmartBuffer } from '@ylide/smart-buffer';
import type { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import type { IEVMEnrichedEvent, IEVMRegistryContractLink } from '../misc/types';
import { ContractCache } from './ContractCache';
import type { KeyAttachedEventObject } from '@ylide/ethereum-contracts/lib/contracts/YlideRegistryV4';

export class EthereumRegistryV4Wrapper {
	public readonly cache: ContractCache<YlideRegistryV4>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlideRegistryV4__factory, blockchainReader);
	}

	static async deploy(
		signer: ethers.Signer,
		from: string,
		previousContractAddress = '0x0000000000000000000000000000000000000000',
	) {
		const factory = new YlideRegistryV4__factory(signer);
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

	async setBonucer(
		registry: IEVMRegistryContractLink,
		signer: ethers.Signer,
		from: string,
		bonucerAddress: string,
	): Promise<ethers.ContractTransaction> {
		const contract = this.cache.getContract(registry.address, signer);
		return await contract.changeBonucer(bonucerAddress, { from });
	}

	async getBonucer(registry: IEVMRegistryContractLink): Promise<string> {
		return await this.cache.contractOperation(registry, async contract => {
			const [bonucer] = await contract.functions.bonucer();
			return bonucer;
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
