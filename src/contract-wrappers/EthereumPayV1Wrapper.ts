import { Uint256 } from '@ylide/sdk';
import { ethers } from 'ethers';
import type { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import { IEVMYlidePayContractType, Payment, TokenAttachmentContractType } from '../misc';
import { ContractCache } from './ContractCache';
import { YlidePayV1, YlidePayV1__factory } from './v9/mock';
import { IYlidePayStake } from './v9/mock/contracts/YlidePayV1';

export class EthereumPayV1Wrapper {
	public readonly cache: ContractCache<YlidePayV1>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlidePayV1__factory, blockchainReader);
	}

	static async deploy(signer: ethers.Signer, from: string) {
		const factory = new YlidePayV1__factory(signer);
		return (await factory.deploy()).address;
	}

	getOwner(contract: IEVMYlidePayContractType): Promise<string> {
		return this.cache.contractOperation(contract, c => c.owner());
	}

	getContractType(contract: IEVMYlidePayContractType): Promise<number> {
		return this.cache.contractOperation(contract, c => c.contractType());
	}

	getVersion(contract: IEVMYlidePayContractType): Promise<number> {
		return this.cache.contractOperation(contract, c => c.version().then(r => r.toNumber()));
	}

	getYlideMailer(contract: IEVMYlidePayContractType): Promise<string> {
		return this.cache.contractOperation(contract, c => c.ylideMailer());
	}

	async setOwner(
		contract: IEVMYlidePayContractType,
		signer: ethers.Signer,
		newOwner: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const c = this.cache.getContract(contract.address, signer);
		const tx = await c.transferOwnership(newOwner);
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async setYlideMailer(
		contract: IEVMYlidePayContractType,
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
		if (paymentType !== TokenAttachmentContractType.Pay) {
			throw new Error('Only Pay payments are supported');
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
