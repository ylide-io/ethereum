"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAILER_ABI = exports.MailerContract = void 0;
const sdk_1 = require("@ylide/sdk");
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
const web3_1 = __importDefault(require("web3"));
const misc_1 = require("../misc");
class MailerContract {
    web3;
    contractAddress;
    contract;
    constructor(web3, contractAddress) {
        this.web3 = web3;
        this.contractAddress = contractAddress;
        this.contract = new this.web3.eth.Contract(exports.MAILER_ABI.abi, this.contractAddress);
    }
    async buildHash(address, uniqueId, time) {
        const lowerAddress = address.toLowerCase();
        const cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
        const addressBytes = smart_buffer_1.default.ofHexString(''.padStart(24, '0') + cleanHexAddress).bytes;
        const args = {
            senderAddress: (0, misc_1.publicKeyToBigIntString)(addressBytes),
            uniqueId,
            time,
        };
        const result = await this.contract.methods.buildHash(args).call();
        return (0, sdk_1.bigIntToUint256)(BigInt(result._hash).toString(10));
    }
    async estimateAndCall(address, method, args) {
        const data = this.web3.eth.abi.encodeFunctionCall(exports.MAILER_ABI.abi.find(t => t.name === method), args);
        const gasPrice = await this.web3.eth.getGasPrice();
        const gas = await this.web3.eth.estimateGas({
            to: this.contract.options.address,
            data,
        });
        return await this.contract.methods[method](...args).send({ from: address, gas, gasPrice });
    }
    async setFees(address, _contentPartFee, _recipientFee) {
        return await this.estimateAndCall(address, 'setFees', [
            _contentPartFee.toString(10),
            _recipientFee.toString(10),
        ]);
    }
    async transferOwnership(address, newOwner) {
        return await this.estimateAndCall(address, 'transferOwnership', [newOwner]);
    }
    async setBeneficiary(address, _beneficiary) {
        return await this.estimateAndCall(address, 'setBeneficiary', [_beneficiary]);
    }
    async addRecipients(address, uniqueId, initTime, recipients, keys) {
        // uint32 uniqueId, uint32 initTime, address[] recipients, bytes[] keys
        return await this.estimateAndCall(address, 'addRecipients', [
            uniqueId,
            initTime,
            recipients.map(r => '0x' + r),
            keys.map(k => '0x' + new smart_buffer_1.default(k).toBase64String()),
        ]);
    }
    async sendMultipartMailPart(address, uniqueId, initTime, parts, partIdx, content) {
        return await this.estimateAndCall(address, 'sendMultipartMailPart', [
            uniqueId,
            initTime,
            parts,
            partIdx,
            '0x' + new smart_buffer_1.default(content).toHexString(),
        ]);
    }
    async broadcastMail(address, uniqueId, content) {
        return await this.estimateAndCall(address, 'broadcastMail', [
            uniqueId,
            '0x' + new smart_buffer_1.default(content).toHexString(),
        ]);
    }
    async broadcastMailHeader(address, uniqueId, initTime) {
        return await this.estimateAndCall(address, 'broadcastMailHeader', [uniqueId, initTime]);
    }
    async sendSmallMail(address, uniqueId, recipient, key, content) {
        return await this.estimateAndCall(address, 'sendSmallMail', [
            uniqueId,
            '0x' + recipient,
            '0x' + new smart_buffer_1.default(key).toHexString(),
            '0x' + new smart_buffer_1.default(content).toHexString(),
        ]);
    }
    async sendBulkMail(address, uniqueId, recipients, keys, content) {
        return await this.estimateAndCall(address, 'sendBulkMail', [
            uniqueId,
            recipients.map(r => '0x' + r),
            keys.map(k => '0x' + new smart_buffer_1.default(k).toHexString()),
            '0x' + new smart_buffer_1.default(content).toHexString(),
        ]);
    }
    static decodeIndexValue(numberStringValue) {
        const hex = web3_1.default.utils.numberToHex(numberStringValue).replace('0x', '').padStart(64, '0');
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
    static async getVersion(w3, mailerAddress) {
        const contract = new w3.eth.Contract(exports.MAILER_ABI.abi, mailerAddress);
        return w3.utils.toNumber(await contract.methods.version().call());
    }
    static async extractRecipientIndex(address, w3, mailerAddress) {
        const contract = new w3.eth.Contract(exports.MAILER_ABI.abi, mailerAddress);
        const result = await contract.methods.recipientToPushIndex(web3_1.default.utils.hexToNumberString('0x' + address)).call();
        return this.decodeIndexValue(result);
    }
    static async deployContract(web3, from) {
        const contract = new web3.eth.Contract(exports.MAILER_ABI.abi);
        const deployTx = contract.deploy({
            data: exports.MAILER_ABI.bytecode,
        });
        const tx = await deployTx.send({ from });
        return tx.options.address;
    }
}
exports.MailerContract = MailerContract;
exports.MAILER_ABI = {
    _format: 'hh-sol-artifact-1',
    contractName: 'YlideMailerV7',
    sourceName: 'contracts/YlideMailerV7.sol',
    abi: [
        {
            inputs: [],
            stateMutability: 'nonpayable',
            type: 'constructor',
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: 'address',
                    name: 'sender',
                    type: 'address',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'msgId',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'mailList',
                    type: 'uint256',
                },
            ],
            name: 'MailBroadcast',
            type: 'event',
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: 'uint256',
                    name: 'msgId',
                    type: 'uint256',
                },
                {
                    indexed: true,
                    internalType: 'address',
                    name: 'sender',
                    type: 'address',
                },
                {
                    indexed: false,
                    internalType: 'uint16',
                    name: 'parts',
                    type: 'uint16',
                },
                {
                    indexed: false,
                    internalType: 'uint16',
                    name: 'partIdx',
                    type: 'uint16',
                },
                {
                    indexed: false,
                    internalType: 'bytes',
                    name: 'content',
                    type: 'bytes',
                },
            ],
            name: 'MailContent',
            type: 'event',
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: 'uint256',
                    name: 'recipient',
                    type: 'uint256',
                },
                {
                    indexed: true,
                    internalType: 'address',
                    name: 'sender',
                    type: 'address',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'msgId',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'mailList',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'bytes',
                    name: 'key',
                    type: 'bytes',
                },
            ],
            name: 'MailPush',
            type: 'event',
        },
        {
            inputs: [
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint32',
                    name: 'initTime',
                    type: 'uint32',
                },
                {
                    internalType: 'uint256[]',
                    name: 'recipients',
                    type: 'uint256[]',
                },
                {
                    internalType: 'bytes[]',
                    name: 'keys',
                    type: 'bytes[]',
                },
            ],
            name: 'addRecipients',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [],
            name: 'beneficiary',
            outputs: [
                {
                    internalType: 'address payable',
                    name: '',
                    type: 'address',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'bytes',
                    name: 'content',
                    type: 'bytes',
                },
            ],
            name: 'broadcastMail',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint32',
                    name: 'initTime',
                    type: 'uint32',
                },
            ],
            name: 'broadcastMailHeader',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'address',
                    name: '',
                    type: 'address',
                },
            ],
            name: 'broadcastMessagesCount',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'senderAddress',
                    type: 'uint256',
                },
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint32',
                    name: 'time',
                    type: 'uint32',
                },
            ],
            name: 'buildHash',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '_hash',
                    type: 'uint256',
                },
            ],
            stateMutability: 'pure',
            type: 'function',
        },
        {
            inputs: [],
            name: 'contentPartFee',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'senderAddress',
                    type: 'uint256',
                },
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint32',
                    name: 'initTime',
                    type: 'uint32',
                },
            ],
            name: 'getMsgId',
            outputs: [
                {
                    internalType: 'uint256',
                    name: 'msgId',
                    type: 'uint256',
                },
            ],
            stateMutability: 'pure',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'orig',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'val',
                    type: 'uint256',
                },
            ],
            name: 'nextIndex',
            outputs: [
                {
                    internalType: 'uint256',
                    name: 'result',
                    type: 'uint256',
                },
            ],
            stateMutability: 'pure',
            type: 'function',
        },
        {
            inputs: [],
            name: 'owner',
            outputs: [
                {
                    internalType: 'address',
                    name: '',
                    type: 'address',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [],
            name: 'recipientFee',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            name: 'recipientMessagesCount',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            name: 'recipientToPushIndex',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint256[]',
                    name: 'recipients',
                    type: 'uint256[]',
                },
                {
                    internalType: 'bytes[]',
                    name: 'keys',
                    type: 'bytes[]',
                },
                {
                    internalType: 'bytes',
                    name: 'content',
                    type: 'bytes',
                },
            ],
            name: 'sendBulkMail',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint32',
                    name: 'initTime',
                    type: 'uint32',
                },
                {
                    internalType: 'uint16',
                    name: 'parts',
                    type: 'uint16',
                },
                {
                    internalType: 'uint16',
                    name: 'partIdx',
                    type: 'uint16',
                },
                {
                    internalType: 'bytes',
                    name: 'content',
                    type: 'bytes',
                },
            ],
            name: 'sendMultipartMailPart',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint32',
                    name: 'uniqueId',
                    type: 'uint32',
                },
                {
                    internalType: 'uint256',
                    name: 'recipient',
                    type: 'uint256',
                },
                {
                    internalType: 'bytes',
                    name: 'key',
                    type: 'bytes',
                },
                {
                    internalType: 'bytes',
                    name: 'content',
                    type: 'bytes',
                },
            ],
            name: 'sendSmallMail',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'address',
                    name: '',
                    type: 'address',
                },
            ],
            name: 'senderToBroadcastIndex',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'address payable',
                    name: '_beneficiary',
                    type: 'address',
                },
            ],
            name: 'setBeneficiary',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint128',
                    name: '_contentPartFee',
                    type: 'uint128',
                },
                {
                    internalType: 'uint128',
                    name: '_recipientFee',
                    type: 'uint128',
                },
            ],
            name: 'setFees',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'a',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'n',
                    type: 'uint256',
                },
            ],
            name: 'shiftLeft',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'pure',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'a',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'n',
                    type: 'uint256',
                },
            ],
            name: 'shiftRight',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'pure',
            type: 'function',
        },
        {
            inputs: [],
            name: 'terminate',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'address',
                    name: 'newOwner',
                    type: 'address',
                },
            ],
            name: 'transferOwnership',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [],
            name: 'version',
            outputs: [
                {
                    internalType: 'uint256',
                    name: '',
                    type: 'uint256',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
    ],
    bytecode: '0x608060405260076001556000600255600060035534801561001f57600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555033600460006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506127df806100b06000396000f3fe608060405234801561001057600080fd5b50600436106101585760003560e01c806354fd4d50116100c3578063bac159a61161007c578063bac159a6146103c5578063c655de0a146103f5578063db0d9d3114610411578063df6d3d3c14610441578063ef8376701461045d578063f2fde38b1461048d57610158565b806354fd4d50146102dd57806362dc23f3146102fb5780637675f45a146103175780638da5cb5b146103475780639126e15114610365578063a589d2121461039557610158565b806332760c7a1161011557806332760c7a1461020957806338af3eed14610225578063409537a91461024357806340bda4021461027357806345c6c858146102915780634a47821f146102ad57610158565b80630c08bf881461015d5780631685fa98146101675780631918b8fa146101975780631c31f710146101b35780631eecf500146101cf5780631f2dcdbc146101ed575b600080fd5b6101656104a9565b005b610181600480360381019061017c91906118c5565b61053a565b60405161018e9190611914565b60405180910390f35b6101b160048036038101906101ac91906119d0565b61055c565b005b6101cd60048036038101906101c89190611ad5565b61074a565b005b6101d76107e6565b6040516101e49190611914565b60405180910390f35b61020760048036038101906102029190611bae565b6107ec565b005b610223600480360381019061021e9190611cbf565b610aa0565b005b61022d610b2e565b60405161023a9190611d0e565b60405180910390f35b61025d60048036038101906102589190611d29565b610b54565b60405161026a9190611914565b60405180910390f35b61027b610be3565b6040516102889190611914565b60405180910390f35b6102ab60048036038101906102a69190611d7c565b610be9565b005b6102c760048036038101906102c29190611e23565b610e2b565b6040516102d49190611914565b60405180910390f35b6102e5610e43565b6040516102f29190611914565b60405180910390f35b61031560048036038101906103109190611e8a565b610e49565b005b610331600480360381019061032c91906118c5565b610f75565b60405161033e9190611914565b60405180910390f35b61034f611352565b60405161035c9190611f45565b60405180910390f35b61037f600480360381019061037a9190611e23565b611376565b60405161038c9190611914565b60405180910390f35b6103af60048036038101906103aa91906118c5565b61138e565b6040516103bc9190611914565b60405180910390f35b6103df60048036038101906103da9190611f8c565b6113b0565b6040516103ec9190611914565b60405180910390f35b61040f600480360381019061040a9190611fb9565b6113c8565b005b61042b60048036038101906104269190611f8c565b611618565b6040516104389190611914565b60405180910390f35b61045b60048036038101906104569190612019565b611630565b005b61047760048036038101906104729190611d29565b61179f565b6040516104849190611914565b60405180910390f35b6104a760048036038101906104a29190611f8c565b6117b5565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461050157600080fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b600081600261054991906121bb565b836105549190612235565b905092915050565b600061057f3373ffffffffffffffffffffffffffffffffffffffff168842610b54565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d296001600087876040516105d09493929190612344565b60405180910390a3600060056000888152602001908152602001600020549050610606816080436106019190612235565b610f75565b600560008981526020019081526020016000208190555060016007600089815260200190815260200160002060008282546106419190612384565b925050819055503373ffffffffffffffffffffffffffffffffffffffff16877fec780d816046adcd7183167d702b92bd76fb1a1dbe794ffe1f1b9413d052e1c584848a8a60405161069594939291906123da565b60405180910390a360006003546002546106af9190612384565b111561074057600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc6003546002546107019190612384565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f1935050505015801561073e573d6000803e3d6000fd5b505b5050505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146107a257600080fd5b80600460006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b60025481565b600061080f3373ffffffffffffffffffffffffffffffffffffffff168942610b54565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d296001600087876040516108609493929190612344565b60405180910390a360005b878790508110156109d6576000600560008a8a8581811061088f5761088e61241a565b5b9050602002013581526020019081526020016000205490506108bd816080436108b89190612235565b610f75565b600560008b8b868181106108d4576108d361241a565b5b905060200201358152602001908152602001600020819055506001600760008b8b868181106109065761090561241a565b5b905060200201358152602001908152602001600020600082825461092a9190612384565b925050819055503373ffffffffffffffffffffffffffffffffffffffff1689898481811061095b5761095a61241a565b5b905060200201357fec780d816046adcd7183167d702b92bd76fb1a1dbe794ffe1f1b9413d052e1c585848b8b888181106109985761099761241a565b5b90506020028101906109aa9190612458565b6040516109ba94939291906123da565b60405180910390a35080806109ce906124bb565b91505061086b565b506000878790506003546109ea9190612504565b6002546109f79190612384565b1115610a9657600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc88889050600354610a4a9190612504565b600254610a579190612384565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610a94573d6000803e3d6000fd5b505b5050505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610af857600080fd5b816fffffffffffffffffffffffffffffffff16600281905550806fffffffffffffffffffffffffffffffff166003819055505050565b600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000808460001b8460e01b8460e01b604051602001610b75939291906125d6565b6040516020818303038152906040529050600281604051610b96919061268d565b602060405180830381855afa158015610bb3573d6000803e3d6000fd5b5050506040513d601f19601f82011682018060405250810190610bd691906126d0565b60001c9150509392505050565b60035481565b6000610c0c3373ffffffffffffffffffffffffffffffffffffffff168888610b54565b905060005b85859050811015610d7c57600060056000888885818110610c3557610c3461241a565b5b905060200201358152602001908152602001600020549050610c6381608043610c5e9190612235565b610f75565b60056000898986818110610c7a57610c7961241a565b5b90506020020135815260200190815260200160002081905550600160076000898986818110610cac57610cab61241a565b5b9050602002013581526020019081526020016000206000828254610cd09190612384565b925050819055503373ffffffffffffffffffffffffffffffffffffffff16878784818110610d0157610d0061241a565b5b905060200201357fec780d816046adcd7183167d702b92bd76fb1a1dbe794ffe1f1b9413d052e1c58584898988818110610d3e57610d3d61241a565b5b9050602002810190610d509190612458565b604051610d6094939291906123da565b60405180910390a3508080610d74906124bb565b915050610c11565b50600085859050600354610d909190612504565b1115610e2257600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc86869050600354610de39190612504565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610e20573d6000803e3d6000fd5b505b50505050505050565b60056020528060005260406000206000915090505481565b60015481565b8463ffffffff16421015610e5c57600080fd5b6102588563ffffffff1642610e7191906126fd565b10610e7b57600080fd5b6000610e9e3373ffffffffffffffffffffffffffffffffffffffff168888610b54565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d2987878787604051610eed9493929190612740565b60405180910390a360006002541115610f6c57600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc6002549081150290604051600060405180830381858888f19350505050158015610f6a573d6000803e3d6000fd5b505b50505050505050565b600062ffffff821691506000610f8c8460f861053a565b905060098160ff161415610fd057610fa58360d861138e565b7eff000000ffffffffffffffffffffffffffffffffffffffffffffffffffffff85161791505061134c565b60008160ff16141561103457610fe78360c061138e565b7f01000000000000000000000000000000000000000000000000000000000000007effffffff000000ffffffffffffffffffffffffffffffffffffffffffffffff8616171791505061134c565b60018160ff1614156110985761104b8360a861138e565b7f02000000000000000000000000000000000000000000000000000000000000007effffffffffffff000000ffffffffffffffffffffffffffffffffffffffffff8616171791505061134c565b60028160ff1614156110fc576110af83609061138e565b7f03000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffff000000ffffffffffffffffffffffffffffffffffff8616171791505061134c565b60038160ff1614156111605761111383607861138e565b7f04000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffff000000ffffffffffffffffffffffffffffff8616171791505061134c565b60048160ff1614156111c45761117783606061138e565b7f05000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffffffffff000000ffffffffffffffffffffffff8616171791505061134c565b60058160ff161415611228576111db83604861138e565b7f06000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffffffffffffffff000000ffffffffffffffffff8616171791505061134c565b60068160ff16141561128c5761123f83603061138e565b7f07000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffffffffffffffffffffff000000ffffffffffff8616171791505061134c565b60078160ff1614156112f0576112a383601861138e565b7f08000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffffffffffffffffffffffffffff000000ffffff8616171791505061134c565b60088160ff16141561134a57827f09000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008616171791505061134c565b505b92915050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60076020528060005260406000206000915090505481565b600081600261139d91906121bb565b836113a89190612504565b905092915050565b60086020528060005260406000206000915090505481565b60006113eb3373ffffffffffffffffffffffffffffffffffffffff168542610b54565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d2960016000878760405161143c9493929190612344565b60405180910390a36000600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905061149e816080436114999190612235565b610f75565b600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055506001600860003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546115319190612384565b925050819055503373ffffffffffffffffffffffffffffffffffffffff167f055992726577c4279a7c5094711fd9754dafcc079a027104ae65313c5ac6a4808383604051611580929190612780565b60405180910390a26000600254111561161157600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc6002546fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f1935050505015801561160f573d6000803e3d6000fd5b505b5050505050565b60066020528060005260406000206000915090505481565b60006116533373ffffffffffffffffffffffffffffffffffffffff168484610b54565b90506000600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205490506116af816080436116aa9190612235565b610f75565b600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055506001600860003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546117429190612384565b925050819055503373ffffffffffffffffffffffffffffffffffffffff167f055992726577c4279a7c5094711fd9754dafcc079a027104ae65313c5ac6a4808383604051611791929190612780565b60405180910390a250505050565b60006117ac848484610b54565b90509392505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461180d57600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff161461188257806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b50565b600080fd5b600080fd5b6000819050919050565b6118a28161188f565b81146118ad57600080fd5b50565b6000813590506118bf81611899565b92915050565b600080604083850312156118dc576118db611885565b5b60006118ea858286016118b0565b92505060206118fb858286016118b0565b9150509250929050565b61190e8161188f565b82525050565b60006020820190506119296000830184611905565b92915050565b600063ffffffff82169050919050565b6119488161192f565b811461195357600080fd5b50565b6000813590506119658161193f565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f8401126119905761198f61196b565b5b8235905067ffffffffffffffff8111156119ad576119ac611970565b5b6020830191508360018202830111156119c9576119c8611975565b5b9250929050565b600080600080600080608087890312156119ed576119ec611885565b5b60006119fb89828a01611956565b9650506020611a0c89828a016118b0565b955050604087013567ffffffffffffffff811115611a2d57611a2c61188a565b5b611a3989828a0161197a565b9450945050606087013567ffffffffffffffff811115611a5c57611a5b61188a565b5b611a6889828a0161197a565b92509250509295509295509295565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000611aa282611a77565b9050919050565b611ab281611a97565b8114611abd57600080fd5b50565b600081359050611acf81611aa9565b92915050565b600060208284031215611aeb57611aea611885565b5b6000611af984828501611ac0565b91505092915050565b60008083601f840112611b1857611b1761196b565b5b8235905067ffffffffffffffff811115611b3557611b34611970565b5b602083019150836020820283011115611b5157611b50611975565b5b9250929050565b60008083601f840112611b6e57611b6d61196b565b5b8235905067ffffffffffffffff811115611b8b57611b8a611970565b5b602083019150836020820283011115611ba757611ba6611975565b5b9250929050565b60008060008060008060006080888a031215611bcd57611bcc611885565b5b6000611bdb8a828b01611956565b975050602088013567ffffffffffffffff811115611bfc57611bfb61188a565b5b611c088a828b01611b02565b9650965050604088013567ffffffffffffffff811115611c2b57611c2a61188a565b5b611c378a828b01611b58565b9450945050606088013567ffffffffffffffff811115611c5a57611c5961188a565b5b611c668a828b0161197a565b925092505092959891949750929550565b60006fffffffffffffffffffffffffffffffff82169050919050565b611c9c81611c77565b8114611ca757600080fd5b50565b600081359050611cb981611c93565b92915050565b60008060408385031215611cd657611cd5611885565b5b6000611ce485828601611caa565b9250506020611cf585828601611caa565b9150509250929050565b611d0881611a97565b82525050565b6000602082019050611d236000830184611cff565b92915050565b600080600060608486031215611d4257611d41611885565b5b6000611d50868287016118b0565b9350506020611d6186828701611956565b9250506040611d7286828701611956565b9150509250925092565b60008060008060008060808789031215611d9957611d98611885565b5b6000611da789828a01611956565b9650506020611db889828a01611956565b955050604087013567ffffffffffffffff811115611dd957611dd861188a565b5b611de589828a01611b02565b9450945050606087013567ffffffffffffffff811115611e0857611e0761188a565b5b611e1489828a01611b58565b92509250509295509295509295565b600060208284031215611e3957611e38611885565b5b6000611e47848285016118b0565b91505092915050565b600061ffff82169050919050565b611e6781611e50565b8114611e7257600080fd5b50565b600081359050611e8481611e5e565b92915050565b60008060008060008060a08789031215611ea757611ea6611885565b5b6000611eb589828a01611956565b9650506020611ec689828a01611956565b9550506040611ed789828a01611e75565b9450506060611ee889828a01611e75565b935050608087013567ffffffffffffffff811115611f0957611f0861188a565b5b611f1589828a0161197a565b92509250509295509295509295565b6000611f2f82611a77565b9050919050565b611f3f81611f24565b82525050565b6000602082019050611f5a6000830184611f36565b92915050565b611f6981611f24565b8114611f7457600080fd5b50565b600081359050611f8681611f60565b92915050565b600060208284031215611fa257611fa1611885565b5b6000611fb084828501611f77565b91505092915050565b600080600060408486031215611fd257611fd1611885565b5b6000611fe086828701611956565b935050602084013567ffffffffffffffff8111156120015761200061188a565b5b61200d8682870161197a565b92509250509250925092565b600080604083850312156120305761202f611885565b5b600061203e85828601611956565b925050602061204f85828601611956565b9150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60008160011c9050919050565b6000808291508390505b60018511156120df578086048111156120bb576120ba612059565b5b60018516156120ca5780820291505b80810290506120d885612088565b945061209f565b94509492505050565b6000826120f857600190506121b4565b8161210657600090506121b4565b816001811461211c576002811461212657612155565b60019150506121b4565b60ff84111561213857612137612059565b5b8360020a91508482111561214f5761214e612059565b5b506121b4565b5060208310610133831016604e8410600b841016171561218a5782820a90508381111561218557612184612059565b5b6121b4565b6121978484846001612095565b925090508184048111156121ae576121ad612059565b5b81810290505b9392505050565b60006121c68261188f565b91506121d18361188f565b92506121fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff84846120e8565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b60006122408261188f565b915061224b8361188f565b92508261225b5761225a612206565b5b828204905092915050565b6000819050919050565b6000819050919050565b600061229561229061228b84612266565b612270565b611e50565b9050919050565b6122a58161227a565b82525050565b6000819050919050565b60006122d06122cb6122c6846122ab565b612270565b611e50565b9050919050565b6122e0816122b5565b82525050565b600082825260208201905092915050565b82818337600083830152505050565b6000601f19601f8301169050919050565b600061232383856122e6565b93506123308385846122f7565b61233983612306565b840190509392505050565b6000606082019050612359600083018761229c565b61236660208301866122d7565b8181036040830152612379818486612317565b905095945050505050565b600061238f8261188f565b915061239a8361188f565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff038211156123cf576123ce612059565b5b828201905092915050565b60006060820190506123ef6000830187611905565b6123fc6020830186611905565b818103604083015261240f818486612317565b905095945050505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600080fd5b600080fd5b600080fd5b6000808335600160200384360303811261247557612474612449565b5b80840192508235915067ffffffffffffffff8211156124975761249661244e565b5b6020830192506001820236038313156124b3576124b2612453565b5b509250929050565b60006124c68261188f565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8214156124f9576124f8612059565b5b600182019050919050565b600061250f8261188f565b915061251a8361188f565b9250817fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff048311821515161561255357612552612059565b5b828202905092915050565b6000819050919050565b6000819050919050565b61258361257e8261255e565b612568565b82525050565b60007fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b6000819050919050565b6125d06125cb82612589565b6125b5565b82525050565b60006125e28286612572565b6020820191506125f282856125bf565b60048201915061260282846125bf565b600482019150819050949350505050565b600081519050919050565b600081905092915050565b60005b8381101561264757808201518184015260208101905061262c565b83811115612656576000848401525b50505050565b600061266782612613565b612671818561261e565b9350612681818560208601612629565b80840191505092915050565b6000612699828461265c565b915081905092915050565b6126ad8161255e565b81146126b857600080fd5b50565b6000815190506126ca816126a4565b92915050565b6000602082840312156126e6576126e5611885565b5b60006126f4848285016126bb565b91505092915050565b60006127088261188f565b91506127138361188f565b92508282101561272657612725612059565b5b828203905092915050565b61273a81611e50565b82525050565b60006060820190506127556000830187612731565b6127626020830186612731565b8181036040830152612775818486612317565b905095945050505050565b60006040820190506127956000830185611905565b6127a26020830184611905565b939250505056fea2646970667358221220e294e6e9aec7dcb82b8b381bb1f5f16270ac291a922d3ff9f694c2234182ea7164736f6c63430008090033',
    deployedBytecode: '0x608060405234801561001057600080fd5b50600436106101585760003560e01c806354fd4d50116100c3578063bac159a61161007c578063bac159a6146103c5578063c655de0a146103f5578063db0d9d3114610411578063df6d3d3c14610441578063ef8376701461045d578063f2fde38b1461048d57610158565b806354fd4d50146102dd57806362dc23f3146102fb5780637675f45a146103175780638da5cb5b146103475780639126e15114610365578063a589d2121461039557610158565b806332760c7a1161011557806332760c7a1461020957806338af3eed14610225578063409537a91461024357806340bda4021461027357806345c6c858146102915780634a47821f146102ad57610158565b80630c08bf881461015d5780631685fa98146101675780631918b8fa146101975780631c31f710146101b35780631eecf500146101cf5780631f2dcdbc146101ed575b600080fd5b6101656104a9565b005b610181600480360381019061017c91906118c5565b61053a565b60405161018e9190611914565b60405180910390f35b6101b160048036038101906101ac91906119d0565b61055c565b005b6101cd60048036038101906101c89190611ad5565b61074a565b005b6101d76107e6565b6040516101e49190611914565b60405180910390f35b61020760048036038101906102029190611bae565b6107ec565b005b610223600480360381019061021e9190611cbf565b610aa0565b005b61022d610b2e565b60405161023a9190611d0e565b60405180910390f35b61025d60048036038101906102589190611d29565b610b54565b60405161026a9190611914565b60405180910390f35b61027b610be3565b6040516102889190611914565b60405180910390f35b6102ab60048036038101906102a69190611d7c565b610be9565b005b6102c760048036038101906102c29190611e23565b610e2b565b6040516102d49190611914565b60405180910390f35b6102e5610e43565b6040516102f29190611914565b60405180910390f35b61031560048036038101906103109190611e8a565b610e49565b005b610331600480360381019061032c91906118c5565b610f75565b60405161033e9190611914565b60405180910390f35b61034f611352565b60405161035c9190611f45565b60405180910390f35b61037f600480360381019061037a9190611e23565b611376565b60405161038c9190611914565b60405180910390f35b6103af60048036038101906103aa91906118c5565b61138e565b6040516103bc9190611914565b60405180910390f35b6103df60048036038101906103da9190611f8c565b6113b0565b6040516103ec9190611914565b60405180910390f35b61040f600480360381019061040a9190611fb9565b6113c8565b005b61042b60048036038101906104269190611f8c565b611618565b6040516104389190611914565b60405180910390f35b61045b60048036038101906104569190612019565b611630565b005b61047760048036038101906104729190611d29565b61179f565b6040516104849190611914565b60405180910390f35b6104a760048036038101906104a29190611f8c565b6117b5565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461050157600080fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b600081600261054991906121bb565b836105549190612235565b905092915050565b600061057f3373ffffffffffffffffffffffffffffffffffffffff168842610b54565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d296001600087876040516105d09493929190612344565b60405180910390a3600060056000888152602001908152602001600020549050610606816080436106019190612235565b610f75565b600560008981526020019081526020016000208190555060016007600089815260200190815260200160002060008282546106419190612384565b925050819055503373ffffffffffffffffffffffffffffffffffffffff16877fec780d816046adcd7183167d702b92bd76fb1a1dbe794ffe1f1b9413d052e1c584848a8a60405161069594939291906123da565b60405180910390a360006003546002546106af9190612384565b111561074057600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc6003546002546107019190612384565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f1935050505015801561073e573d6000803e3d6000fd5b505b5050505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146107a257600080fd5b80600460006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b60025481565b600061080f3373ffffffffffffffffffffffffffffffffffffffff168942610b54565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d296001600087876040516108609493929190612344565b60405180910390a360005b878790508110156109d6576000600560008a8a8581811061088f5761088e61241a565b5b9050602002013581526020019081526020016000205490506108bd816080436108b89190612235565b610f75565b600560008b8b868181106108d4576108d361241a565b5b905060200201358152602001908152602001600020819055506001600760008b8b868181106109065761090561241a565b5b905060200201358152602001908152602001600020600082825461092a9190612384565b925050819055503373ffffffffffffffffffffffffffffffffffffffff1689898481811061095b5761095a61241a565b5b905060200201357fec780d816046adcd7183167d702b92bd76fb1a1dbe794ffe1f1b9413d052e1c585848b8b888181106109985761099761241a565b5b90506020028101906109aa9190612458565b6040516109ba94939291906123da565b60405180910390a35080806109ce906124bb565b91505061086b565b506000878790506003546109ea9190612504565b6002546109f79190612384565b1115610a9657600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc88889050600354610a4a9190612504565b600254610a579190612384565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610a94573d6000803e3d6000fd5b505b5050505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610af857600080fd5b816fffffffffffffffffffffffffffffffff16600281905550806fffffffffffffffffffffffffffffffff166003819055505050565b600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000808460001b8460e01b8460e01b604051602001610b75939291906125d6565b6040516020818303038152906040529050600281604051610b96919061268d565b602060405180830381855afa158015610bb3573d6000803e3d6000fd5b5050506040513d601f19601f82011682018060405250810190610bd691906126d0565b60001c9150509392505050565b60035481565b6000610c0c3373ffffffffffffffffffffffffffffffffffffffff168888610b54565b905060005b85859050811015610d7c57600060056000888885818110610c3557610c3461241a565b5b905060200201358152602001908152602001600020549050610c6381608043610c5e9190612235565b610f75565b60056000898986818110610c7a57610c7961241a565b5b90506020020135815260200190815260200160002081905550600160076000898986818110610cac57610cab61241a565b5b9050602002013581526020019081526020016000206000828254610cd09190612384565b925050819055503373ffffffffffffffffffffffffffffffffffffffff16878784818110610d0157610d0061241a565b5b905060200201357fec780d816046adcd7183167d702b92bd76fb1a1dbe794ffe1f1b9413d052e1c58584898988818110610d3e57610d3d61241a565b5b9050602002810190610d509190612458565b604051610d6094939291906123da565b60405180910390a3508080610d74906124bb565b915050610c11565b50600085859050600354610d909190612504565b1115610e2257600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc86869050600354610de39190612504565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610e20573d6000803e3d6000fd5b505b50505050505050565b60056020528060005260406000206000915090505481565b60015481565b8463ffffffff16421015610e5c57600080fd5b6102588563ffffffff1642610e7191906126fd565b10610e7b57600080fd5b6000610e9e3373ffffffffffffffffffffffffffffffffffffffff168888610b54565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d2987878787604051610eed9493929190612740565b60405180910390a360006002541115610f6c57600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc6002549081150290604051600060405180830381858888f19350505050158015610f6a573d6000803e3d6000fd5b505b50505050505050565b600062ffffff821691506000610f8c8460f861053a565b905060098160ff161415610fd057610fa58360d861138e565b7eff000000ffffffffffffffffffffffffffffffffffffffffffffffffffffff85161791505061134c565b60008160ff16141561103457610fe78360c061138e565b7f01000000000000000000000000000000000000000000000000000000000000007effffffff000000ffffffffffffffffffffffffffffffffffffffffffffffff8616171791505061134c565b60018160ff1614156110985761104b8360a861138e565b7f02000000000000000000000000000000000000000000000000000000000000007effffffffffffff000000ffffffffffffffffffffffffffffffffffffffffff8616171791505061134c565b60028160ff1614156110fc576110af83609061138e565b7f03000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffff000000ffffffffffffffffffffffffffffffffffff8616171791505061134c565b60038160ff1614156111605761111383607861138e565b7f04000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffff000000ffffffffffffffffffffffffffffff8616171791505061134c565b60048160ff1614156111c45761117783606061138e565b7f05000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffffffffff000000ffffffffffffffffffffffff8616171791505061134c565b60058160ff161415611228576111db83604861138e565b7f06000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffffffffffffffff000000ffffffffffffffffff8616171791505061134c565b60068160ff16141561128c5761123f83603061138e565b7f07000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffffffffffffffffffffff000000ffffffffffff8616171791505061134c565b60078160ff1614156112f0576112a383601861138e565b7f08000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffffffffffffffffffffffffffff000000ffffff8616171791505061134c565b60088160ff16141561134a57827f09000000000000000000000000000000000000000000000000000000000000007effffffffffffffffffffffffffffffffffffffffffffffffffffffff0000008616171791505061134c565b505b92915050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60076020528060005260406000206000915090505481565b600081600261139d91906121bb565b836113a89190612504565b905092915050565b60086020528060005260406000206000915090505481565b60006113eb3373ffffffffffffffffffffffffffffffffffffffff168542610b54565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d2960016000878760405161143c9493929190612344565b60405180910390a36000600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002054905061149e816080436114999190612235565b610f75565b600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055506001600860003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546115319190612384565b925050819055503373ffffffffffffffffffffffffffffffffffffffff167f055992726577c4279a7c5094711fd9754dafcc079a027104ae65313c5ac6a4808383604051611580929190612780565b60405180910390a26000600254111561161157600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc6002546fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f1935050505015801561160f573d6000803e3d6000fd5b505b5050505050565b60066020528060005260406000206000915090505481565b60006116533373ffffffffffffffffffffffffffffffffffffffff168484610b54565b90506000600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000205490506116af816080436116aa9190612235565b610f75565b600660003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020819055506001600860003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060008282546117429190612384565b925050819055503373ffffffffffffffffffffffffffffffffffffffff167f055992726577c4279a7c5094711fd9754dafcc079a027104ae65313c5ac6a4808383604051611791929190612780565b60405180910390a250505050565b60006117ac848484610b54565b90509392505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461180d57600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff161461188257806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b50565b600080fd5b600080fd5b6000819050919050565b6118a28161188f565b81146118ad57600080fd5b50565b6000813590506118bf81611899565b92915050565b600080604083850312156118dc576118db611885565b5b60006118ea858286016118b0565b92505060206118fb858286016118b0565b9150509250929050565b61190e8161188f565b82525050565b60006020820190506119296000830184611905565b92915050565b600063ffffffff82169050919050565b6119488161192f565b811461195357600080fd5b50565b6000813590506119658161193f565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f8401126119905761198f61196b565b5b8235905067ffffffffffffffff8111156119ad576119ac611970565b5b6020830191508360018202830111156119c9576119c8611975565b5b9250929050565b600080600080600080608087890312156119ed576119ec611885565b5b60006119fb89828a01611956565b9650506020611a0c89828a016118b0565b955050604087013567ffffffffffffffff811115611a2d57611a2c61188a565b5b611a3989828a0161197a565b9450945050606087013567ffffffffffffffff811115611a5c57611a5b61188a565b5b611a6889828a0161197a565b92509250509295509295509295565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000611aa282611a77565b9050919050565b611ab281611a97565b8114611abd57600080fd5b50565b600081359050611acf81611aa9565b92915050565b600060208284031215611aeb57611aea611885565b5b6000611af984828501611ac0565b91505092915050565b60008083601f840112611b1857611b1761196b565b5b8235905067ffffffffffffffff811115611b3557611b34611970565b5b602083019150836020820283011115611b5157611b50611975565b5b9250929050565b60008083601f840112611b6e57611b6d61196b565b5b8235905067ffffffffffffffff811115611b8b57611b8a611970565b5b602083019150836020820283011115611ba757611ba6611975565b5b9250929050565b60008060008060008060006080888a031215611bcd57611bcc611885565b5b6000611bdb8a828b01611956565b975050602088013567ffffffffffffffff811115611bfc57611bfb61188a565b5b611c088a828b01611b02565b9650965050604088013567ffffffffffffffff811115611c2b57611c2a61188a565b5b611c378a828b01611b58565b9450945050606088013567ffffffffffffffff811115611c5a57611c5961188a565b5b611c668a828b0161197a565b925092505092959891949750929550565b60006fffffffffffffffffffffffffffffffff82169050919050565b611c9c81611c77565b8114611ca757600080fd5b50565b600081359050611cb981611c93565b92915050565b60008060408385031215611cd657611cd5611885565b5b6000611ce485828601611caa565b9250506020611cf585828601611caa565b9150509250929050565b611d0881611a97565b82525050565b6000602082019050611d236000830184611cff565b92915050565b600080600060608486031215611d4257611d41611885565b5b6000611d50868287016118b0565b9350506020611d6186828701611956565b9250506040611d7286828701611956565b9150509250925092565b60008060008060008060808789031215611d9957611d98611885565b5b6000611da789828a01611956565b9650506020611db889828a01611956565b955050604087013567ffffffffffffffff811115611dd957611dd861188a565b5b611de589828a01611b02565b9450945050606087013567ffffffffffffffff811115611e0857611e0761188a565b5b611e1489828a01611b58565b92509250509295509295509295565b600060208284031215611e3957611e38611885565b5b6000611e47848285016118b0565b91505092915050565b600061ffff82169050919050565b611e6781611e50565b8114611e7257600080fd5b50565b600081359050611e8481611e5e565b92915050565b60008060008060008060a08789031215611ea757611ea6611885565b5b6000611eb589828a01611956565b9650506020611ec689828a01611956565b9550506040611ed789828a01611e75565b9450506060611ee889828a01611e75565b935050608087013567ffffffffffffffff811115611f0957611f0861188a565b5b611f1589828a0161197a565b92509250509295509295509295565b6000611f2f82611a77565b9050919050565b611f3f81611f24565b82525050565b6000602082019050611f5a6000830184611f36565b92915050565b611f6981611f24565b8114611f7457600080fd5b50565b600081359050611f8681611f60565b92915050565b600060208284031215611fa257611fa1611885565b5b6000611fb084828501611f77565b91505092915050565b600080600060408486031215611fd257611fd1611885565b5b6000611fe086828701611956565b935050602084013567ffffffffffffffff8111156120015761200061188a565b5b61200d8682870161197a565b92509250509250925092565b600080604083850312156120305761202f611885565b5b600061203e85828601611956565b925050602061204f85828601611956565b9150509250929050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b60008160011c9050919050565b6000808291508390505b60018511156120df578086048111156120bb576120ba612059565b5b60018516156120ca5780820291505b80810290506120d885612088565b945061209f565b94509492505050565b6000826120f857600190506121b4565b8161210657600090506121b4565b816001811461211c576002811461212657612155565b60019150506121b4565b60ff84111561213857612137612059565b5b8360020a91508482111561214f5761214e612059565b5b506121b4565b5060208310610133831016604e8410600b841016171561218a5782820a90508381111561218557612184612059565b5b6121b4565b6121978484846001612095565b925090508184048111156121ae576121ad612059565b5b81810290505b9392505050565b60006121c68261188f565b91506121d18361188f565b92506121fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff84846120e8565b905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b60006122408261188f565b915061224b8361188f565b92508261225b5761225a612206565b5b828204905092915050565b6000819050919050565b6000819050919050565b600061229561229061228b84612266565b612270565b611e50565b9050919050565b6122a58161227a565b82525050565b6000819050919050565b60006122d06122cb6122c6846122ab565b612270565b611e50565b9050919050565b6122e0816122b5565b82525050565b600082825260208201905092915050565b82818337600083830152505050565b6000601f19601f8301169050919050565b600061232383856122e6565b93506123308385846122f7565b61233983612306565b840190509392505050565b6000606082019050612359600083018761229c565b61236660208301866122d7565b8181036040830152612379818486612317565b905095945050505050565b600061238f8261188f565b915061239a8361188f565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff038211156123cf576123ce612059565b5b828201905092915050565b60006060820190506123ef6000830187611905565b6123fc6020830186611905565b818103604083015261240f818486612317565b905095945050505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600080fd5b600080fd5b600080fd5b6000808335600160200384360303811261247557612474612449565b5b80840192508235915067ffffffffffffffff8211156124975761249661244e565b5b6020830192506001820236038313156124b3576124b2612453565b5b509250929050565b60006124c68261188f565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8214156124f9576124f8612059565b5b600182019050919050565b600061250f8261188f565b915061251a8361188f565b9250817fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff048311821515161561255357612552612059565b5b828202905092915050565b6000819050919050565b6000819050919050565b61258361257e8261255e565b612568565b82525050565b60007fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b6000819050919050565b6125d06125cb82612589565b6125b5565b82525050565b60006125e28286612572565b6020820191506125f282856125bf565b60048201915061260282846125bf565b600482019150819050949350505050565b600081519050919050565b600081905092915050565b60005b8381101561264757808201518184015260208101905061262c565b83811115612656576000848401525b50505050565b600061266782612613565b612671818561261e565b9350612681818560208601612629565b80840191505092915050565b6000612699828461265c565b915081905092915050565b6126ad8161255e565b81146126b857600080fd5b50565b6000815190506126ca816126a4565b92915050565b6000602082840312156126e6576126e5611885565b5b60006126f4848285016126bb565b91505092915050565b60006127088261188f565b91506127138361188f565b92508282101561272657612725612059565b5b828203905092915050565b61273a81611e50565b82525050565b60006060820190506127556000830187612731565b6127626020830186612731565b8181036040830152612775818486612317565b905095945050505050565b60006040820190506127956000830185611905565b6127a26020830184611905565b939250505056fea2646970667358221220e294e6e9aec7dcb82b8b381bb1f5f16270ac291a922d3ff9f694c2234182ea7164736f6c63430008090033',
    linkReferences: {},
    deployedLinkReferences: {},
};
//# sourceMappingURL=MailerContract.js.map