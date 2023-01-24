"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EthereumHistoryReader = void 0;
class EthereumHistoryReader {
    blockchainReader;
    mailerReader;
    registryReader;
    constructor(blockchainReader, mailerReader, registryReader) {
        this.blockchainReader = blockchainReader;
        this.mailerReader = mailerReader;
        this.registryReader = registryReader;
        //
    }
    async advancedRetrieveMessageHistoryByBounds(source, fromMessage, fromMessageIncluding = false, toMessage, toMessageIncluding = false, limit) {
        //
    }
    async retrieveMessageHistoryDesc(mailer, sender, recipient, fromMessage, toMessage, limit) {
        throw new Error('Method not implemented.');
        // if (recipient) {
        // 	let index: number[] = [];
        // 	if (fromMessage && fromMessage.recipientAddress === recipient) {
        // 		index = BlockNumberRingBufferIndex.decodeIndexValue(
        // 			fromMessage.$$blockchainMetaDontUseThisField.event.args.mailList
        // 				.toHexString()
        // 				.replace('0x', '')
        // 				.padStart(64, '0') as Uint256,
        // 		).map(i => i * 128);
        // 	} else {
        // 		index = (await this.mailerReader.getRecipientToPushIndex(mailer, recipient)).map(i => i * 128);
        // 	}
        // 	if (!index.length) {
        // 		return [];
        // 	}
        // 	const messages: IMessage<IEthereumPushMessage>[] = [];
        // 	let weFoundFrom = fromMessage ? false : true;
        // 	let fromIndex = 0;
        // 	let globalIndex: number[] = [];
        // 	while (true) {
        // 		if (!weFoundFrom) {
        // 			const indexCopy = [...index];
        // 			while (indexCopy.length && indexCopy[0] + 128 < fromMessage!.$$blockchainMetaDontUseThisField.event.blockNumber) {
        // 				indexCopy.shift();
        // 			}
        // 			if (indexCopy.length) {
        // 				weFoundFrom = true;
        // 				fromIndex = indexCopy[0];
        // 				globalIndex = [...indexCopy];
        // 				continue;
        // 			} else {
        // 				const lastIndex = index[index.length - 1];
        // 				const readMessages = await this.mailerReader.getMessagePushEvents(mailer, recipient, null, lastIndex - 128, lastIndex);
        // 			}
        // 		} else {
        // 		}
        // 	}
        // }
    }
    async retrieveBroadcastHistoryDesc(mailer, sender, fromMessage, toMessage, limit) {
        throw new Error('Method not implemented.');
    }
}
exports.EthereumHistoryReader = EthereumHistoryReader;
//# sourceMappingURL=EthereumHistoryReader.js.map