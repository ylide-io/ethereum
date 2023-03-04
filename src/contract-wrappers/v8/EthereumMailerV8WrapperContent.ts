import { LogDescription } from '@ethersproject/abi';
import type { MessageContentEvent, MessageContentEventObject } from '@ylide/ethereum-contracts/lib/YlideMailerV8';
import type { IMessageContent, IMessageCorruptedContent } from '@ylide/sdk';
import { ethers } from 'ethers';
import { EthereumContentReader } from '../../controllers/helpers/EthereumContentReader';
import type { GenericMessageContentEventObject } from '../../controllers/helpers/EthereumContentReader';
import { ethersEventToInternalEvent } from '../../controllers/helpers/ethersHelper';
import { decodeContentId } from '../../misc/contentId';
import type { IEVMMailerContractLink, IEVMMessage } from '../../misc/types';
import type { EthereumMailerV8Wrapper } from './EthereumMailerV8Wrapper';

export class EthereumMailerV8WrapperContent {
	constructor(public readonly wrapper: EthereumMailerV8Wrapper) {
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
			const decodedContentId = decodeContentId(message.$$meta.contentId);
			const events: MessageContentEvent[] = [];
			for (
				let i = decodedContentId.blockNumber;
				i <= decodedContentId.blockNumber + decodedContentId.blockCountLock;
				i += blockLimit
			) {
				const newEvents = await contract.queryFilter(
					contract.filters.MessageContent('0x' + message.$$meta.contentId),
					i,
					Math.min(i + blockLimit, decodedContentId.blockNumber + decodedContentId.blockCountLock),
				);
				events.push(...newEvents);
				if (events.length >= decodedContentId.partsCount) {
					break;
				}
			}
			events.sort((a, b) => a.args.partIdx - b.args.partIdx);
			const enrichedEvents = await this.wrapper.blockchainReader.enrichEvents(
				events.map(e => ethersEventToInternalEvent(e, this.processMessageContentEvent.bind(this))),
			);
			const content = EthereumContentReader.processMessageContent(message.msgId, enrichedEvents);
			return EthereumContentReader.verifyMessageContent(message, content);
		});
	}
}
