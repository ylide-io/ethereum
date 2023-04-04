import { IYlideMailer, YlidePayV1, YlidePayV1__factory } from '@ylide/ethereum-contracts';
import { ethers } from 'ethers';
import type { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import { IEVMYlidePayContractLink } from '../misc';
import { ContractCache } from './ContractCache';

export class EthereumPayV1Wrapper {
	public readonly cache: ContractCache<YlidePayV1>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlidePayV1__factory, blockchainReader);
	}

	static async deploy(signer: ethers.Signer, mailer: string) {
		const factory = new YlidePayV1__factory(signer);
		return (await factory.deploy(mailer)).address;
	}

	getOwner(contract: IEVMYlidePayContractLink): Promise<string> {
		return this.cache.contractOperation(contract, c => c.owner());
	}

	getContractType(contract: IEVMYlidePayContractLink): Promise<number> {
		return this.cache.contractOperation(contract, c => c.contractType());
	}

	getVersion(contract: IEVMYlidePayContractLink): Promise<number> {
		return this.cache.contractOperation(contract, c => c.version().then(r => r.toNumber()));
	}

	getYlideMailer(contract: IEVMYlidePayContractLink): Promise<string> {
		return this.cache.contractOperation(contract, c => c.ylideMailer());
	}

	async setOwner(
		contract: IEVMYlidePayContractLink,
		signer: ethers.Signer,
		newOwner: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const c = this.cache.getContract(contract.address, signer);
		const tx = await c.transferOwnership(newOwner);
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async setYlideMailer(
		contract: IEVMYlidePayContractLink,
		signer: ethers.Signer,
		mailerAddress: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const c = this.cache.getContract(contract.address, signer);
		const tx = await c.setYlideMailer(mailerAddress);
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async sendBulkMailWithToken(
		contract: IEVMYlidePayContractLink,
		signer: ethers.Signer,
		args: IYlideMailer.SendBulkArgsStruct,
		from: string,
		value: ethers.BigNumber,
		signatureArgs: IYlideMailer.SignatureArgsStruct,
		transferInfos: YlidePayV1.TransferInfoStruct[],
	) {
		const c = this.cache.getContract(contract.address, signer);
		return c.sendBulkMailWithToken(args, signatureArgs, transferInfos, { from, value });
	}

	async addMailRecipientsWithToken(
		contract: IEVMYlidePayContractLink,
		signer: ethers.Signer,
		args: IYlideMailer.AddMailRecipientsArgsStruct,
		from: string,
		value: ethers.BigNumber,
		signatureArgs: IYlideMailer.SignatureArgsStruct,
		transferInfos: YlidePayV1.TransferInfoStruct[],
	) {
		const c = this.cache.getContract(contract.address, signer);
		return c.addMailRecipientsWithToken(args, signatureArgs, transferInfos, { from, value });
	}
}
