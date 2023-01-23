import { ethers } from 'ethers';
import { YlideMailerV8, YlideMailerV8__factory } from '@ylide/ethereum-contracts';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';
import { Uint256 } from '@ylide/sdk';
import { BlockNumberRingBufferIndex } from '../misc/BlockNumberRingBufferIndex';

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
		mailerAddress: string,
		callback: (contract: YlideMailerV8, provider: ethers.providers.Provider) => Promise<T>,
	): Promise<T> {
		return await this.blockchainReader.retryableOperation(async provider => {
			const contract = this.getMailerContract(mailerAddress, provider);
			return await callback(contract, provider);
		});
	}

	async getRecipientToPushIndex(mailerAddress: string, recipient: Uint256): Promise<number[]> {
		return await this.contractOperation(mailerAddress, async contract => {
			const [bn] = await contract.functions.recipientToPushIndex(recipient);
			const index = bn.toHexString().replace('0x', '').padStart(64, '0') as Uint256;
			return BlockNumberRingBufferIndex.decodeIndexValue(index);
		});
	}

	async getRecipientMessagesCount(mailerAddress: string, recipient: Uint256): Promise<number> {
		return await this.contractOperation(mailerAddress, async contract => {
			const [bn] = await contract.functions.recipientMessagesCount(recipient);
			return bn.toNumber();
		});
	}

	async getSenderToBroadcastIndex(mailerAddress: string, sender: string): Promise<number[]> {
		return await this.contractOperation(mailerAddress, async contract => {
			const [bn] = await contract.functions.senderToBroadcastIndex(sender);
			const index = bn.toHexString().replace('0x', '').padStart(64, '0') as Uint256;
			return BlockNumberRingBufferIndex.decodeIndexValue(index);
		});
	}

	async getSenderMessagesCount(mailerAddress: string, sender: string): Promise<number> {
		return await this.contractOperation(mailerAddress, async contract => {
			const [bn] = await contract.functions.broadcastMessagesCount(sender);
			return bn.toNumber();
		});
	}
}
