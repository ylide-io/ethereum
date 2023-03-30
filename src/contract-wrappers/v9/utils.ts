import { LogDescription } from '@ethersproject/abi';
import { YlideMailerV9 } from '@mock/ethereum-contracts/typechain-types';
import { TypedEvent } from '@mock/ethereum-contracts/typechain-types/common';
import { Uint256 } from '@ylide/sdk';
import { ethers } from 'ethers';
import { decodeContentId, LogInternal } from '../../misc';

export const parseOutLogs = (contract: YlideMailerV9, rawLogs: ethers.providers.Log[]) => {
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
