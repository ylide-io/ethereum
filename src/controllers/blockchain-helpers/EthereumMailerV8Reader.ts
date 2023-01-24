import { ethers } from 'ethers';
import { YlideMailerV8, YlideMailerV8__factory } from '@ylide/ethereum-contracts';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';
import { Uint256 } from '@ylide/sdk';
import { BlockNumberRingBufferIndex } from '../misc/BlockNumberRingBufferIndex';
import { IEthereumContractDescriptor } from '../EthereumBlockchainController';
import { MailContentEvent, MailPushEvent } from '@ylide/ethereum-contracts/lib/YlideMailerV8';

export class EthereumMailerV8Reader {
	private readonly mailerContractCache: Record<string, Map<ethers.providers.Provider, YlideMailerV8>> = {};

	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		//
	}

	private getMailerContract(address: string, provider: ethers.providers.Provider): YlideMailerV8 {
		if (!this.mailerContractCache[address] || !this.mailerContractCache[address].has(provider)) {
			const contract = YlideMailerV8__factory.connect(address, provider);
			if (!this.mailerContractCache[address]) {
				this.mailerContractCache[address] = new Map();
			}
			this.mailerContractCache[address].set(provider, contract);

			return contract;
		} else {
			return this.mailerContractCache[address].get(provider)!;
		}
	}

	async contractOperation<T>(
		mailer: IEthereumContractDescriptor,
		callback: (
			contract: YlideMailerV8,
			provider: ethers.providers.Provider,
			blockLimit: number,
			latestNotSupported: boolean,
			batchNotSupported: boolean,
			stopTrying: () => void,
		) => Promise<T>,
	): Promise<T> {
		return await this.blockchainReader.retryableOperation(
			async (provider, blockLimit, latestNotSupported, batchNotSupported, stopTrying) => {
				const contract = this.getMailerContract(mailer.address, provider);
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

	async getRecipientToPushIndex(mailer: IEthereumContractDescriptor, recipient: Uint256): Promise<number[]> {
		return await this.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.recipientToPushIndex(recipient);
			const index = bn.toHexString().replace('0x', '').padStart(64, '0') as Uint256;
			return BlockNumberRingBufferIndex.decodeIndexValue(index);
		});
	}

	async getRecipientMessagesCount(mailer: IEthereumContractDescriptor, recipient: Uint256): Promise<number> {
		return await this.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.recipientMessagesCount(recipient);
			return bn.toNumber();
		});
	}

	async getSenderToBroadcastIndex(mailer: IEthereumContractDescriptor, sender: string): Promise<number[]> {
		return await this.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.senderToBroadcastIndex(sender);
			const index = bn.toHexString().replace('0x', '').padStart(64, '0') as Uint256;
			return BlockNumberRingBufferIndex.decodeIndexValue(index);
		});
	}

	async getSenderMessagesCount(mailer: IEthereumContractDescriptor, sender: string): Promise<number> {
		return await this.contractOperation(mailer, async contract => {
			const [bn] = await contract.functions.broadcastMessagesCount(sender);
			return bn.toNumber();
		});
	}

	async getMessageContentEvents(
		mailer: IEthereumContractDescriptor,
		msgId: Uint256,
		fromBlock?: number,
		toBlock?: number,
	): Promise<MailContentEvent[]> {
		return await this.contractOperation(mailer, async contract => {
			return await contract.queryFilter(contract.filters.MailContent('0x' + msgId), fromBlock, toBlock);
		});
	}

	async getMessagePushEvents(
		mailer: IEthereumContractDescriptor,
		recipient: Uint256 | null,
		sender: string | null,
		fromBlock?: number,
		toBlock?: number,
	): Promise<MailPushEvent[]> {
		return await this.contractOperation(mailer, async contract => {
			return await contract.queryFilter(
				contract.filters.MailPush(recipient ? `0x${recipient}` : null, sender),
				fromBlock,
				toBlock,
			);
		});
	}
}
