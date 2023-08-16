import type { IYlideMailer, YlidePayV1 } from '@ylide/ethereum-contracts';
import { YlidePayV1__factory } from '@ylide/ethereum-contracts';
import type { MailPushEventObject } from '@ylide/ethereum-contracts/lib/contracts/YlideMailerV9';
import type {
	TokenAttachmentEvent,
	TokenAttachmentEventObject,
} from '@ylide/ethereum-contracts/lib/contracts/YlidePayV1';
import type { Uint256 } from '@ylide/sdk';
import type { Contract, ethers } from 'ethers';
import { BigNumber } from 'ethers';
import { ethersLogToInternalEvent } from '../controllers';
import type { EVMBlockchainReader } from '../controllers/helpers/EVMBlockchainReader';
import type { IEVMEvent, IEVMMailerContractLink, IEVMMessage, IEVMYlidePayContractLink } from '../misc';
import { getMultipleEvents, isSentSender, parseOutLogs, processMailPushEvent } from '../misc';
import { ContractCache } from './ContractCache';

export class EVMPayV1Wrapper {
	public readonly cache: ContractCache<YlidePayV1>;

	constructor(public readonly blockchainReader: EVMBlockchainReader) {
		this.cache = new ContractCache(YlidePayV1__factory, blockchainReader);
	}

	static async deploy(signer: ethers.Signer, mailer: string) {
		const factory = new YlidePayV1__factory(signer);
		return (await factory.deploy(mailer)).address;
	}

	getOwner(contract: IEVMYlidePayContractLink): Promise<string> {
		return this.cache.contractOperation(contract, c => c.owner());
	}

	// getContractType(contract: IEVMYlidePayContractLink): Promise<number> {
	// 	return this.cache.contractOperation(contract, c => c.contractType());
	// }

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
		mailer: IEVMMailerContractLink,
		mailerContract: Contract,
		payer: IEVMYlidePayContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		uniqueId: number,
		recipients: Uint256[],
		keys: Uint8Array[],
		content: Uint8Array,
		value: ethers.BigNumber,
		signatureArgs: IYlideMailer.SignatureArgsStruct,
		paymentArgs: YlidePayV1.TransferInfoStruct[],
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const c = this.cache.getContract(payer.address, signer);
		const tx = await c.sendBulkMailWithToken(
			{
				feedId: `0x${feedId}`,
				uniqueId,
				recipients: recipients.map(r => `0x${r}`),
				keys,
				content,
			},

			signatureArgs,
			paymentArgs,
			{ from, value },
		);
		const receipt = await tx.wait();
		const {
			logs,
			byName: { MailPush },
		} = parseOutLogs(mailerContract, receipt.logs);

		const mailPushEvents = MailPush.map(l => ethersLogToInternalEvent<MailPushEventObject>(l));
		const enriched = await this.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages };
	}

	async addMailRecipientsWithToken(
		mailer: IEVMMailerContractLink,
		mailerContract: Contract,
		payer: IEVMYlidePayContractLink,
		signer: ethers.Signer,
		from: string,
		feedId: Uint256,
		uniqueId: number,
		firstBlockNumber: number,
		partsCount: number,
		blockCountLock: number,
		recipients: Uint256[],
		keys: Uint8Array[],
		value: ethers.BigNumber,
		signatureArgs: IYlideMailer.SignatureArgsStruct,
		paymentArgs: YlidePayV1.TransferInfoStruct[],
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
		mailPushEvents: IEVMEvent<MailPushEventObject>[];
		messages: IEVMMessage[];
	}> {
		const c = this.cache.getContract(payer.address, signer);
		const tx = await c.addMailRecipientsWithToken(
			{
				feedId: `0x${feedId}`,
				uniqueId,
				firstBlockNumber,
				partsCount,
				blockCountLock,
				recipients: recipients.map(r => `0x${r}`),
				keys,
			},
			signatureArgs,
			paymentArgs,
			{ from, value },
		);
		const receipt = await tx.wait();
		const {
			logs,
			byName: { MailPush },
		} = parseOutLogs(mailerContract, receipt.logs);
		const mailPushEvents = MailPush.map(l => ethersLogToInternalEvent<MailPushEventObject>(l));
		const enriched = await this.blockchainReader.enrichEvents<MailPushEventObject>(mailPushEvents);
		const messages = enriched.map(e => processMailPushEvent(mailer, e));
		return { tx, receipt, logs: logs.map(l => l.logDescription), mailPushEvents, messages };
	}

	getTokenAttachments(
		payLink: IEVMYlidePayContractLink,
		message: IEVMMessage,
	): Promise<TokenAttachmentEventObject[]> {
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

	private parseTokenAttachmentEvent(event: TokenAttachmentEvent): TokenAttachmentEventObject {
		return {
			amountOrTokenId: event.args.amountOrTokenId,
			recipient: event.args.recipient,
			sender: event.args.sender,
			token: event.args.token,
			tokenType: event.args.tokenType,
			contentId: event.args.contentId,
		};
	}
}
