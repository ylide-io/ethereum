import type { BlockWithTransactions } from '@ethersproject/abstract-provider';
import type { Block } from '@ethersproject/providers';
import { Event, Transaction } from 'ethers';

import { TypedEvent } from '@ylide/ethereum-contracts/lib/common';
import { TokenAttachmentEvent, TokenAttachmentEventObject } from '@ylide/ethereum-contracts/lib/contracts/YlidePayV1';
import type { IEVMBlock, IEVMEvent, IEVMTransaction, LogInternal } from '../../misc/types';

export type EventParsed<T> = T extends TypedEvent<infer Arr, infer Obj> ? Obj : never;

export const ethersBlockToInternalBlock = (block: Block | BlockWithTransactions): IEVMBlock => {
	return {
		hash: block.hash,
		parentHash: block.parentHash,
		// eslint-disable-next-line id-denylist
		number: block.number,
		timestamp: block.timestamp,
	};
};

export const ethersTxToInternalTx = (tx: Transaction): IEVMTransaction => {
	return {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		hash: tx.hash!,
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		from: tx.from!,
		to: tx.to || null,
		nonce: tx.nonce,
		data: tx.data,
		value: tx.value.toString(),
		chainId: tx.chainId,
	};
};

// (args: EventParsed<T>) => D = args => args as unknown as D

export function ethersEventToInternalEvent<T extends Event>(event: T): IEVMEvent<EventParsed<T>>;
export function ethersEventToInternalEvent<T extends Event, D>(
	event: T,
	argsTransform: (args: EventParsed<T>) => D,
): IEVMEvent<D>;
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function ethersEventToInternalEvent(event: Event, argsTransform?: (args: any) => any): IEVMEvent<any> {
	return {
		blockNumber: event.blockNumber,
		blockHash: event.blockHash,
		transactionHash: event.transactionHash,
		transactionIndex: event.transactionIndex,
		logIndex: event.logIndex,
		eventName: event.event || '',
		topics: event.topics,
		data: event.data,
		parsed: argsTransform ? argsTransform(event.args || {}) : event.args || {},
	};
}

export const ethersLogToInternalEvent = <T>(log: LogInternal, argsTransform?: (args: any) => any): IEVMEvent<T> => {
	return {
		blockNumber: log.log.blockNumber,
		blockHash: log.log.blockHash,

		transactionHash: log.log.transactionHash,
		transactionIndex: log.log.transactionIndex,

		logIndex: log.log.logIndex,

		eventName: log.logDescription.name,
		topics: log.log.topics,
		data: log.log.data,

		parsed: (argsTransform
			? argsTransform(log.logDescription.args || {})
			: log.logDescription.args || {}) as unknown as T,
	};
};

export const parseTokenAttachmentEvent = (event: TokenAttachmentEvent): TokenAttachmentEventObject => {
	return {
		amountOrTokenId: event.args.amountOrTokenId,
		recipient: event.args.recipient,
		sender: event.args.sender,
		token: event.args.token,
		tokenType: event.args.tokenType,
		contentId: event.args.contentId,
	};
};
