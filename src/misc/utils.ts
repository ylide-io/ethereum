import SmartBuffer from '@ylide/smart-buffer';

export function publicKeyToBigIntString(publicKey: Uint8Array) {
	return BigInt('0x' + new SmartBuffer(publicKey).toHexString()).toString();
}

export interface IEventPosition {
	blockNumber: number;
	transactionIndex: number;
	logIndex: number;
}

export function eventCmprDesc(a: IEventPosition, b: IEventPosition): number {
	if (a.blockNumber === b.blockNumber) {
		if (a.transactionIndex === b.transactionIndex) {
			return b.logIndex - a.logIndex;
		} else {
			return b.transactionIndex - a.transactionIndex;
		}
	} else {
		return b.blockNumber - a.blockNumber;
	}
}

export function eventAOlderThanB(a: IEventPosition, b: IEventPosition, orEqual = false) {
	return orEqual ? eventCmprDesc(a, b) >= 0 : eventCmprDesc(a, b) > 0;
}

export function eventANewerThanB(a: IEventPosition, b: IEventPosition, orEqual = false) {
	return orEqual ? eventCmprDesc(a, b) <= 0 : eventCmprDesc(a, b) < 0;
}
