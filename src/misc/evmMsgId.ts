import { BitPackReader, BitPackWriter } from '@ylide/sdk';
import { SmartBuffer } from '@ylide/smart-buffer';
import type { IEVMMailerContractLink, IEVMMessage } from './types';

export const encodeEvmMsgId = (
	isBroacast: boolean,
	contractId2bytes: number,
	blockNumber4bytes: number,
	txIndex2bytes: number,
	logIndex2bytes: number,
	// contentIdUint256Hex: Uint256,
) => {
	const writer = new BitPackWriter();
	writer.writeBit(1);
	writer.writeBit(isBroacast ? 1 : 0);
	writer.writeBits(1, 4); // EVM
	writer.writeUintVariableSize(contractId2bytes);
	writer.writeUintVariableSize(blockNumber4bytes);
	writer.writeUintVariableSize(txIndex2bytes);
	writer.writeUintVariableSize(logIndex2bytes);
	// const bytes = SmartBuffer.ofHexString(contentIdUint256Hex).bytes;
	// writer.writeBytes(bytes);
	return new SmartBuffer(writer.toBuffer()).toBase64String();
};

export const decodeEvmMsgId = (msgId: string) => {
	const buffer = SmartBuffer.ofBase64String(msgId);
	const reader = BitPackReader.fromBuffer(buffer.bytes, true);
	if (reader.readBit() !== 1) {
		throw new Error('Invalid shrink bit');
	}
	const isBroadcast = reader.readBit() === 1;
	const evmFlag = reader.readBits(4); // EVM flag
	if (evmFlag !== 1) {
		throw new Error('Invalid EVM flag');
	}
	const contractId2bytes = reader.readUintVariableSize();
	const blockNumber4bytes = reader.readUintVariableSize();
	const txIndex2bytes = reader.readUintVariableSize();
	const logIndex2bytes = reader.readUintVariableSize();
	// const contentIdUint256Hex = new SmartBuffer(reader.readBytes(32)).toHexString();

	return {
		isBroadcast,
		contractId: contractId2bytes,
		blockNumber: blockNumber4bytes,
		txIndex: txIndex2bytes,
		logIndex: logIndex2bytes,
		// contentId: contentIdUint256Hex as Uint256,
	};
};

export const validateMessage = (mailer: IEVMMailerContractLink, message: IEVMMessage | null) => {
	if (!message) {
		return;
	}
	try {
		const decodedId = decodeEvmMsgId(message.msgId);
		if (decodedId.contractId === mailer.id) {
			return;
		}
	} catch (e) {
		// ignore
	}
	throw new Error('Invalid message: not from this contract');
};
