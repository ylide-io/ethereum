import { Event, Transaction } from 'ethers';
import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { Block } from '@ethersproject/providers';
import { TypedEvent } from '@ylide/ethereum-contracts/lib/common';

import { IEVMBlock, IEVMEvent, IEVMTransaction } from '../../misc';

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

function ethersEventToInternalEvent<T extends Event>(event: T): IEVMEvent<EventParsed<T>>;
function ethersEventToInternalEvent<T extends Event, D>(
	event: T,
	argsTransform: (args: EventParsed<T>) => D,
): IEVMEvent<D>;
// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
function ethersEventToInternalEvent(event: Event, argsTransform?: (args: any) => any): IEVMEvent<any> {
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

export { ethersEventToInternalEvent };
