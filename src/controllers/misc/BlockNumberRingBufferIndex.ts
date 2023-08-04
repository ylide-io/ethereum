/* eslint-disable no-bitwise */
import type { Uint256 } from '@ylide/sdk';
import { SmartBuffer } from '@ylide/smart-buffer';
import { eventANewerThanB, eventAOlderThanB, eventCmprDesc } from '../../misc/utils';

export class BlockNumberRingBufferIndex {
	static decodeIndexValue(hex: Uint256): number[] {
		const uint8 = SmartBuffer.ofHexString(hex).bytes;
		const idx = uint8[0];
		const sp = uint8[1];
		const vals = [
			(uint8[2] << 16) + (uint8[3] << 8) + uint8[4],
			(uint8[5] << 16) + (uint8[6] << 8) + uint8[7],
			(uint8[8] << 16) + (uint8[9] << 8) + uint8[10],
			(uint8[11] << 16) + (uint8[12] << 8) + uint8[13],
			(uint8[14] << 16) + (uint8[15] << 8) + uint8[16],
			(uint8[17] << 16) + (uint8[18] << 8) + uint8[19],
			(uint8[20] << 16) + (uint8[21] << 8) + uint8[22],
			(uint8[23] << 16) + (uint8[24] << 8) + uint8[25],
			(uint8[26] << 16) + (uint8[27] << 8) + uint8[28],
			(uint8[29] << 16) + (uint8[30] << 8) + uint8[31],
		];

		const res: number[] = [];
		for (let i = idx + 10; i > idx; i -= 1) {
			const ri = i % 10;
			if (vals[ri] === 0) {
				break;
			}
			res.push(vals[ri]);
		}

		return res;
	}

	static async readIndexedEntries<Full>({
		parseFull,

		getBaseIndex,
		queryEntries,

		getLastBlockNumber,

		blockLimit,
		fromEntry,
		includeFromEntry,
		toEntry,
		includeToEntry,
		limit,
		divider = 128,
	}: {
		parseFull: (e: Full) => { blockNumber: number; transactionIndex: number; logIndex: number; index: number[] };

		getBaseIndex: () => Promise<number[]>;
		queryEntries: (fromBlock: number, toBlock: number) => Promise<Full[]>;

		getLastBlockNumber: () => Promise<number>;

		blockLimit: number;
		fromEntry: {
			blockNumber: number;
			transactionIndex: number;
			logIndex: number;
			index: number[];
		} | null;
		includeFromEntry: boolean;
		toEntry: {
			blockNumber: number;
			transactionIndex: number;
			logIndex: number;
			index: number[];
		} | null;
		includeToEntry: boolean;
		limit?: number;
		divider?: number;
	}) {
		let index: number[];
		if (fromEntry) {
			index = [...(includeFromEntry ? [Math.floor(fromEntry.blockNumber / divider)] : []), ...fromEntry.index];
		} else {
			index = await getBaseIndex();
		}
		const lastBlockNumber = await getLastBlockNumber();
		let events: Full[] = [];
		let nextPeriodEnd = lastBlockNumber;
		while (true) {
			if (index.length === 0) {
				break;
			}
			if (limit && events.length >= limit) {
				break;
			}
			if (toEntry && events.find(e => eventAOlderThanB(parseFull(e), toEntry, includeToEntry))) {
				break;
			}
			index.sort((a, b) => b - a);
			index = index.filter((e, i, a) => a.indexOf(e) === i);
			const currentPeriod = {
				start: index[0] * 128,
				end: nextPeriodEnd ? Math.min(index[0] * 128 + 127, nextPeriodEnd) : index[0] * 128 + 127,
			};
			nextPeriodEnd = 0;
			while (index.length > 0) {
				if (currentPeriod.end - currentPeriod.start > blockLimit) {
					currentPeriod.start = currentPeriod.end - blockLimit;
					nextPeriodEnd = currentPeriod.start - 1;
					break;
				} else {
					if (currentPeriod.end - (index[0] * 128 + 127) < blockLimit) {
						if (currentPeriod.end - index[0] * 128 <= blockLimit) {
							currentPeriod.start = index[0] * 128;
							index.splice(0, 1);
							continue;
						} else {
							currentPeriod.start = currentPeriod.end - blockLimit;
							nextPeriodEnd = currentPeriod.start - 1;
							break;
						}
					} else {
						break;
					}
				}
			}

			const eventsInPeriod = await queryEntries(currentPeriod.start, currentPeriod.end);
			eventsInPeriod.sort((a, b) => eventCmprDesc(parseFull(a), parseFull(b)));

			if (eventsInPeriod.length) {
				const newIndex = parseFull(eventsInPeriod[eventsInPeriod.length - 1]).index;
				newIndex.sort((a, b) => b - a);
				index = index
					.concat(index.length ? newIndex.filter(i => i < index[index.length - 1]) : newIndex)
					.filter(i => i * 128 < currentPeriod.start);
			}
			events.push(...eventsInPeriod);
			if (fromEntry) {
				events = events.filter(e => eventAOlderThanB(parseFull(e), fromEntry, includeFromEntry));
			}
		}

		let preparedEvents = events.filter(
			(e, i, a) => a.findIndex(g => eventCmprDesc(parseFull(e), parseFull(g)) === 0) === i,
		);
		preparedEvents.sort((a, b) => eventCmprDesc(parseFull(a), parseFull(b)));
		if (fromEntry) {
			preparedEvents = preparedEvents.filter(e => eventAOlderThanB(parseFull(e), fromEntry, includeFromEntry));
		}
		if (toEntry) {
			preparedEvents = preparedEvents.filter(e => eventANewerThanB(parseFull(e), toEntry, includeToEntry));
		}
		if (limit) {
			preparedEvents = preparedEvents.slice(0, limit);
		}

		return preparedEvents;
	}
}
