import { IYlideMailer, YlidePayV1, YlidePayV1__factory } from '@ylide/ethereum-contracts';
import { MailPushEventObject } from '@ylide/ethereum-contracts/lib/contracts/YlideMailerV9';
import { TokenAttachmentEvent } from '@ylide/ethereum-contracts/lib/contracts/YlidePayV1';
import { BigNumber, ethers } from 'ethers';
import type { EthereumBlockchainReader } from '../controllers/helpers/EthereumBlockchainReader';
import {
	IEVMEvent,
	IEVMMessage,
	IEVMYlidePayContractLink,
	MailWrapperArgs,
	PayAttachment,
	bnToUint256,
	getMultipleEvents,
	isSentSender,
	processSendMailTxV9,
} from '../misc';
import { ContractCache } from './ContractCache';
import { EthereumMailerV9Wrapper } from './v9';

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

	async pause(
		contract: IEVMYlidePayContractLink,
		signer: ethers.Signer,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const c = this.cache.getContract(contract.address, signer);
		const tx = await c.pause();
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async unpause(
		contract: IEVMYlidePayContractLink,
		signer: ethers.Signer,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const c = this.cache.getContract(contract.address, signer);
		const tx = await c.pause();
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async sendBulkMailWithToken(
		{ mailer, signer, value }: MailWrapperArgs,
		sendBulkArgs: IYlideMailer.SendBulkArgsStruct,
		signatureArgs: IYlideMailer.SignatureArgsStruct,
		mailerWrapper: EthereumMailerV9Wrapper,
		payer: IEVMYlidePayContractLink,
		paymentArgs: YlidePayV1.TransferInfoStruct[],
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const mailerContract = mailerWrapper.cache.getContract(mailer.address, signer);
		const contract = this.cache.getContract(payer.address, signer);
		const tx = await contract.sendBulkMailWithToken(sendBulkArgs, signatureArgs, paymentArgs, { value });
		return processSendMailTxV9(tx, mailerContract, mailer, (msgs: IEVMEvent<MailPushEventObject>[]) =>
			this.blockchainReader.enrichEvents<MailPushEventObject>(msgs),
		);
	}

	async addMailRecipientsWithToken(
		{ mailer, signer, value }: MailWrapperArgs,
		addMailRecipientsArgs: IYlideMailer.AddMailRecipientsArgsStruct,
		signatureArgs: IYlideMailer.SignatureArgsStruct,
		mailerWrapper: EthereumMailerV9Wrapper,
		payer: IEVMYlidePayContractLink,
		paymentArgs: YlidePayV1.TransferInfoStruct[],
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const mailerContract = mailerWrapper.cache.getContract(mailer.address, signer);
		const contract = this.cache.getContract(payer.address, signer);
		const tx = await contract.addMailRecipientsWithToken(addMailRecipientsArgs, signatureArgs, paymentArgs, {
			value,
		});
		return processSendMailTxV9(tx, mailerContract, mailer, (msgs: IEVMEvent<MailPushEventObject>[]) =>
			this.blockchainReader.enrichEvents<MailPushEventObject>(msgs),
		);
	}

	getTokenAttachments(payLink: IEVMYlidePayContractLink, message: IEVMMessage): Promise<PayAttachment[]> {
		return this.cache.contractOperation(payLink, async (contract, _, blockLimit) => {
			const events = await getMultipleEvents<TokenAttachmentEvent>(
				contract,
				contract.filters.TokenAttachment(
					'0x' + message.$$meta.contentId,
					null,
					isSentSender(message.senderAddress, message.recipientAddress)
						? null
						: BigNumber.from(`0x${message.recipientAddress}`).toHexString(),
				),
				blockLimit,
				message.$$meta.contentId,
			);
			return events.map(e => this.parseTokenAttachmentEvent(e));
		});
	}

	private parseTokenAttachmentEvent(event: TokenAttachmentEvent): PayAttachment {
		return {
			amountOrTokenId: event.args.amountOrTokenId.toBigInt(),
			recipient: event.args.recipient,
			sender: event.args.sender,
			token: event.args.token,
			tokenType: event.args.tokenType,
			contentId: bnToUint256(event.args.contentId),
		};
	}
}
