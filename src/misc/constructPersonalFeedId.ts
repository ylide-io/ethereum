import { sha256, Uint256 } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';

export const constructPersonalFeedId = (senderAddress: string, feedId: Uint256) => {
	const bytes = SmartBuffer.ofHexString(senderAddress.substring(2).toLowerCase() + feedId).bytes;

	const composedFeedId = new SmartBuffer(sha256(bytes)).toHexString();

	return composedFeedId as Uint256;
};
