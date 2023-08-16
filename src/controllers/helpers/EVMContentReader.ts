import type { IMessage, IMessageContent, IMessageCorruptedContent } from '@ylide/sdk';
import { MessageContentFailure } from '@ylide/sdk';
import { SmartBuffer } from '@ylide/smart-buffer';

import type { IEVMEnrichedEvent } from '../../misc/types';
import type { EVMBlockchainReader } from './EVMBlockchainReader';

export interface GenericMessageContentEventObject {
	contentId: string;
	sender: string;
	parts: number;
	partIdx: number;
	content: string;
}

export class EVMContentReader {
	constructor(public readonly blockchainReader: EVMBlockchainReader) {
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
