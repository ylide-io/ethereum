import { BigNumber, ethers } from 'ethers';
import { YlideRegistryV5, YlideRegistryV5__factory } from '@ylide/ethereum-contracts';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';
import { ExternalYlidePublicKey, PublicKey, PublicKeyType } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { IEthereumContractDescriptor } from '../EthereumBlockchainController';

export class EthereumRegistryV5Wrapper {
	private readonly registryContractCache: Record<
		string,
		Map<ethers.providers.Provider | ethers.Signer, YlideRegistryV5>
	> = {};

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		//
	}

	private getRegistryContract(
		address: string,
		providerOrSigner: ethers.providers.Provider | ethers.Signer,
	): YlideRegistryV5 {
		if (!this.registryContractCache[address] || !this.registryContractCache[address].has(providerOrSigner)) {
			const contract = YlideRegistryV5__factory.connect(address, providerOrSigner);
			if (!this.registryContractCache[address]) {
				this.registryContractCache[address] = new Map();
			}
			this.registryContractCache[address].set(providerOrSigner, contract);

			return contract;
		} else {
			return this.registryContractCache[address].get(providerOrSigner)!;
		}
	}

	async contractOperation<T>(
		registry: IEthereumContractDescriptor,
		callback: (
			contract: YlideRegistryV5,
			provider: ethers.providers.Provider,
			blockLimit: number,
			latestNotSupported: boolean,
			batchNotSupported: boolean,
			stopTrying: () => void,
		) => Promise<T>,
	): Promise<T> {
		return await this.blockchainReader.retryableOperation(
			async (provider, blockLimit, latestNotSupported, batchNotSupported, stopTrying) => {
				const contract = this.getRegistryContract(registry.address, provider);
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
		registry: IEthereumContractDescriptor,
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
			};
		});
	}

	async attachPublicKey(
		registry: IEthereumContractDescriptor,
		signer: ethers.Signer,
		publicKey: ExternalYlidePublicKey,
	): Promise<ethers.ContractTransaction> {
		const contract = this.getRegistryContract(registry.address, signer);
		return await contract.attachPublicKey(publicKey.publicKey.bytes, publicKey.keyVersion);
	}

	async getBonuces(registry: IEthereumContractDescriptor): Promise<{ newcomer: number; referrer: number }> {
		return await this.contractOperation(registry, async contract => {
			const [newcomerBonus] = await contract.functions.newcomerBonus();
			const [referrerBonus] = await contract.functions.referrerBonus();
			return {
				newcomer: Number(ethers.utils.formatUnits(newcomerBonus, 'ether')),
				referrer: Number(ethers.utils.formatUnits(referrerBonus, 'ether')),
			};
		});
	}

	async setBonuces(
		registry: IEthereumContractDescriptor,
		signer: ethers.Signer,
		newcomerBonus: number,
		referrerBonus: number,
	): Promise<ethers.ContractTransaction> {
		const contract = this.getRegistryContract(registry.address, signer);
		return await contract.setBonuses(
			ethers.utils.parseUnits(newcomerBonus.toString(), 'ether'),
			ethers.utils.parseUnits(referrerBonus.toString(), 'ether'),
		);
	}

	async addBonucer(
		registry: IEthereumContractDescriptor,
		signer: ethers.Signer,
		bonucerAddress: string,
	): Promise<ethers.ContractTransaction> {
		const contract = this.getRegistryContract(registry.address, signer);
		return await contract.setBonucer(bonucerAddress, true);
	}

	async removeBonucer(
		registry: IEthereumContractDescriptor,
		signer: ethers.Signer,
		bonucerAddress: string,
	): Promise<ethers.ContractTransaction> {
		const contract = this.getRegistryContract(registry.address, signer);
		return await contract.setBonucer(bonucerAddress, false);
	}

	async getIsBonucer(registry: IEthereumContractDescriptor, bonucerAddress: string): Promise<boolean> {
		return await this.contractOperation(registry, async contract => {
			const [isBonucer] = await contract.functions.bonucers(bonucerAddress);
			return isBonucer;
		});
	}

	async attachPublicKeyByAdmin(
		registry: IEthereumContractDescriptor,
		signer: ethers.Signer,
		txSignature: { v: number; r: string; s: string },
		address: string,
		publicKey: Uint8Array,
		keyVersion: number,
		referrer: string | null,
		payBonus: boolean,
		value: string,
	): Promise<ethers.ContractTransaction> {
		const contract = this.getRegistryContract(registry.address, signer);
		return await contract.attachPublicKeyByAdmin(
			txSignature.v,
			txSignature.r,
			txSignature.s,
			address,
			publicKey,
			keyVersion,
			referrer || '0x0000000000000000000000000000000000000000',
			payBonus,
			{ value },
		);
	}
}
