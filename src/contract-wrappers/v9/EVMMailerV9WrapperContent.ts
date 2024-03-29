import type { LogDescription } from '@ethersproject/abi';
import type {
	MessageContentEvent,
	MessageContentEventObject,
} from '@ylide/ethereum-contracts/lib/contracts/YlideMailerV9';
import type { IMessageContent, IMessageCorruptedContent } from '@ylide/sdk';
import type { ethers } from 'ethers';
import type { GenericMessageContentEventObject } from '../../controllers/helpers/EVMContentReader';
import { EVMContentReader } from '../../controllers/helpers/EVMContentReader';
import { ethersEventToInternalEvent } from '../../controllers/helpers/ethersHelper';
import { getMultipleEvents } from '../../misc';
import type { IEVMMailerContractLink, IEVMMessage } from '../../misc/types';
import type { EVMMailerV9Wrapper } from './EVMMailerV9Wrapper';

export class EVMMailerV9WrapperContent {
	constructor(public readonly wrapper: EVMMailerV9Wrapper) {
		//
	}

	async sendMessageContentPart(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		uniqueId: number,
		firstBlockNumber: number,
		blockCountLock: number,
		parts: number,
		partIdx: number,
		content: Uint8Array,
		value: ethers.BigNumber,
	): Promise<{
		tx: ethers.ContractTransaction;
		receipt: ethers.ContractReceipt;
		logs: ethers.utils.LogDescription[];
	}> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.sendMessageContentPart(
			uniqueId,
			firstBlockNumber,
			blockCountLock,
			parts,
			partIdx,
			content,
			{ from, value },
		);
		const receipt = await tx.wait();
		const logs = receipt.logs
			.map(l => {
				try {
					return contract.interface.parseLog(l);
				} catch (err) {
					return null;
				}
			})
			.filter(l => !!l) as LogDescription[];
		return { tx, receipt, logs };
	}

	processMessageContentEvent(args: MessageContentEventObject): GenericMessageContentEventObject {
		return {
			contentId: args.contentId.toHexString().replace('0x', '').padStart(64, '0'),
			sender: args.sender,
			parts: args.parts,
			partIdx: args.partIdx,
			content: args.content,
		};
	}

	async retrieveMessageContent(
		mailer: IEVMMailerContractLink,
		message: IEVMMessage,
	): Promise<IMessageContent | IMessageCorruptedContent | null> {
		return await this.wrapper.cache.contractOperation(mailer, async (contract, provider, blockLimit) => {
			const events = await getMultipleEvents<MessageContentEvent>(
				contract,
				contract.filters.MessageContent('0x' + message.$$meta.contentId),
				blockLimit,
				message.$$meta.contentId,
				true,
			);
			events.sort((a, b) => a.args.partIdx - b.args.partIdx);
			const enrichedEvents = await this.wrapper.blockchainReader.enrichEvents(
				events.map(e => ethersEventToInternalEvent(e, this.processMessageContentEvent.bind(this))),
			);
			const content = EVMContentReader.processMessageContent(message.msgId, enrichedEvents);
			return EVMContentReader.verifyMessageContent(message, content);
		});
	}
}
