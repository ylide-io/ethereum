"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockNumberRingBufferIndex = void 0;
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
class BlockNumberRingBufferIndex {
    static decodeIndexValue(hex) {
        const uint8 = smart_buffer_1.default.ofHexString(hex).bytes;
        const idx = uint8[0];
        const sp = uint8[1];
        /* tslint:disable:no-bitwise */
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
        const res = [];
        for (let i = idx + 10; i > idx; i -= 1) {
            const ri = i % 10;
            if (vals[ri] === 0) {
                break;
            }
            res.push(vals[ri]);
        }
        return res;
    }
}
exports.BlockNumberRingBufferIndex = BlockNumberRingBufferIndex;
//# sourceMappingURL=BlockNumberRingBufferIndex.js.map