import type { TypedEvent } from '@ylide/ethereum-contracts/lib/common';
import type { MailPushEventObject as MailPushEventObjectV9 } from '@ylide/ethereum-contracts/lib/contracts/YlideMailerV9';
import type { Uint256 } from '@ylide/sdk';
import { YlideCore } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import type { Contract, ethers } from 'ethers';
import { BigNumber } from 'ethers';
import { BlockNumberRingBufferIndex } from '../controllers/misc/BlockNumberRingBufferIndex';
import { EVM_CONTRACT_TO_NETWORK, EVM_NAMES } from './constants';
import { decodeContentId } from './contentId';
import { encodeEvmMsgId } from './evmMsgId';
import type { IEVMEnrichedEvent, IEVMMailerContractLink, IEVMMessage, LogInternal } from './types';

export interface IEventPosition {
	blockNumber: number;
	transactionIndex: number;
	logIndex: number;
}

export const eventCmprDesc = (a: IEventPosition, b: IEventPosition): number => {
	if (a.blockNumber === b.blockNumber) {
		if (a.transactionIndex === b.transactionIndex) {
			return b.logIndex - a.logIndex;
		} else {
			return b.transactionIndex - a.transactionIndex;
		}
	} else {
		return b.blockNumber - a.blockNumber;
	}
};

export const eventAOlderThanB = (a: IEventPosition, b: IEventPosition, orEqual = false) => {
	return orEqual ? eventCmprDesc(a, b) >= 0 : eventCmprDesc(a, b) > 0;
};

export const eventANewerThanB = (a: IEventPosition, b: IEventPosition, orEqual = false) => {
	return orEqual ? eventCmprDesc(a, b) <= 0 : eventCmprDesc(a, b) < 0;
};

export const bnToUint256 = (bn: BigNumber = BigNumber.from(0)) => {
	return bn.toHexString().replace('0x', '').padStart(64, '0') as Uint256;
};

export const parseOutLogs = <T extends Contract>(contract: T, rawLogs: ethers.providers.Log[]) => {
	const logs = rawLogs
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
		.filter((l): l is LogInternal => l.logDescription !== null);

	const byName: Record<string, LogInternal[]> = {};
	for (const l of logs) {
		if (!byName[l.logDescription.name]) {
			byName[l.logDescription.name] = [];
		}
		byName[l.logDescription.name].push(l);
	}

	return {
		logs,
		byName,
	};
};

export const getMultipleEvents = async <T extends TypedEvent>(
	contract: ethers.Contract,
	filter: ethers.EventFilter,
	blockLimit: number,
	contentId: Uint256,
	isContent = false,
) => {
	const currentBlockNumber = await contract.provider.getBlockNumber();
	const events: T[] = [];
	const decodedContentId = decodeContentId(contentId);
	for (
		let i = decodedContentId.blockNumber;
		i <= Math.min(currentBlockNumber, decodedContentId.blockNumber + decodedContentId.blockCountLock);
		i += blockLimit
	) {
		const newEvents = (await contract.queryFilter(
			filter,
			i,
			Math.min(i + blockLimit, decodedContentId.blockNumber + decodedContentId.blockCountLock),
		)) as unknown as T[];
		events.push(...newEvents);
		if (isContent && events.length >= decodedContentId.partsCount) {
			break;
		}
	}
	return events;
};

export const processMailPushEvent = (
	mailer: IEVMMailerContractLink,
	event: IEVMEnrichedEvent<MailPushEventObjectV9>,
): IEVMMessage => {
	return {
		isBroadcast: false,
		feedId: bnToUint256(event.event.parsed.feedId),
		msgId: encodeEvmMsgId(
			false,
			mailer.id,
			event.event.blockNumber,
			event.event.transactionIndex,
			event.event.logIndex,
		),
		createdAt: event.block.timestamp,
		senderAddress: event.tx.from,
		recipientAddress: bnToUint256(event.event.parsed.recipient),
		blockchain: EVM_NAMES[EVM_CONTRACT_TO_NETWORK[mailer.id]],
		key: SmartBuffer.ofHexString(event.event.parsed.key.replace('0x', '')).bytes,
		$$meta: {
			contentId: bnToUint256(event.event.parsed.contentId),
			index: BlockNumberRingBufferIndex.decodeIndexValue(bnToUint256(event.event.parsed.previousFeedEventsIndex)),
			...event,
		},
	};
};

export const isSentSender = (sender: string, recipient: Uint256) => {
	return YlideCore.getSentAddress(bnToUint256(BigNumber.from(sender))) === recipient;
};
