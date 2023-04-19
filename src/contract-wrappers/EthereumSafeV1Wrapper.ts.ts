import { IYlideMailer, YlideSafeV1, YlideSafeV1__factory } from '@ylide/ethereum-contracts';
import { MailPushEventObject } from '@ylide/ethereum-contracts/lib/contracts/YlideMailerV9';
import { ethers } from 'ethers';
import type { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import { IEVMEvent, IEVMMessage, IEVMYlideSafeContractLink, MailWrapperArgs, processSendMailTxV9 } from '../misc';
import { ContractCache } from './ContractCache';
import { EthereumMailerV9Wrapper } from './v9';

const SAFE_ABI = [
	{
		inputs: [],
		name: 'getOwners',
		outputs: [
			{
				internalType: 'address[]',
				name: '',
				type: 'address[]',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'owner',
				type: 'address',
			},
		],
		name: 'isOwner',
		outputs: [
			{
				internalType: 'bool',
				name: '',
				type: 'bool',
			},
		],
		stateMutability: 'view',
		type: 'function',
	},
];

export class EthereumSafeV1Wrapper {
	public readonly cache: ContractCache<YlideSafeV1>;

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		this.cache = new ContractCache(YlideSafeV1__factory, blockchainReader);
	}

	static async deploy(signer: ethers.Signer, mailer: string) {
		const factory = new YlideSafeV1__factory(signer);
		return (await factory.deploy(mailer)).address;
	}

	getOwner(contract: IEVMYlideSafeContractLink): Promise<string> {
		return this.cache.contractOperation(contract, c => c.owner());
	}

	getVersion(contract: IEVMYlideSafeContractLink): Promise<number> {
		return this.cache.contractOperation(contract, c => c.version().then(r => r.toNumber()));
	}

	getYlideMailer(contract: IEVMYlideSafeContractLink): Promise<string> {
		return this.cache.contractOperation(contract, c => c.ylideMailer());
	}

	getSafeOwners(safeAddress: string) {
		return this.cache.blockchainReader.retryableOperation<Promise<string[]>>(provider => {
			const contract = new ethers.Contract(safeAddress, SAFE_ABI, provider);
			return contract.getOwners();
		});
	}

	isSafeOwner(safeAddress: string, userAddress: string) {
		return this.cache.blockchainReader.retryableOperation<Promise<boolean>>(provider => {
			const contract = new ethers.Contract(safeAddress, SAFE_ABI, provider);
			return contract.isOwner(userAddress);
		});
	}

	async setOwner(
		contract: IEVMYlideSafeContractLink,
		signer: ethers.Signer,
		newOwner: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const c = this.cache.getContract(contract.address, signer);
		const tx = await c.transferOwnership(newOwner);
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async setYlideMailer(
		contract: IEVMYlideSafeContractLink,
		signer: ethers.Signer,
		mailerAddress: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const c = this.cache.getContract(contract.address, signer);
		const tx = await c.setYlideMailer(mailerAddress);
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async pause(
		contract: IEVMYlideSafeContractLink,
		signer: ethers.Signer,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const c = this.cache.getContract(contract.address, signer);
		const tx = await c.pause();
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async unpause(
		contract: IEVMYlideSafeContractLink,
		signer: ethers.Signer,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const c = this.cache.getContract(contract.address, signer);
		const tx = await c.pause();
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async sendBulkMail(
		{ mailer, signer, value }: MailWrapperArgs,
		sendBulkArgs: IYlideMailer.SendBulkArgsStruct,
		signatureArgs: IYlideMailer.SignatureArgsStruct,
		mailerWrapper: EthereumMailerV9Wrapper,
		ylideSafe: IEVMYlideSafeContractLink,
		safeArgs: YlideSafeV1.SafeArgsStruct,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const mailerContract = mailerWrapper.cache.getContract(mailer.address, signer);
		const contract = this.cache.getContract(ylideSafe.address, signer);
		const tx = await contract.sendBulkMail(sendBulkArgs, signatureArgs, safeArgs, { value });
		console.log(tx);
		return processSendMailTxV9(tx, mailerContract, mailer, (msgs: IEVMEvent<MailPushEventObject>[]) =>
			this.blockchainReader.enrichEvents<MailPushEventObject>(msgs),
		);
	}

	async addMailRecipients(
		{ mailer, signer, value }: MailWrapperArgs,
		addMailRecipientsArgs: IYlideMailer.AddMailRecipientsArgsStruct,
		signatureArgs: IYlideMailer.SignatureArgsStruct,
		mailerWrapper: EthereumMailerV9Wrapper,
		ylideSafe: IEVMYlideSafeContractLink,
		safeArgs: YlideSafeV1.SafeArgsStruct,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const mailerContract = mailerWrapper.cache.getContract(mailer.address, signer);
		const contract = this.cache.getContract(ylideSafe.address, signer);
		const tx = await contract.addMailRecipients(addMailRecipientsArgs, signatureArgs, safeArgs, { value });
		return processSendMailTxV9(tx, mailerContract, mailer, (msgs: IEVMEvent<MailPushEventObject>[]) =>
			this.blockchainReader.enrichEvents<MailPushEventObject>(msgs),
		);
	}
}
