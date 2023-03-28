import type { BlockWithTransactions } from '@ethersproject/abstract-provider';
import type { Block, Log } from '@ethersproject/providers';
import { ethers, Event, Transaction } from 'ethers';

import { TypedEvent } from '@mock/ethereum-contracts/typechain-types/common';
import type { IEVMBlock, IEVMEvent, IEVMTransaction, LogInternal } from '../../misc/types';

import { TokenAttachmentEvent } from '@mock/ethereum-contracts/typechain-types/contracts/interfaces/IYlidePayStake';
import { TokenAttachmentEvent as TokenAttachmentEventStream } from '@mock/ethereum-contracts/typechain-types/contracts/YlideStreamSablierV1';

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

export const ethersLogToInternalEvent = <T>(
	log: {
		log: Log;
		logDescription: ethers.utils.LogDescription;
	},
	argsTransform?: (args: any) => any,
): IEVMEvent<T> => {
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

export const convertLogInternalToInternalEvent = <T>(logs: LogInternal[], logName: string) => {
	return logs.filter(l => l.logDescription.name === logName).map(l => ethersLogToInternalEvent<T>(l));
};

export const parseReceiptToLogInternal = (contract: ethers.Contract, receipt: ethers.ContractReceipt) => {
	return receipt.logs
		.map(l => {
			try {
				return {
					log: l,
					logDescription: contract.interface.parseLog(l),
				};
			} catch (err) {
				return {
					log: l,
					logDescription: null,
				};
			}
		})
		.filter(
			(l): l is { log: ethers.providers.Log; logDescription: ethers.utils.LogDescription } =>
				l.logDescription !== null,
		);
};

export const parseTokenAttachmentEvent = (event: TokenAttachmentEvent) => {
	return {
		amountOrTokenId: event.args.amountOrTokenId,
		recipient: event.args.recipient,
		sender: event.args.sender,
		token: event.args.token,
		tokenType: event.args.tokenType,
	};
};
export const parseTokenAttachmentEventStream = (event: TokenAttachmentEventStream) => {
	return {
		streamId: event.args.streamId,
		deposit: event.args.deposit,
		startTime: event.args.startTime,
		stopTime: event.args.stopTime,
		recipient: event.args.recipient,
		sender: event.args.sender,
		tokenAddress: event.args.tokenAddress,
	};
};
