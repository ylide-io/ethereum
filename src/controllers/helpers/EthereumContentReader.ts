import { IMessage, IMessageContent, IMessageCorruptedContent, MessageContentFailure, Uint256 } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { IEVMMailerContractLink, IEVMEnrichedEvent } from '../../misc';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';
import { EthereumMailerV8Wrapper } from '../../contract-wrappers/EthereumMailerV8Wrapper';
import { TypedEvent } from '@ylide/ethereum-contracts/lib/common';

export type IHistorySource = { type: 'recipient'; recipient: Uint256 } | { type: 'broadcast'; sender: string };

export interface GenericMessageContentEventObject {
	sender: string;
	parts: number;
	partIdx: number;
	content: string;
}

export class EthereumContentReader {
	constructor(public readonly blockchainReader: EthereumBlockchainReader) {
		//
	}

	static enoughEvents(events: GenericMessageContentEventObject[]): boolean {
		if (!events.length) {
			return false;
		}
		const parts = events[0].parts;
		for (let idx = 0; idx < parts; idx++) {
			if (!events.find(e => e.partIdx === idx)) {
				return false;
			}
		}
		return true;
	}

	// async retrieveMessageContentByMessageHeader(
	// 	mailer: { link: IEVMMailerContractLink; wrapper: EthereumMailerV8Wrapper },
	// 	msg: IMessage,
	// ): Promise<IMessageContent | IMessageCorruptedContent | null> {
	// 	let i = msg.$$meta.event.blockNumber;
	// 	const totalEvents: GenericMessageContentEventObject[] = [];
	// 	let done = false;
	// 	while (i >= mailer.link.creationBlock) {
	// 		const partEvents = await mailer.wrapper.contractOperation(
	// 			mailer.link,
	// 			async (contract, provider, blockLimit) => {
	// 				const events = await contract.queryFilter(
	// 					contract.filters.MessageContent(msg.msgId),
	// 					i - blockLimit,
	// 					i,
	// 				);
	// 				i -= blockLimit;
	// 				return events;
	// 			},
	// 		);
	// 		totalEvents.push(...partEvents);
	// 		if (this.enoughEvents(totalEvents)) {
	// 			done = true;
	// 			break;
	// 		}
	// 	}
	// 	if (!done) {
	// 		return null;
	// 	}
	// 	const messages = await this.blockchainReader.enrichEvents(totalEvents);
	// 	return this.processMessageContent(msg.msgId, messages);
	// }

	static processMessageContent(
		msgId: string,
		messagePartEvents: IEVMEnrichedEvent<GenericMessageContentEventObject>[],
	): IMessageContent | IMessageCorruptedContent | null {
		if (!messagePartEvents.length) {
			return null;
		}
		const parts = messagePartEvents[0].event.parsed.parts;
		const sender = messagePartEvents[0].event.parsed.sender;
		if (
			!messagePartEvents.every(t => t.event.parsed.parts === parts) ||
			!messagePartEvents.every(t => t.event.parsed.sender === sender)
		) {
			return {
				msgId,
				corrupted: true,
				chunks: messagePartEvents.map(m => ({ createdAt: m.block.timestamp })),
				reason: MessageContentFailure.NON_INTEGRITY_PARTS,
			};
		}
		for (let idx = 0; idx < parts; idx++) {
			if (!messagePartEvents.find(d => d.event.parsed.partIdx === idx)) {
				return {
					msgId,
					corrupted: true,
					chunks: messagePartEvents.map(m => ({ createdAt: m.block.timestamp })),
					reason: MessageContentFailure.NOT_ALL_PARTS,
				};
			}
		}
		if (messagePartEvents.length !== parts) {
			return {
				msgId,
				corrupted: true,
				chunks: messagePartEvents.map(m => ({ createdAt: m.block.timestamp })),
				reason: MessageContentFailure.DOUBLED_PARTS,
			};
		}
		const sortedChunks = messagePartEvents
			.sort((a, b) => {
				return a.event.parsed.partIdx - b.event.parsed.partIdx;
			})
			.map(m => SmartBuffer.ofHexString(m.event.parsed.content.replace('0x', '')).bytes);
		const contentSize = sortedChunks.reduce((p, c) => p + c.length, 0);
		const buf = SmartBuffer.ofSize(contentSize);
		for (const chunk of sortedChunks) {
			buf.writeBytes(chunk);
		}

		return {
			msgId,
			corrupted: false,
			storage: 'evm',
			createdAt: Math.min(...messagePartEvents.map(d => d.block.timestamp)),
			senderAddress: sender,
			parts,
			content: buf.bytes,
		};
	}

	static async verifyMessageContent(
		msg: IMessage,
		processedContent: IMessageContent | IMessageCorruptedContent | null,
	): Promise<IMessageContent | IMessageCorruptedContent | null> {
		if (!processedContent) {
			return null;
		}
		if (processedContent.corrupted) {
			return processedContent;
		}
		if (processedContent.senderAddress !== msg.senderAddress) {
			return {
				msgId: msg.msgId,
				corrupted: true,
				chunks: [],
				reason: MessageContentFailure.NON_INTEGRITY_PARTS,
			};
		}
		return processedContent;
	}
}
