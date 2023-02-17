// function buildContentId(address senderAddress, uint256 uniqueId, uint256 firstBlockNumber, uint256 partsCount, uint256 blockCountLock) public pure returns (uint256) {
// 	// sha256(uint160 senderAddress, uint32 uniqueId, uint32 firstBlockNumber)
// 	uint256 hash = uint256(sha256(bytes.concat(bytes32(uint256(uint160(senderAddress))), bytes32(uniqueId), bytes32(firstBlockNumber))));
// 	// first bit is zero - it's a version indicator
// 	uint256 blockNumberMask = (firstBlockNumber & 0x7FFFFFFF) * 0x100000000000000000000000000000000000000000000000000000000; // shiftLeft by 224 bits
// 	uint256 partsCountMask = (partsCount & 0xFFFF) * 0x10000000000000000000000000000000000000000000000000000; // shiftLeft by 208 bits
// 	uint256 blockCountLockMask = (blockCountLock & 0xFFFF) * 0x1000000000000000000000000000000000000000000000000; // shiftLeft by 192 bits
// 	uint256 hashMask = hash & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF; // mask last 192 bits
// 	return blockNumberMask | partsCountMask | blockCountLockMask | hashMask;
// }

import { BitPackReader, Uint256 } from '@ylide/sdk';

export const decodeContentId = (contentIdHex: Uint256) => {
	const bitsReader = BitPackReader.fromHex(contentIdHex, false);
	const version = bitsReader.readUint8();
	const blockNumber = bitsReader.readBits(32);
	const partsCount = bitsReader.readBits(16);
	const blockCountLock = bitsReader.readBits(16);
	const hash = bitsReader.readBytes(23);
	return {
		version,
		blockNumber,
		partsCount,
		blockCountLock,
		hash,
		contentId: contentIdHex,
	};
};
