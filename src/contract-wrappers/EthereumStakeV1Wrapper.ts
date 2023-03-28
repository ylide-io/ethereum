import { ethers } from 'ethers';
import type { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import { ContractCache } from './ContractCache';
import { YlideStakeV1, YlideStakeV1__factory } from '@mock/ethereum-contracts/typechain-types';
import { upgrades } from 'hardhat';
import { IEVMYlideStakeContractType, Payment, TokenAttachmentContractType } from '../misc';
import { Uint256 } from '@ylide/sdk';
import { IYlidePayStake } from '@mock/ethereum-contracts/typechain-types/contracts/YlideStakeV1';

export class EthereumStakeV1Wrapper {
	public readonly cache: ContractCache<YlideStakeV1>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlideStakeV1__factory, blockchainReader);
	}

	static async deploy(signer: ethers.Signer) {
		const factory = new YlideStakeV1__factory(signer);

		const contract = await upgrades.deployProxy(factory, [], {
			initializer: 'initialize',
			kind: 'uups',
		});

		return contract.address;
	}

	static async upgrade(proxyAddress: string, signer: ethers.Signer) {
		const factory = new YlideStakeV1__factory(signer);

		const oldImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
		console.log(`Old implementation contract - ${oldImplementation}`);

		await upgrades.upgradeProxy(proxyAddress, factory);

		const newImplementation = await upgrades.erc1967.getImplementationAddress(proxyAddress);
		console.log(`New implementation contract - ${newImplementation}`);
	}

	getOwner(contract: IEVMYlideStakeContractType): Promise<string> {
		return this.cache.contractOperation(contract, c => c.owner());
	}

	getContractType(contract: IEVMYlideStakeContractType): Promise<number> {
		return this.cache.contractOperation(contract, c => c.contractType());
	}

	getVersion(contract: IEVMYlideStakeContractType): Promise<number> {
		return this.cache.contractOperation(contract, c => c.version().then(r => r.toNumber()));
	}

	getYlideMailer(contract: IEVMYlideStakeContractType): Promise<string> {
		return this.cache.contractOperation(contract, c => c.ylideMailer());
	}

	async setOwner(
		contract: IEVMYlideStakeContractType,
		signer: ethers.Signer,
		newOwner: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const c = this.cache.getContract(contract.address, signer);
		const tx = await c.transferOwnership(newOwner);
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async setYlideMailer(
		contract: IEVMYlideStakeContractType,
		signer: ethers.Signer,
		mailerAddress: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const c = this.cache.getContract(contract.address, signer);
		const tx = await c.setYlideMailer(mailerAddress);
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	private validatePayments(payments: Payment[]): void {
		const paymentType = payments[0].type;
		if (paymentType !== TokenAttachmentContractType.Stake) {
			throw new Error('Only Stake payments are supported');
		}
		for (const p of payments) {
			if (p.type !== paymentType) {
				throw new Error('Payments must be of the same type');
			}
		}
	}

	async sendBulkMailWithToken({
		contractAddress,
		signer,
		from,
		feedId,
		uniqueId,
		recipients,
		keys,
		content,
		payments,
	}: {
		contractAddress: string;
		signer: ethers.Signer;
		from: string;
		feedId: Uint256;
		uniqueId: number;
		recipients: Uint256[];
		keys: Uint8Array[];
		content: Uint8Array;
		payments: Payment[];
	}) {
		this.validatePayments(payments);

		const contract = this.cache.getContract(contractAddress, signer);

		const tx = await contract.sendBulkMailWithToken(
			`0x${feedId}`,
			uniqueId,
			recipients.map(r => `0x${r}`),
			keys,
			content,
			payments.map(p => p.args as unknown as IYlidePayStake.TransferInfoStruct),
			{ from },
		);

		return tx;
	}

	async addMailRecipientsWithToken({
		contractAddress,
		signer,
		from,
		feedId,
		uniqueId,
		firstBlockNumber,
		partsCount,
		blockCountLock,
		recipients,
		keys,
		payments,
	}: {
		contractAddress: string;
		signer: ethers.Signer;
		from: string;
		feedId: Uint256;
		uniqueId: number;
		firstBlockNumber: number;
		partsCount: number;
		blockCountLock: number;
		recipients: Uint256[];
		keys: Uint8Array[];
		payments: Payment[];
	}) {
		this.validatePayments(payments);

		const contract = this.cache.getContract(contractAddress, signer);

		const tx = await contract.addMailRecipientsWithToken(
			`0x${feedId}`,
			uniqueId,
			firstBlockNumber,
			partsCount,
			blockCountLock,
			recipients.map(r => `0x${r}`),
			keys,
			payments.map(p => p.args as unknown as IYlidePayStake.TransferInfoStruct),
			{ from },
		);

		return tx;
	}
}
