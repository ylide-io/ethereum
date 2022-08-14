"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MAILER_ABI = exports.MailerContract = void 0;
const sdk_1 = require("@ylide/sdk");
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
const misc_1 = require("../misc");
class MailerContract {
    blockchainController;
    contractAddress;
    contract;
    constructor(blockchainController, contractAddress) {
        this.blockchainController = blockchainController;
        this.contractAddress = contractAddress;
        this.contract = new this.blockchainController.writeWeb3.eth.Contract(exports.MAILER_ABI.abi, this.contractAddress);
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
        const data = this.blockchainController.writeWeb3.eth.abi.encodeFunctionCall(exports.MAILER_ABI.abi.find(t => t.name === method), args);
        const gasPrice = await this.blockchainController.writeWeb3.eth.getGasPrice();
        const gas = await this.blockchainController.writeWeb3.eth.estimateGas({
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
        console.log('abc');
        return await this.estimateAndCall(address, 'sendBulkMail', [
            uniqueId,
            recipients.map(r => '0x' + r),
            keys.map(k => '0x' + new smart_buffer_1.default(k).toHexString()),
            '0x' + new smart_buffer_1.default(content).toHexString(),
        ]);
    }
    decodeContentMessageBody(ev) {
        const { msgId, sender, parts, partIdx, content } = ev.returnValues;
        return {
            sender,
            msgId: (0, sdk_1.bigIntToUint256)(msgId),
            parts: Number(parts),
            partIdx: Number(partIdx),
            content: smart_buffer_1.default.ofHexString(content.substring(2)).bytes,
        };
    }
}
exports.MailerContract = MailerContract;
exports.MAILER_ABI = {
    _format: 'hh-sol-artifact-1',
    contractName: 'YlideMailerV5',
    sourceName: 'contracts/YlideMailerV5.sol',
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
                    indexed: true,
                    internalType: 'uint256',
                    name: 'msgId',
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
                    internalType: 'uint128',
                    name: '',
                    type: 'uint128',
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
                    internalType: 'uint128',
                    name: '',
                    type: 'uint128',
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
    ],
    bytecode: '0x60806040526000600160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff1602179055506000600160106101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555034801561008457600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550611e43806100d46000396000f3fe608060405234801561001057600080fd5b50600436106101005760003560e01c806340bda40211610097578063c655de0a11610066578063c655de0a1461025f578063df6d3d3c1461027b578063ef83767014610297578063f2fde38b146102c757610100565b806340bda402146101eb57806345c6c8581461020957806362dc23f3146102255780638da5cb5b1461024157610100565b80631f2dcdbc116100d35780631f2dcdbc1461016557806332760c7a1461018157806338af3eed1461019d578063409537a9146101bb57610100565b80630c08bf88146101055780631918b8fa1461010f5780631c31f7101461012b5780631eecf50014610147575b600080fd5b61010d6102e3565b005b610129600480360381019061012491906111dc565b610374565b005b610145600480360381019061014091906112e1565b610571565b005b61014f61060d565b60405161015c9190611339565b60405180910390f35b61017f600480360381019061017a9190611400565b61062f565b005b61019b600480360381019061019691906114f5565b6108dd565b005b6101a56109ab565b6040516101b29190611544565b60405180910390f35b6101d560048036038101906101d0919061155f565b6109d1565b6040516101e291906115c1565b60405180910390f35b6101f3610a60565b6040516102009190611339565b60405180910390f35b610223600480360381019061021e91906115dc565b610a82565b005b61023f600480360381019061023a91906116bd565b610c62565b005b610249610dea565b6040516102569190611778565b60405180910390f35b61027960048036038101906102749190611793565b610e0e565b005b610295600480360381019061029091906117f3565b610fa7565b005b6102b160048036038101906102ac919061155f565b611015565b6040516102be91906115c1565b60405180910390f35b6102e160048036038101906102dc919061185f565b61102b565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461033b57600080fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b60006103973373ffffffffffffffffffffffffffffffffffffffff1688426109d1565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d296001600087876040516103e8949392919061196a565b60405180910390a33373ffffffffffffffffffffffffffffffffffffffff16867f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e83888860405161043b939291906119aa565b60405180910390a36000600160109054906101000a90046fffffffffffffffffffffffffffffffff16600160009054906101000a90046fffffffffffffffffffffffffffffffff1661048d9190611a0b565b6fffffffffffffffffffffffffffffffff16111561056857600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc600160109054906101000a90046fffffffffffffffffffffffffffffffff16600160009054906101000a90046fffffffffffffffffffffffffffffffff166105299190611a0b565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610566573d6000803e3d6000fd5b505b50505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146105c957600080fd5b80600260006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b600160009054906101000a90046fffffffffffffffffffffffffffffffff1681565b60006106523373ffffffffffffffffffffffffffffffffffffffff1689426109d1565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d296001600087876040516106a3949392919061196a565b60405180910390a360005b8787905081101561075b573373ffffffffffffffffffffffffffffffffffffffff168888838181106106e3576106e2611a51565b5b905060200201357f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e8489898681811061071f5761071e611a51565b5b90506020028101906107319190611a8f565b604051610740939291906119aa565b60405180910390a3808061075390611af2565b9150506106ae565b50600087879050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff1661079d9190611b3b565b600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166107d89190611b95565b11156108d357600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc88889050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166108599190611b3b565b600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166108949190611b95565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f193505050501580156108d1573d6000803e3d6000fd5b505b5050505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461093557600080fd5b81600160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555080600160106101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff1602179055505050565b600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000808460001b8460e01b8460e01b6040516020016109f293929190611c63565b6040516020818303038152906040529050600281604051610a139190611d1a565b602060405180830381855afa158015610a30573d6000803e3d6000fd5b5050506040513d601f19601f82011682018060405250810190610a539190611d5d565b60001c9150509392505050565b600160109054906101000a90046fffffffffffffffffffffffffffffffff1681565b6000610aa53373ffffffffffffffffffffffffffffffffffffffff1688886109d1565b905060005b85859050811015610b57573373ffffffffffffffffffffffffffffffffffffffff16868683818110610adf57610ade611a51565b5b905060200201357f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e84878786818110610b1b57610b1a611a51565b5b9050602002810190610b2d9190611a8f565b604051610b3c939291906119aa565b60405180910390a38080610b4f90611af2565b915050610aaa565b50600085859050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff16610b999190611b3b565b1115610c5957600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc86869050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff16610c1a9190611b3b565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610c57573d6000803e3d6000fd5b505b50505050505050565b8463ffffffff16421015610c7557600080fd5b6102588563ffffffff1642610c8a9190611d8a565b10610c9457600080fd5b6000610cb73373ffffffffffffffffffffffffffffffffffffffff1688886109d1565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d2987878787604051610d069493929190611dcd565b60405180910390a36000600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff161115610de157600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610ddf573d6000803e3d6000fd5b505b50505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000610e313373ffffffffffffffffffffffffffffffffffffffff1685426109d1565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d29600160008787604051610e82949392919061196a565b60405180910390a3803373ffffffffffffffffffffffffffffffffffffffff167f75d55e49e4504de4dc180bec2876ad7b2b66e43764374a425fa153488c31fc2260405160405180910390a36000600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff161115610fa157600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610f9f573d6000803e3d6000fd5b505b50505050565b6000610fca3373ffffffffffffffffffffffffffffffffffffffff1684846109d1565b9050803373ffffffffffffffffffffffffffffffffffffffff167f75d55e49e4504de4dc180bec2876ad7b2b66e43764374a425fa153488c31fc2260405160405180910390a3505050565b60006110228484846109d1565b90509392505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461108357600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16146110f857806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b50565b600080fd5b600080fd5b600063ffffffff82169050919050565b61111e81611105565b811461112957600080fd5b50565b60008135905061113b81611115565b92915050565b6000819050919050565b61115481611141565b811461115f57600080fd5b50565b6000813590506111718161114b565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f84011261119c5761119b611177565b5b8235905067ffffffffffffffff8111156111b9576111b861117c565b5b6020830191508360018202830111156111d5576111d4611181565b5b9250929050565b600080600080600080608087890312156111f9576111f86110fb565b5b600061120789828a0161112c565b965050602061121889828a01611162565b955050604087013567ffffffffffffffff81111561123957611238611100565b5b61124589828a01611186565b9450945050606087013567ffffffffffffffff81111561126857611267611100565b5b61127489828a01611186565b92509250509295509295509295565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006112ae82611283565b9050919050565b6112be816112a3565b81146112c957600080fd5b50565b6000813590506112db816112b5565b92915050565b6000602082840312156112f7576112f66110fb565b5b6000611305848285016112cc565b91505092915050565b60006fffffffffffffffffffffffffffffffff82169050919050565b6113338161130e565b82525050565b600060208201905061134e600083018461132a565b92915050565b60008083601f84011261136a57611369611177565b5b8235905067ffffffffffffffff8111156113875761138661117c565b5b6020830191508360208202830111156113a3576113a2611181565b5b9250929050565b60008083601f8401126113c0576113bf611177565b5b8235905067ffffffffffffffff8111156113dd576113dc61117c565b5b6020830191508360208202830111156113f9576113f8611181565b5b9250929050565b60008060008060008060006080888a03121561141f5761141e6110fb565b5b600061142d8a828b0161112c565b975050602088013567ffffffffffffffff81111561144e5761144d611100565b5b61145a8a828b01611354565b9650965050604088013567ffffffffffffffff81111561147d5761147c611100565b5b6114898a828b016113aa565b9450945050606088013567ffffffffffffffff8111156114ac576114ab611100565b5b6114b88a828b01611186565b925092505092959891949750929550565b6114d28161130e565b81146114dd57600080fd5b50565b6000813590506114ef816114c9565b92915050565b6000806040838503121561150c5761150b6110fb565b5b600061151a858286016114e0565b925050602061152b858286016114e0565b9150509250929050565b61153e816112a3565b82525050565b60006020820190506115596000830184611535565b92915050565b600080600060608486031215611578576115776110fb565b5b600061158686828701611162565b93505060206115978682870161112c565b92505060406115a88682870161112c565b9150509250925092565b6115bb81611141565b82525050565b60006020820190506115d660008301846115b2565b92915050565b600080600080600080608087890312156115f9576115f86110fb565b5b600061160789828a0161112c565b965050602061161889828a0161112c565b955050604087013567ffffffffffffffff81111561163957611638611100565b5b61164589828a01611354565b9450945050606087013567ffffffffffffffff81111561166857611667611100565b5b61167489828a016113aa565b92509250509295509295509295565b600061ffff82169050919050565b61169a81611683565b81146116a557600080fd5b50565b6000813590506116b781611691565b92915050565b60008060008060008060a087890312156116da576116d96110fb565b5b60006116e889828a0161112c565b96505060206116f989828a0161112c565b955050604061170a89828a016116a8565b945050606061171b89828a016116a8565b935050608087013567ffffffffffffffff81111561173c5761173b611100565b5b61174889828a01611186565b92509250509295509295509295565b600061176282611283565b9050919050565b61177281611757565b82525050565b600060208201905061178d6000830184611769565b92915050565b6000806000604084860312156117ac576117ab6110fb565b5b60006117ba8682870161112c565b935050602084013567ffffffffffffffff8111156117db576117da611100565b5b6117e786828701611186565b92509250509250925092565b6000806040838503121561180a576118096110fb565b5b60006118188582860161112c565b92505060206118298582860161112c565b9150509250929050565b61183c81611757565b811461184757600080fd5b50565b60008135905061185981611833565b92915050565b600060208284031215611875576118746110fb565b5b60006118838482850161184a565b91505092915050565b6000819050919050565b6000819050919050565b60006118bb6118b66118b18461188c565b611896565b611683565b9050919050565b6118cb816118a0565b82525050565b6000819050919050565b60006118f66118f16118ec846118d1565b611896565b611683565b9050919050565b611906816118db565b82525050565b600082825260208201905092915050565b82818337600083830152505050565b6000601f19601f8301169050919050565b6000611949838561190c565b935061195683858461191d565b61195f8361192c565b840190509392505050565b600060608201905061197f60008301876118c2565b61198c60208301866118fd565b818103604083015261199f81848661193d565b905095945050505050565b60006040820190506119bf60008301866115b2565b81810360208301526119d281848661193d565b9050949350505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000611a168261130e565b9150611a218361130e565b9250826fffffffffffffffffffffffffffffffff03821115611a4657611a456119dc565b5b828201905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600080fd5b600080fd5b600080fd5b60008083356001602003843603038112611aac57611aab611a80565b5b80840192508235915067ffffffffffffffff821115611ace57611acd611a85565b5b602083019250600182023603831315611aea57611ae9611a8a565b5b509250929050565b6000611afd82611141565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff821415611b3057611b2f6119dc565b5b600182019050919050565b6000611b4682611141565b9150611b5183611141565b9250817fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0483118215151615611b8a57611b896119dc565b5b828202905092915050565b6000611ba082611141565b9150611bab83611141565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff03821115611be057611bdf6119dc565b5b828201905092915050565b6000819050919050565b6000819050919050565b611c10611c0b82611beb565b611bf5565b82525050565b60007fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b6000819050919050565b611c5d611c5882611c16565b611c42565b82525050565b6000611c6f8286611bff565b602082019150611c7f8285611c4c565b600482019150611c8f8284611c4c565b600482019150819050949350505050565b600081519050919050565b600081905092915050565b60005b83811015611cd4578082015181840152602081019050611cb9565b83811115611ce3576000848401525b50505050565b6000611cf482611ca0565b611cfe8185611cab565b9350611d0e818560208601611cb6565b80840191505092915050565b6000611d268284611ce9565b915081905092915050565b611d3a81611beb565b8114611d4557600080fd5b50565b600081519050611d5781611d31565b92915050565b600060208284031215611d7357611d726110fb565b5b6000611d8184828501611d48565b91505092915050565b6000611d9582611141565b9150611da083611141565b925082821015611db357611db26119dc565b5b828203905092915050565b611dc781611683565b82525050565b6000606082019050611de26000830187611dbe565b611def6020830186611dbe565b8181036040830152611e0281848661193d565b90509594505050505056fea26469706673582212202605a6edc8c43c26d13c104cb187ef57b5f4f760461ad5b0b7b1737c08b4a7e364736f6c63430008090033',
    deployedBytecode: '0x608060405234801561001057600080fd5b50600436106101005760003560e01c806340bda40211610097578063c655de0a11610066578063c655de0a1461025f578063df6d3d3c1461027b578063ef83767014610297578063f2fde38b146102c757610100565b806340bda402146101eb57806345c6c8581461020957806362dc23f3146102255780638da5cb5b1461024157610100565b80631f2dcdbc116100d35780631f2dcdbc1461016557806332760c7a1461018157806338af3eed1461019d578063409537a9146101bb57610100565b80630c08bf88146101055780631918b8fa1461010f5780631c31f7101461012b5780631eecf50014610147575b600080fd5b61010d6102e3565b005b610129600480360381019061012491906111dc565b610374565b005b610145600480360381019061014091906112e1565b610571565b005b61014f61060d565b60405161015c9190611339565b60405180910390f35b61017f600480360381019061017a9190611400565b61062f565b005b61019b600480360381019061019691906114f5565b6108dd565b005b6101a56109ab565b6040516101b29190611544565b60405180910390f35b6101d560048036038101906101d0919061155f565b6109d1565b6040516101e291906115c1565b60405180910390f35b6101f3610a60565b6040516102009190611339565b60405180910390f35b610223600480360381019061021e91906115dc565b610a82565b005b61023f600480360381019061023a91906116bd565b610c62565b005b610249610dea565b6040516102569190611778565b60405180910390f35b61027960048036038101906102749190611793565b610e0e565b005b610295600480360381019061029091906117f3565b610fa7565b005b6102b160048036038101906102ac919061155f565b611015565b6040516102be91906115c1565b60405180910390f35b6102e160048036038101906102dc919061185f565b61102b565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461033b57600080fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b60006103973373ffffffffffffffffffffffffffffffffffffffff1688426109d1565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d296001600087876040516103e8949392919061196a565b60405180910390a33373ffffffffffffffffffffffffffffffffffffffff16867f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e83888860405161043b939291906119aa565b60405180910390a36000600160109054906101000a90046fffffffffffffffffffffffffffffffff16600160009054906101000a90046fffffffffffffffffffffffffffffffff1661048d9190611a0b565b6fffffffffffffffffffffffffffffffff16111561056857600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc600160109054906101000a90046fffffffffffffffffffffffffffffffff16600160009054906101000a90046fffffffffffffffffffffffffffffffff166105299190611a0b565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610566573d6000803e3d6000fd5b505b50505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146105c957600080fd5b80600260006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b600160009054906101000a90046fffffffffffffffffffffffffffffffff1681565b60006106523373ffffffffffffffffffffffffffffffffffffffff1689426109d1565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d296001600087876040516106a3949392919061196a565b60405180910390a360005b8787905081101561075b573373ffffffffffffffffffffffffffffffffffffffff168888838181106106e3576106e2611a51565b5b905060200201357f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e8489898681811061071f5761071e611a51565b5b90506020028101906107319190611a8f565b604051610740939291906119aa565b60405180910390a3808061075390611af2565b9150506106ae565b50600087879050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff1661079d9190611b3b565b600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166107d89190611b95565b11156108d357600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc88889050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166108599190611b3b565b600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166108949190611b95565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f193505050501580156108d1573d6000803e3d6000fd5b505b5050505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461093557600080fd5b81600160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555080600160106101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff1602179055505050565b600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000808460001b8460e01b8460e01b6040516020016109f293929190611c63565b6040516020818303038152906040529050600281604051610a139190611d1a565b602060405180830381855afa158015610a30573d6000803e3d6000fd5b5050506040513d601f19601f82011682018060405250810190610a539190611d5d565b60001c9150509392505050565b600160109054906101000a90046fffffffffffffffffffffffffffffffff1681565b6000610aa53373ffffffffffffffffffffffffffffffffffffffff1688886109d1565b905060005b85859050811015610b57573373ffffffffffffffffffffffffffffffffffffffff16868683818110610adf57610ade611a51565b5b905060200201357f46235d2e0f25df2c5261b87dc0c3da0832af911941c4c8b0dda32b7be06a429e84878786818110610b1b57610b1a611a51565b5b9050602002810190610b2d9190611a8f565b604051610b3c939291906119aa565b60405180910390a38080610b4f90611af2565b915050610aaa565b50600085859050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff16610b999190611b3b565b1115610c5957600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc86869050600160109054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff16610c1a9190611b3b565b6fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610c57573d6000803e3d6000fd5b505b50505050505050565b8463ffffffff16421015610c7557600080fd5b6102588563ffffffff1642610c8a9190611d8a565b10610c9457600080fd5b6000610cb73373ffffffffffffffffffffffffffffffffffffffff1688886109d1565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d2987878787604051610d069493929190611dcd565b60405180910390a36000600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff161115610de157600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610ddf573d6000803e3d6000fd5b505b50505050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000610e313373ffffffffffffffffffffffffffffffffffffffff1685426109d1565b90503373ffffffffffffffffffffffffffffffffffffffff16817fd915db8013406ed60ecce0d75d05410716fffaec122c644b7a7599a0456c2d29600160008787604051610e82949392919061196a565b60405180910390a3803373ffffffffffffffffffffffffffffffffffffffff167f75d55e49e4504de4dc180bec2876ad7b2b66e43764374a425fa153488c31fc2260405160405180910390a36000600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff161115610fa157600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166108fc600160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff169081150290604051600060405180830381858888f19350505050158015610f9f573d6000803e3d6000fd5b505b50505050565b6000610fca3373ffffffffffffffffffffffffffffffffffffffff1684846109d1565b9050803373ffffffffffffffffffffffffffffffffffffffff167f75d55e49e4504de4dc180bec2876ad7b2b66e43764374a425fa153488c31fc2260405160405180910390a3505050565b60006110228484846109d1565b90509392505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461108357600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16146110f857806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b50565b600080fd5b600080fd5b600063ffffffff82169050919050565b61111e81611105565b811461112957600080fd5b50565b60008135905061113b81611115565b92915050565b6000819050919050565b61115481611141565b811461115f57600080fd5b50565b6000813590506111718161114b565b92915050565b600080fd5b600080fd5b600080fd5b60008083601f84011261119c5761119b611177565b5b8235905067ffffffffffffffff8111156111b9576111b861117c565b5b6020830191508360018202830111156111d5576111d4611181565b5b9250929050565b600080600080600080608087890312156111f9576111f86110fb565b5b600061120789828a0161112c565b965050602061121889828a01611162565b955050604087013567ffffffffffffffff81111561123957611238611100565b5b61124589828a01611186565b9450945050606087013567ffffffffffffffff81111561126857611267611100565b5b61127489828a01611186565b92509250509295509295509295565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006112ae82611283565b9050919050565b6112be816112a3565b81146112c957600080fd5b50565b6000813590506112db816112b5565b92915050565b6000602082840312156112f7576112f66110fb565b5b6000611305848285016112cc565b91505092915050565b60006fffffffffffffffffffffffffffffffff82169050919050565b6113338161130e565b82525050565b600060208201905061134e600083018461132a565b92915050565b60008083601f84011261136a57611369611177565b5b8235905067ffffffffffffffff8111156113875761138661117c565b5b6020830191508360208202830111156113a3576113a2611181565b5b9250929050565b60008083601f8401126113c0576113bf611177565b5b8235905067ffffffffffffffff8111156113dd576113dc61117c565b5b6020830191508360208202830111156113f9576113f8611181565b5b9250929050565b60008060008060008060006080888a03121561141f5761141e6110fb565b5b600061142d8a828b0161112c565b975050602088013567ffffffffffffffff81111561144e5761144d611100565b5b61145a8a828b01611354565b9650965050604088013567ffffffffffffffff81111561147d5761147c611100565b5b6114898a828b016113aa565b9450945050606088013567ffffffffffffffff8111156114ac576114ab611100565b5b6114b88a828b01611186565b925092505092959891949750929550565b6114d28161130e565b81146114dd57600080fd5b50565b6000813590506114ef816114c9565b92915050565b6000806040838503121561150c5761150b6110fb565b5b600061151a858286016114e0565b925050602061152b858286016114e0565b9150509250929050565b61153e816112a3565b82525050565b60006020820190506115596000830184611535565b92915050565b600080600060608486031215611578576115776110fb565b5b600061158686828701611162565b93505060206115978682870161112c565b92505060406115a88682870161112c565b9150509250925092565b6115bb81611141565b82525050565b60006020820190506115d660008301846115b2565b92915050565b600080600080600080608087890312156115f9576115f86110fb565b5b600061160789828a0161112c565b965050602061161889828a0161112c565b955050604087013567ffffffffffffffff81111561163957611638611100565b5b61164589828a01611354565b9450945050606087013567ffffffffffffffff81111561166857611667611100565b5b61167489828a016113aa565b92509250509295509295509295565b600061ffff82169050919050565b61169a81611683565b81146116a557600080fd5b50565b6000813590506116b781611691565b92915050565b60008060008060008060a087890312156116da576116d96110fb565b5b60006116e889828a0161112c565b96505060206116f989828a0161112c565b955050604061170a89828a016116a8565b945050606061171b89828a016116a8565b935050608087013567ffffffffffffffff81111561173c5761173b611100565b5b61174889828a01611186565b92509250509295509295509295565b600061176282611283565b9050919050565b61177281611757565b82525050565b600060208201905061178d6000830184611769565b92915050565b6000806000604084860312156117ac576117ab6110fb565b5b60006117ba8682870161112c565b935050602084013567ffffffffffffffff8111156117db576117da611100565b5b6117e786828701611186565b92509250509250925092565b6000806040838503121561180a576118096110fb565b5b60006118188582860161112c565b92505060206118298582860161112c565b9150509250929050565b61183c81611757565b811461184757600080fd5b50565b60008135905061185981611833565b92915050565b600060208284031215611875576118746110fb565b5b60006118838482850161184a565b91505092915050565b6000819050919050565b6000819050919050565b60006118bb6118b66118b18461188c565b611896565b611683565b9050919050565b6118cb816118a0565b82525050565b6000819050919050565b60006118f66118f16118ec846118d1565b611896565b611683565b9050919050565b611906816118db565b82525050565b600082825260208201905092915050565b82818337600083830152505050565b6000601f19601f8301169050919050565b6000611949838561190c565b935061195683858461191d565b61195f8361192c565b840190509392505050565b600060608201905061197f60008301876118c2565b61198c60208301866118fd565b818103604083015261199f81848661193d565b905095945050505050565b60006040820190506119bf60008301866115b2565b81810360208301526119d281848661193d565b9050949350505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000611a168261130e565b9150611a218361130e565b9250826fffffffffffffffffffffffffffffffff03821115611a4657611a456119dc565b5b828201905092915050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b600080fd5b600080fd5b600080fd5b60008083356001602003843603038112611aac57611aab611a80565b5b80840192508235915067ffffffffffffffff821115611ace57611acd611a85565b5b602083019250600182023603831315611aea57611ae9611a8a565b5b509250929050565b6000611afd82611141565b91507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff821415611b3057611b2f6119dc565b5b600182019050919050565b6000611b4682611141565b9150611b5183611141565b9250817fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0483118215151615611b8a57611b896119dc565b5b828202905092915050565b6000611ba082611141565b9150611bab83611141565b9250827fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff03821115611be057611bdf6119dc565b5b828201905092915050565b6000819050919050565b6000819050919050565b611c10611c0b82611beb565b611bf5565b82525050565b60007fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b6000819050919050565b611c5d611c5882611c16565b611c42565b82525050565b6000611c6f8286611bff565b602082019150611c7f8285611c4c565b600482019150611c8f8284611c4c565b600482019150819050949350505050565b600081519050919050565b600081905092915050565b60005b83811015611cd4578082015181840152602081019050611cb9565b83811115611ce3576000848401525b50505050565b6000611cf482611ca0565b611cfe8185611cab565b9350611d0e818560208601611cb6565b80840191505092915050565b6000611d268284611ce9565b915081905092915050565b611d3a81611beb565b8114611d4557600080fd5b50565b600081519050611d5781611d31565b92915050565b600060208284031215611d7357611d726110fb565b5b6000611d8184828501611d48565b91505092915050565b6000611d9582611141565b9150611da083611141565b925082821015611db357611db26119dc565b5b828203905092915050565b611dc781611683565b82525050565b6000606082019050611de26000830187611dbe565b611def6020830186611dbe565b8181036040830152611e0281848661193d565b90509594505050505056fea26469706673582212202605a6edc8c43c26d13c104cb187ef57b5f4f760461ad5b0b7b1737c08b4a7e364736f6c63430008090033',
    linkReferences: {},
    deployedLinkReferences: {},
};
//# sourceMappingURL=MailerContract.js.map