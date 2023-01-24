import { Log } from '@ethersproject/providers';
import SmartBuffer from '@ylide/smart-buffer';

export function publicKeyToBigIntString(publicKey: Uint8Array) {
	return BigInt('0x' + new SmartBuffer(publicKey).toHexString()).toString();
}

export function eventCmpr(a: Log, b: Log): number {
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
