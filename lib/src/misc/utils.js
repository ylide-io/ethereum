"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventCmpr = exports.publicKeyToBigIntString = void 0;
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
function publicKeyToBigIntString(publicKey) {
    return BigInt('0x' + new smart_buffer_1.default(publicKey).toHexString()).toString();
}
exports.publicKeyToBigIntString = publicKeyToBigIntString;
function eventCmpr(a, b) {
    if (a.blockNumber === b.blockNumber) {
        if (a.transactionIndex === b.transactionIndex) {
            return b.logIndex - a.logIndex;
        }
        else {
            return b.transactionIndex - a.transactionIndex;
        }
    }
    else {
        return b.blockNumber - a.blockNumber;
    }
}
exports.eventCmpr = eventCmpr;
//# sourceMappingURL=utils.js.map