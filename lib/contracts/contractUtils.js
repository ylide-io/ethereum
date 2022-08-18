"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeAddressToPublicKeyMessageBody = exports.decodePublicKeyToAddressMessageBody = exports.decodeContentMessageBody = void 0;
const sdk_1 = require("@ylide/sdk");
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
function decodeContentMessageBody(ev) {
    const { msgId, sender, parts, partIdx, content } = ev.returnValues;
    return {
        sender,
        msgId: (0, sdk_1.bigIntToUint256)(msgId),
        parts: Number(parts),
        partIdx: Number(partIdx),
        content: smart_buffer_1.default.ofHexString(content.substring(2)).bytes,
    };
}
exports.decodeContentMessageBody = decodeContentMessageBody;
function decodePublicKeyToAddressMessageBody(ev) {
    const { addr } = ev.returnValues;
    return addr;
}
exports.decodePublicKeyToAddressMessageBody = decodePublicKeyToAddressMessageBody;
function decodeAddressToPublicKeyMessageBody(ev) {
    const { publicKey } = ev.returnValues;
    return smart_buffer_1.default.ofHexString(BigInt(publicKey).toString(16).padStart(64, '0')).bytes;
}
exports.decodeAddressToPublicKeyMessageBody = decodeAddressToPublicKeyMessageBody;
//# sourceMappingURL=contractUtils.js.map