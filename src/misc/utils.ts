import type { Uint256 } from '@ylide/sdk';
import type { BigNumber } from 'ethers';

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

export const bnToUint256 = (bn: BigNumber) => {
	return bn.toHexString().replace('0x', '').padStart(64, '0') as Uint256;
};
