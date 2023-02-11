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
		number: block.number,
		timestamp: block.timestamp,
	};
};

export const ethersTxToInternalTx = (tx: Transaction): IEVMTransaction => {
	return {
		hash: tx.hash!,
		from: tx.from!,
		to: tx.to || null,
		nonce: tx.nonce,
		data: tx.data,
		value: tx.value.toString(),
		chainId: tx.chainId,
	};
};

export const ethersEventToInternalEvent = <T extends Event>(event: T): IEVMEvent<EventParsed<T>> => {
	return {
		blockNumber: event.blockNumber,
		blockHash: event.blockHash,
		transactionHash: event.transactionHash,
		transactionIndex: event.transactionIndex,
		logIndex: event.logIndex,
		eventName: event.event || '',
		topics: event.topics,
		data: event.data,
		parsed: (event.args || {}) as EventParsed<T>,
	};
};
