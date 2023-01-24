import { MailContentEvent } from '@ylide/ethereum-contracts/lib/YlideMailerV8';
import { IMessage, IMessageContent, IMessageCorruptedContent, MessageContentFailure, Uint256 } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { IEthereumMessage } from '../../misc';
import { IEthereumContractDescriptor } from '../EthereumBlockchainController';
import { EthereumBlockchainReader } from './EthereumBlockchainReader';
import { EthereumMailerV8Reader } from './EthereumMailerV8Reader';

export type IHistorySource = { type: 'recipient'; recipient: Uint256 } | { type: 'broadcast'; sender: string };

export class EthereumContentReader {
	constructor(
		public readonly blockchainReader: EthereumBlockchainReader,
		public readonly mailerReader: EthereumMailerV8Reader,
	) {
		//
	}

	enoughEvents(events: MailContentEvent[]): boolean {
		if (!events.length) {
			return false;
		}
		const parts = events[0].args.parts;
		for (let idx = 0; idx < parts; idx++) {
			if (!events.find(e => e.args.partIdx === idx)) {
				return false;
			}
		}
		return true;
	}

	async retrieveMessageContentByMessageHeader(
		mailer: IEthereumContractDescriptor,
		msg: IMessage,
	): Promise<IMessageContent | IMessageCorruptedContent | null> {
		let i = msg.$$blockchainMetaDontUseThisField.event.blockNumber;
		const totalEvents: MailContentEvent[] = [];
		let done = false;
		while (i >= mailer.creationBlock) {
			const partEvents = await this.mailerReader.contractOperation(
				mailer,
				async (contract, provider, blockLimit) => {
					const events = await contract.queryFilter(
						contract.filters.MailContent(msg.msgId),
						i - blockLimit,
						i,
					);
					i -= blockLimit;
					return events;
				},
			);
			totalEvents.push(...partEvents);
			if (this.enoughEvents(totalEvents)) {
				done = true;
				break;
			}
		}
		if (!done) {
			return null;
		}
		const messages = await this.blockchainReader.processMessages(totalEvents);
		return this.processMessageContent(msg.msgId, messages);
	}

	processMessageContent(
		msgId: string,
		messagePartEvents: IEthereumMessage<MailContentEvent>[],
	): IMessageContent | IMessageCorruptedContent | null {
		if (!messagePartEvents.length) {
			return null;
		}
		const parts = messagePartEvents[0].event.args.parts;
		const sender = messagePartEvents[0].event.args.sender;
		if (
			!messagePartEvents.every(t => t.event.args.parts === parts) ||
			!messagePartEvents.every(t => t.event.args.sender === sender)
		) {
			return {
				msgId,
				corrupted: true,
				chunks: messagePartEvents.map(m => ({ createdAt: m.block.timestamp })),
				reason: MessageContentFailure.NON_INTEGRITY_PARTS,
			};
		}
		for (let idx = 0; idx < parts; idx++) {
			if (!messagePartEvents.find(d => d.event.args.partIdx === idx)) {
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
				return a.event.args.partIdx - b.event.args.partIdx;
			})
			.map(m => SmartBuffer.ofHexString(m.event.args.content).bytes);
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

	async retrieveAndVerifyMessageContent(
		mailer: IEthereumContractDescriptor,
		msg: IMessage,
	): Promise<IMessageContent | IMessageCorruptedContent | null> {
		const result = await this.retrieveMessageContentByMessageHeader(mailer, msg);
		if (!result) {
			return null;
		}
		if (result.corrupted) {
			return result;
		}
		if (result.senderAddress !== msg.senderAddress) {
			return {
				msgId: msg.msgId,
				corrupted: true,
				chunks: [],
				reason: MessageContentFailure.NON_INTEGRITY_PARTS,
			};
		}
		return result;
	}
}
