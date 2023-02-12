import { ethers } from 'ethers';
import { YlideRegistryV6, YlideRegistryV6__factory } from '@ylide/ethereum-contracts';
import { KeyAttachedEvent } from '@ylide/ethereum-contracts/lib/YlideRegistryV6';
import { ExternalYlidePublicKey, PublicKey, PublicKeyType, Uint256 } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import { IEventPosition, IEVMRegistryContractLink } from '../misc';
import { ContractCache } from './ContractCache';
import { BlockNumberRingBufferIndex } from '../controllers/misc/BlockNumberRingBufferIndex';
import { ethersEventToInternalEvent } from '../controllers/helpers/ethersHelper';

export class EthereumRegistryV6Wrapper {
	private readonly cache: ContractCache<YlideRegistryV6>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlideRegistryV6__factory, blockchainReader);
	}

	static async deploy(signer: ethers.Signer, from: string) {
		const factory = new YlideRegistryV6__factory(signer);
		return (
			await factory.deploy({
				from,
			})
		).address;
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
			const [entry] = await contract.functions.getPublicKey(address);
			const { previousEventsIndex, publicKey, block, timestamp, keyVersion, registrar } = entry;
			if (keyVersion === 0) {
				return null;
			}
			return {
				keyVersion,
				publicKey: PublicKey.fromBytes(
					PublicKeyType.YLIDE,
					SmartBuffer.ofHexString(publicKey.toHexString().replace('0x', '')).bytes,
				),
				timestamp: timestamp.toNumber(),
				registrar,
			};
		});
	}

	async getPublicKeysHistoryForAddress(
		registry: IEVMRegistryContractLink,
		address: string,
	): Promise<ExternalYlidePublicKey[]> {
		return await this.cache.contractOperation(registry, async (contract, provider, blockLimit) => {
			const [entry] = await contract.functions.getPublicKey(address);
			const { previousEventsIndex, publicKey, block, timestamp, keyVersion, registrar } = entry;

			if (keyVersion === 0) {
				return [];
			}

			const parseFull = (e: KeyAttachedEvent): IEventPosition & { index: number[] } => {
				return {
					blockNumber: e.blockNumber,
					transactionIndex: e.transactionIndex,
					logIndex: e.logIndex,
					index: BlockNumberRingBufferIndex.decodeIndexValue(
						e.args.previousEventsIndex.toHexString().replace('0x', '').padStart(64, '0') as Uint256,
					),
				};
			};

			const events = await BlockNumberRingBufferIndex.readIndexedEntries({
				parseFull,

				getBaseIndex: async () =>
					BlockNumberRingBufferIndex.decodeIndexValue(
						previousEventsIndex.toHexString().replace('0x', '').padStart(64, '0') as Uint256,
					),
				queryEntries: async (fromB, toB) =>
					await contract.queryFilter(contract.filters.KeyAttached(address), fromB, toB),

				blockLimit,

				fromEntry: null,
				includeFromEntry: false,
				toEntry: null,
				includeToEntry: false,

				limit: 500,
				divider: 128,
			});

			const enrichedEvents = await this.blockchainReader.enrichEvents<KeyAttachedEvent>(
				events.map(e => ethersEventToInternalEvent(e)),
			);

			const keys: ExternalYlidePublicKey[] = enrichedEvents.map(e => ({
				keyVersion: e.event.parsed.keyVersion,
				publicKey: PublicKey.fromBytes(
					PublicKeyType.YLIDE,
					SmartBuffer.ofHexString(e.event.parsed.publicKey.toHexString().replace('0x', '')).bytes,
				),
				timestamp: e.block.timestamp,
				registrar: e.event.parsed.registrar,
			}));

			if (Math.floor(enrichedEvents[0]?.block.number / 128) !== Math.floor(block.toNumber() / 128)) {
				keys.unshift({
					keyVersion,
					publicKey: PublicKey.fromBytes(
						PublicKeyType.YLIDE,
						SmartBuffer.ofHexString(publicKey.toHexString().replace('0x', '')).bytes,
					),
					timestamp: timestamp.toNumber(),
					registrar,
				});
			}

			return keys;
		});
	}

	async attachPublicKey(
		registry: IEVMRegistryContractLink,
		signer: ethers.Signer,
		from: string,
		publicKey: ExternalYlidePublicKey,
	): Promise<ethers.ContractTransaction> {
		const contract = this.cache.getContract(registry.address, signer);
		return await contract.attachPublicKey(publicKey.publicKey.bytes, publicKey.keyVersion, publicKey.registrar, {
			from,
		});
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
		registrar: number,
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
			registrar,
			referrer || '0x0000000000000000000000000000000000000000',
			payBonus,
			{ value, from },
		);
	}

	async getTerminationBlock(registry: IEVMRegistryContractLink): Promise<number> {
		return await this.cache.contractOperation(registry, async (contract, provider) => {
			const terminationBlock = await contract.terminationBlock();
			return terminationBlock.toNumber();
		});
	}

	async gracefullyTerminateAt(
		registry: IEVMRegistryContractLink,
		signer: ethers.Signer,
		from: string,
		blockNumber: number,
	): Promise<ethers.ContractTransaction> {
		const contract = this.cache.getContract(registry.address, signer);
		return await contract.gracefullyTerminateAt(blockNumber, { from });
	}
}
