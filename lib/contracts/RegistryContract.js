"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGISTRY_ABI = exports.RegistryContract = void 0;
const web3_1 = __importDefault(require("web3"));
const misc_1 = require("../misc");
const smart_buffer_1 = __importDefault(require("@ylide/smart-buffer"));
class RegistryContract {
    web3;
    contractAddress;
    contract;
    constructor(web3, contractAddress) {
        this.web3 = web3;
        this.contractAddress = contractAddress;
        this.contract = new this.web3.eth.Contract(exports.REGISTRY_ABI.abi, this.contractAddress);
    }
    async estimateAndCall(address, method, args) {
        const data = this.web3.eth.abi.encodeFunctionCall(exports.REGISTRY_ABI.abi.find(t => t.name === method), args);
        const gasPrice = await this.web3.eth.getGasPrice();
        const gas = await this.web3.eth.estimateGas({
            to: this.contract.options.address,
            from: address,
            data,
        });
        return await this.contract.methods[method](...args).send({ from: address, gas, gasPrice });
    }
    async estimateAndGetABI(address, method, args) {
        const data = this.web3.eth.abi.encodeFunctionCall(exports.REGISTRY_ABI.abi.find(t => t.name === method), args);
        const gasPrice = await this.web3.eth.getGasPrice();
        const gas = await this.web3.eth.estimateGas({
            to: this.contract.options.address,
            from: address,
            data,
        });
        return {
            data: this.contract.methods[method](...args).encodeABI(),
            gas,
            gasPrice,
        };
    }
    async attachPublicKey(address, publicKey, keyVersion) {
        await this.estimateAndCall(address, 'attachPublicKey', [(0, misc_1.publicKeyToBigIntString)(publicKey), keyVersion]);
        return true;
    }
    async changeBonucer(from, newBonucer) {
        return await this.estimateAndCall(from, 'changeBonucer', [newBonucer]);
    }
    // uint8 _v, bytes32 _r, bytes32 _s, address payable addr, uint256 publicKey, uint64 keyVersion, address payable referrer, bool payBonus
    async attachPublicKeyByAdmin(from, _v, _r, _s, address, publicKey, keyVersion, referrer, payBonus) {
        return await this.estimateAndGetABI(from, 'attachPublicKeyByAdmin', [
            _v,
            _r,
            _s,
            address,
            (0, misc_1.publicKeyToBigIntString)(publicKey),
            keyVersion,
            referrer,
            payBonus,
        ]);
    }
    static async getVersion(w3, registryAddress) {
        const contract = new w3.eth.Contract(exports.REGISTRY_ABI.abi, registryAddress);
        return w3.utils.toNumber(await contract.methods.version().call());
    }
    static async extractPublicKeyFromAddress(address, w3, registryAddress) {
        const contract = new w3.eth.Contract(exports.REGISTRY_ABI.abi, registryAddress);
        const result = await contract.methods.addressToPublicKey(address).call();
        const block = web3_1.default.utils.toNumber(result.block);
        const keyVersion = web3_1.default.utils.toNumber(result.keyVersion);
        const publicKey = smart_buffer_1.default.ofHexString(web3_1.default.utils.toHex(result.publicKey).substring(2).padStart(64, '0')).bytes;
        const timestamp = web3_1.default.utils.toNumber(result.timestamp);
        return block === 0
            ? null
            : {
                block,
                keyVersion,
                publicKey,
                timestamp,
            };
        // if (result === '0' || result === '0x0') {
        // 	return null;
        // } else {
        // 	const hex = w3.utils.toHex(result);
        // 	return SmartBuffer.ofHexString(hex.substring(2).padStart(64, '0')).bytes;
        // }
    }
    static async deployContract(web3, from, previousContract) {
        const contract = new web3.eth.Contract(exports.REGISTRY_ABI.abi);
        const deployTx = contract.deploy({
            arguments: [previousContract ? previousContract : '0x0000000000000000000000000000000000000000'],
            data: exports.REGISTRY_ABI.bytecode,
        });
        const tx = await deployTx.send({ from });
        return tx.options.address;
    }
}
exports.RegistryContract = RegistryContract;
exports.REGISTRY_ABI = {
    _format: 'hh-sol-artifact-1',
    contractName: 'YlideRegistryV4',
    sourceName: 'contracts/YlideRegistryV4.sol',
    abi: [
        {
            inputs: [
                {
                    internalType: 'address',
                    name: 'previousContractAddress',
                    type: 'address',
                },
            ],
            stateMutability: 'nonpayable',
            type: 'constructor',
        },
        {
            anonymous: false,
            inputs: [
                {
                    indexed: true,
                    internalType: 'address',
                    name: 'addr',
                    type: 'address',
                },
                {
                    indexed: false,
                    internalType: 'uint256',
                    name: 'publicKey',
                    type: 'uint256',
                },
                {
                    indexed: false,
                    internalType: 'uint64',
                    name: 'keyVersion',
                    type: 'uint64',
                },
            ],
            name: 'KeyAttached',
            type: 'event',
        },
        {
            inputs: [
                {
                    internalType: 'address',
                    name: '',
                    type: 'address',
                },
            ],
            name: 'addressToPublicKey',
            outputs: [
                {
                    internalType: 'uint256',
                    name: 'publicKey',
                    type: 'uint256',
                },
                {
                    internalType: 'uint128',
                    name: 'block',
                    type: 'uint128',
                },
                {
                    internalType: 'uint64',
                    name: 'timestamp',
                    type: 'uint64',
                },
                {
                    internalType: 'uint64',
                    name: 'keyVersion',
                    type: 'uint64',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'publicKey',
                    type: 'uint256',
                },
                {
                    internalType: 'uint64',
                    name: 'keyVersion',
                    type: 'uint64',
                },
            ],
            name: 'attachPublicKey',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint8',
                    name: '_v',
                    type: 'uint8',
                },
                {
                    internalType: 'bytes32',
                    name: '_r',
                    type: 'bytes32',
                },
                {
                    internalType: 'bytes32',
                    name: '_s',
                    type: 'bytes32',
                },
                {
                    internalType: 'address payable',
                    name: 'addr',
                    type: 'address',
                },
                {
                    internalType: 'uint256',
                    name: 'publicKey',
                    type: 'uint256',
                },
                {
                    internalType: 'uint64',
                    name: 'keyVersion',
                    type: 'uint64',
                },
                {
                    internalType: 'address payable',
                    name: 'referrer',
                    type: 'address',
                },
                {
                    internalType: 'bool',
                    name: 'payBonus',
                    type: 'bool',
                },
            ],
            name: 'attachPublicKeyByAdmin',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [],
            name: 'bonucer',
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
            inputs: [
                {
                    internalType: 'address',
                    name: 'newBonucer',
                    type: 'address',
                },
            ],
            name: 'changeBonucer',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'address',
                    name: 'addr',
                    type: 'address',
                },
            ],
            name: 'getPublicKey',
            outputs: [
                {
                    components: [
                        {
                            internalType: 'uint256',
                            name: 'publicKey',
                            type: 'uint256',
                        },
                        {
                            internalType: 'uint128',
                            name: 'block',
                            type: 'uint128',
                        },
                        {
                            internalType: 'uint64',
                            name: 'timestamp',
                            type: 'uint64',
                        },
                        {
                            internalType: 'uint64',
                            name: 'keyVersion',
                            type: 'uint64',
                        },
                    ],
                    internalType: 'struct RegistryEntry',
                    name: 'entry',
                    type: 'tuple',
                },
                {
                    internalType: 'uint256',
                    name: 'contractVersion',
                    type: 'uint256',
                },
                {
                    internalType: 'address',
                    name: 'contractAddress',
                    type: 'address',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'bytes32',
                    name: 'buffer',
                    type: 'bytes32',
                },
            ],
            name: 'iToHex',
            outputs: [
                {
                    internalType: 'bytes',
                    name: '',
                    type: 'bytes',
                },
            ],
            stateMutability: 'pure',
            type: 'function',
        },
        {
            inputs: [],
            name: 'newcomerBonus',
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
            name: 'referrerBonus',
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
                    name: '_newcomerBonus',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: '_referrerBonus',
                    type: 'uint256',
                },
            ],
            name: 'setBonuses',
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
        {
            inputs: [
                {
                    internalType: 'bytes32',
                    name: 'publicKey',
                    type: 'bytes32',
                },
                {
                    internalType: 'uint8',
                    name: '_v',
                    type: 'uint8',
                },
                {
                    internalType: 'bytes32',
                    name: '_r',
                    type: 'bytes32',
                },
                {
                    internalType: 'bytes32',
                    name: '_s',
                    type: 'bytes32',
                },
            ],
            name: 'verifyMessage',
            outputs: [
                {
                    internalType: 'address',
                    name: '',
                    type: 'address',
                },
            ],
            stateMutability: 'pure',
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
    bytecode: '0x60806040526004600255600060055560006006553480156200002057600080fd5b506040516200200c3803806200200c833981810160405281019062000046919062000179565b336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555080600460006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555033600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050620001ab565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000620001418262000114565b9050919050565b620001538162000134565b81146200015f57600080fd5b50565b600081519050620001738162000148565b92915050565b6000602082840312156200019257620001916200010f565b5b6000620001a28482850162000162565b91505092915050565b611e5180620001bb6000396000f3fe608060405234801561001057600080fd5b50600436106100f55760003560e01c8063857cdbb811610097578063d3cf32df11610066578063d3cf32df14610267578063e952357914610297578063f2fde38b146102b3578063fd9c43fe146102cf576100f5565b8063857cdbb8146101dd5780638da5cb5b1461020f578063b814e8c51461022d578063ce14686d1461024b576100f5565b80633ff30264116100d35780633ff302641461013e5780634bae2ef11461016e57806354fd4d501461018c57806369f465b6146101aa576100f5565b80630c08bf88146100fa57806313e2f86a1461010457806331f5629814610120575b600080fd5b6101026102eb565b005b61011e600480360381019061011991906113d1565b61037c565b005b610128610881565b6040516101359190611496565b60405180910390f35b610158600480360381019061015391906114b1565b610887565b6040516101659190611577565b60405180910390f35b610176610a82565b6040516101839190611496565b60405180910390f35b610194610a88565b6040516101a19190611496565b60405180910390f35b6101c460048036038101906101bf91906115d7565b610a8e565b6040516101d4949392919061163e565b60405180910390f35b6101f760048036038101906101f291906115d7565b610b02565b60405161020693929190611714565b60405180910390f35b610217610d49565b604051610224919061174b565b60405180910390f35b610235610d6d565b604051610242919061174b565b60405180910390f35b61026560048036038101906102609190611766565b610d93565b005b610281600480360381019061027c91906117a6565b610f17565b60405161028e919061174b565b60405180910390f35b6102b160048036038101906102ac919061180d565b610fee565b005b6102cd60048036038101906102c891906115d7565b611058565b005b6102e960048036038101906102e491906115d7565b611128565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461034357600080fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146103d657600080fd5b8473ffffffffffffffffffffffffffffffffffffffff166103fc8560001b8a8a8a610f17565b73ffffffffffffffffffffffffffffffffffffffff1614610452576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610449906118d0565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1614806104ee57506000600360008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060010160189054906101000a900467ffffffffffffffff1667ffffffffffffffff1614155b61052d576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105249061193c565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff16141580156105ca57506000600360008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060010160189054906101000a900467ffffffffffffffff1667ffffffffffffffff16145b610609576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610600906119ce565b60405180910390fd5b6040518060800160405280858152602001436fffffffffffffffffffffffffffffffff1681526020014267ffffffffffffffff1681526020018467ffffffffffffffff16815250600360008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000820151816000015560208201518160010160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555060408201518160010160106101000a81548167ffffffffffffffff021916908367ffffffffffffffff16021790555060608201518160010160186101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055509050508473ffffffffffffffffffffffffffffffffffffffff167f3bd1fbfb1052b4dedf1d8b9fffd2ffd4624e689f83b75a192b9e824982633df485856040516107819291906119ee565b60405180910390a28080156107995750600060055414155b156107e8578473ffffffffffffffffffffffffffffffffffffffff166108fc6005549081150290604051600060405180830381858888f193505050501580156107e6573d6000803e3d6000fd5b505b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16141580156108285750600060065414155b15610877578173ffffffffffffffffffffffffffffffffffffffff166108fc6006549081150290604051600060405180830381858888f19350505050158015610875573d6000803e3d6000fd5b505b5050505050505050565b60055481565b60606000604067ffffffffffffffff8111156108a6576108a5611a17565b5b6040519080825280601f01601f1916602001820160405280156108d85781602001600182028036833780820191505090505b50905060006040518060400160405280601081526020017f3031323334353637383961626364656600000000000000000000000000000000815250905060005b60208160ff161015610a7757818251868360ff166020811061093d5761093c611a46565b5b1a60f81b60f81c60ff166109519190611ad3565b8151811061096257610961611a46565b5b602001015160f81c60f81b8360028361097b9190611b04565b60ff168151811061098f5761098e611a46565b5b60200101907effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916908160001a905350818251868360ff16602081106109d7576109d6611a46565b5b1a60f81b60f81c60ff166109eb9190611b3f565b815181106109fc576109fb611a46565b5b602001015160f81c60f81b836001600284610a179190611b04565b610a219190611b70565b60ff1681518110610a3557610a34611a46565b5b60200101907effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916908160001a9053508080610a6f90611ba7565b915050610918565b508192505050919050565b60065481565b60025481565b60036020528060005260406000206000915090508060000154908060010160009054906101000a90046fffffffffffffffffffffffffffffffff16908060010160109054906101000a900467ffffffffffffffff16908060010160189054906101000a900467ffffffffffffffff16905084565b610b0a6111f9565b6000806002549150309050600360008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020604051806080016040529081600082015481526020016001820160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff1681526020016001820160109054906101000a900467ffffffffffffffff1667ffffffffffffffff1667ffffffffffffffff1681526020016001820160189054906101000a900467ffffffffffffffff1667ffffffffffffffff1667ffffffffffffffff168152505092506000836060015167ffffffffffffffff16148015610c865750600073ffffffffffffffffffffffffffffffffffffffff16600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614155b15610d4157600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663857cdbb8856040518263ffffffff1660e01b8152600401610ce6919061174b565b60c06040518083038186803b158015610cfe57600080fd5b505afa158015610d12573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610d369190611d05565b925092509250610d42565b5b9193909250565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6040518060800160405280838152602001436fffffffffffffffffffffffffffffffff1681526020014267ffffffffffffffff1681526020018267ffffffffffffffff16815250600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000820151816000015560208201518160010160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555060408201518160010160106101000a81548167ffffffffffffffff021916908367ffffffffffffffff16021790555060608201518160010160186101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055509050503373ffffffffffffffffffffffffffffffffffffffff167f3bd1fbfb1052b4dedf1d8b9fffd2ffd4624e689f83b75a192b9e824982633df48383604051610f0b9291906119ee565b60405180910390a25050565b6000806040518060400160405280601c81526020017f19457468657265756d205369676e6564204d6573736167653a0a36340000000081525090506000610f5d87610887565b905060008282604051602001610f74929190611d94565b604051602081830303815290604052805190602001209050600060018289898960405160008152602001604052604051610fb19493929190611dd6565b6020604051602081039080840390855afa158015610fd3573d6000803e3d6000fd5b50505060206040510351905080945050505050949350505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461104657600080fd5b81600581905550806006819055505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146110b057600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff161461112557806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b50565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461118057600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16146111f65780600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b50565b60405180608001604052806000815260200160006fffffffffffffffffffffffffffffffff168152602001600067ffffffffffffffff168152602001600067ffffffffffffffff1681525090565b6000604051905090565b600080fd5b600060ff82169050919050565b61126c81611256565b811461127757600080fd5b50565b60008135905061128981611263565b92915050565b6000819050919050565b6112a28161128f565b81146112ad57600080fd5b50565b6000813590506112bf81611299565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006112f0826112c5565b9050919050565b611300816112e5565b811461130b57600080fd5b50565b60008135905061131d816112f7565b92915050565b6000819050919050565b61133681611323565b811461134157600080fd5b50565b6000813590506113538161132d565b92915050565b600067ffffffffffffffff82169050919050565b61137681611359565b811461138157600080fd5b50565b6000813590506113938161136d565b92915050565b60008115159050919050565b6113ae81611399565b81146113b957600080fd5b50565b6000813590506113cb816113a5565b92915050565b600080600080600080600080610100898b0312156113f2576113f1611251565b5b60006114008b828c0161127a565b98505060206114118b828c016112b0565b97505060406114228b828c016112b0565b96505060606114338b828c0161130e565b95505060806114448b828c01611344565b94505060a06114558b828c01611384565b93505060c06114668b828c0161130e565b92505060e06114778b828c016113bc565b9150509295985092959890939650565b61149081611323565b82525050565b60006020820190506114ab6000830184611487565b92915050565b6000602082840312156114c7576114c6611251565b5b60006114d5848285016112b0565b91505092915050565b600081519050919050565b600082825260208201905092915050565b60005b838110156115185780820151818401526020810190506114fd565b83811115611527576000848401525b50505050565b6000601f19601f8301169050919050565b6000611549826114de565b61155381856114e9565b93506115638185602086016114fa565b61156c8161152d565b840191505092915050565b60006020820190508181036000830152611591818461153e565b905092915050565b60006115a4826112c5565b9050919050565b6115b481611599565b81146115bf57600080fd5b50565b6000813590506115d1816115ab565b92915050565b6000602082840312156115ed576115ec611251565b5b60006115fb848285016115c2565b91505092915050565b60006fffffffffffffffffffffffffffffffff82169050919050565b61162981611604565b82525050565b61163881611359565b82525050565b60006080820190506116536000830187611487565b6116606020830186611620565b61166d604083018561162f565b61167a606083018461162f565b95945050505050565b61168c81611323565b82525050565b61169b81611604565b82525050565b6116aa81611359565b82525050565b6080820160008201516116c66000850182611683565b5060208201516116d96020850182611692565b5060408201516116ec60408501826116a1565b5060608201516116ff60608501826116a1565b50505050565b61170e81611599565b82525050565b600060c08201905061172960008301866116b0565b6117366080830185611487565b61174360a0830184611705565b949350505050565b60006020820190506117606000830184611705565b92915050565b6000806040838503121561177d5761177c611251565b5b600061178b85828601611344565b925050602061179c85828601611384565b9150509250929050565b600080600080608085870312156117c0576117bf611251565b5b60006117ce878288016112b0565b94505060206117df8782880161127a565b93505060406117f0878288016112b0565b9250506060611801878288016112b0565b91505092959194509250565b6000806040838503121561182457611823611251565b5b600061183285828601611344565b925050602061184385828601611344565b9150509250929050565b600082825260208201905092915050565b7f5369676e617475726520646f6573206e6f74206d61746368207468652075736560008201527f7273206164647265737300000000000000000000000000000000000000000000602082015250565b60006118ba602a8361184d565b91506118c58261185e565b604082019050919050565b600060208201905081810360008301526118e9816118ad565b9050919050565b7f5265666572726572206d75737420626520726567697374657265640000000000600082015250565b6000611926601b8361184d565b9150611931826118f0565b602082019050919050565b6000602082019050818103600083015261195581611919565b9050919050565b7f4f6e6c79206e65772075736572206b65792063616e2062652061737369676e6560008201527f642062792061646d696e00000000000000000000000000000000000000000000602082015250565b60006119b8602a8361184d565b91506119c38261195c565b604082019050919050565b600060208201905081810360008301526119e7816119ab565b9050919050565b6000604082019050611a036000830185611487565b611a10602083018461162f565b9392505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000611ade82611323565b9150611ae983611323565b925082611af957611af8611a75565b5b828204905092915050565b6000611b0f82611256565b9150611b1a83611256565b92508160ff0483118215151615611b3457611b33611aa4565b5b828202905092915050565b6000611b4a82611323565b9150611b5583611323565b925082611b6557611b64611a75565b5b828206905092915050565b6000611b7b82611256565b9150611b8683611256565b92508260ff03821115611b9c57611b9b611aa4565b5b828201905092915050565b6000611bb282611256565b915060ff821415611bc657611bc5611aa4565b5b600182019050919050565b600080fd5b611bdf8261152d565b810181811067ffffffffffffffff82111715611bfe57611bfd611a17565b5b80604052505050565b6000611c11611247565b9050611c1d8282611bd6565b919050565b600081519050611c318161132d565b92915050565b611c4081611604565b8114611c4b57600080fd5b50565b600081519050611c5d81611c37565b92915050565b600081519050611c728161136d565b92915050565b600060808284031215611c8e57611c8d611bd1565b5b611c986080611c07565b90506000611ca884828501611c22565b6000830152506020611cbc84828501611c4e565b6020830152506040611cd084828501611c63565b6040830152506060611ce484828501611c63565b60608301525092915050565b600081519050611cff816115ab565b92915050565b600080600060c08486031215611d1e57611d1d611251565b5b6000611d2c86828701611c78565b9350506080611d3d86828701611c22565b92505060a0611d4e86828701611cf0565b9150509250925092565b600081905092915050565b6000611d6e826114de565b611d788185611d58565b9350611d888185602086016114fa565b80840191505092915050565b6000611da08285611d63565b9150611dac8284611d63565b91508190509392505050565b611dc18161128f565b82525050565b611dd081611256565b82525050565b6000608082019050611deb6000830187611db8565b611df86020830186611dc7565b611e056040830185611db8565b611e126060830184611db8565b9594505050505056fea26469706673582212204be5490ac6f5be8300215dee6be4ccf757076af31d1d34a856a3f7ccf564c55364736f6c63430008090033',
    deployedBytecode: '0x608060405234801561001057600080fd5b50600436106100f55760003560e01c8063857cdbb811610097578063d3cf32df11610066578063d3cf32df14610267578063e952357914610297578063f2fde38b146102b3578063fd9c43fe146102cf576100f5565b8063857cdbb8146101dd5780638da5cb5b1461020f578063b814e8c51461022d578063ce14686d1461024b576100f5565b80633ff30264116100d35780633ff302641461013e5780634bae2ef11461016e57806354fd4d501461018c57806369f465b6146101aa576100f5565b80630c08bf88146100fa57806313e2f86a1461010457806331f5629814610120575b600080fd5b6101026102eb565b005b61011e600480360381019061011991906113d1565b61037c565b005b610128610881565b6040516101359190611496565b60405180910390f35b610158600480360381019061015391906114b1565b610887565b6040516101659190611577565b60405180910390f35b610176610a82565b6040516101839190611496565b60405180910390f35b610194610a88565b6040516101a19190611496565b60405180910390f35b6101c460048036038101906101bf91906115d7565b610a8e565b6040516101d4949392919061163e565b60405180910390f35b6101f760048036038101906101f291906115d7565b610b02565b60405161020693929190611714565b60405180910390f35b610217610d49565b604051610224919061174b565b60405180910390f35b610235610d6d565b604051610242919061174b565b60405180910390f35b61026560048036038101906102609190611766565b610d93565b005b610281600480360381019061027c91906117a6565b610f17565b60405161028e919061174b565b60405180910390f35b6102b160048036038101906102ac919061180d565b610fee565b005b6102cd60048036038101906102c891906115d7565b611058565b005b6102e960048036038101906102e491906115d7565b611128565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461034357600080fd5b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16ff5b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146103d657600080fd5b8473ffffffffffffffffffffffffffffffffffffffff166103fc8560001b8a8a8a610f17565b73ffffffffffffffffffffffffffffffffffffffff1614610452576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610449906118d0565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff1614806104ee57506000600360008473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060010160189054906101000a900467ffffffffffffffff1667ffffffffffffffff1614155b61052d576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016105249061193c565b60405180910390fd5b600073ffffffffffffffffffffffffffffffffffffffff168573ffffffffffffffffffffffffffffffffffffffff16141580156105ca57506000600360008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200190815260200160002060010160189054906101000a900467ffffffffffffffff1667ffffffffffffffff16145b610609576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610600906119ce565b60405180910390fd5b6040518060800160405280858152602001436fffffffffffffffffffffffffffffffff1681526020014267ffffffffffffffff1681526020018467ffffffffffffffff16815250600360008773ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000820151816000015560208201518160010160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555060408201518160010160106101000a81548167ffffffffffffffff021916908367ffffffffffffffff16021790555060608201518160010160186101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055509050508473ffffffffffffffffffffffffffffffffffffffff167f3bd1fbfb1052b4dedf1d8b9fffd2ffd4624e689f83b75a192b9e824982633df485856040516107819291906119ee565b60405180910390a28080156107995750600060055414155b156107e8578473ffffffffffffffffffffffffffffffffffffffff166108fc6005549081150290604051600060405180830381858888f193505050501580156107e6573d6000803e3d6000fd5b505b600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff16141580156108285750600060065414155b15610877578173ffffffffffffffffffffffffffffffffffffffff166108fc6006549081150290604051600060405180830381858888f19350505050158015610875573d6000803e3d6000fd5b505b5050505050505050565b60055481565b60606000604067ffffffffffffffff8111156108a6576108a5611a17565b5b6040519080825280601f01601f1916602001820160405280156108d85781602001600182028036833780820191505090505b50905060006040518060400160405280601081526020017f3031323334353637383961626364656600000000000000000000000000000000815250905060005b60208160ff161015610a7757818251868360ff166020811061093d5761093c611a46565b5b1a60f81b60f81c60ff166109519190611ad3565b8151811061096257610961611a46565b5b602001015160f81c60f81b8360028361097b9190611b04565b60ff168151811061098f5761098e611a46565b5b60200101907effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916908160001a905350818251868360ff16602081106109d7576109d6611a46565b5b1a60f81b60f81c60ff166109eb9190611b3f565b815181106109fc576109fb611a46565b5b602001015160f81c60f81b836001600284610a179190611b04565b610a219190611b70565b60ff1681518110610a3557610a34611a46565b5b60200101907effffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1916908160001a9053508080610a6f90611ba7565b915050610918565b508192505050919050565b60065481565b60025481565b60036020528060005260406000206000915090508060000154908060010160009054906101000a90046fffffffffffffffffffffffffffffffff16908060010160109054906101000a900467ffffffffffffffff16908060010160189054906101000a900467ffffffffffffffff16905084565b610b0a6111f9565b6000806002549150309050600360008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020604051806080016040529081600082015481526020016001820160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff1681526020016001820160109054906101000a900467ffffffffffffffff1667ffffffffffffffff1667ffffffffffffffff1681526020016001820160189054906101000a900467ffffffffffffffff1667ffffffffffffffff1667ffffffffffffffff168152505092506000836060015167ffffffffffffffff16148015610c865750600073ffffffffffffffffffffffffffffffffffffffff16600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614155b15610d4157600460009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663857cdbb8856040518263ffffffff1660e01b8152600401610ce6919061174b565b60c06040518083038186803b158015610cfe57600080fd5b505afa158015610d12573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610d369190611d05565b925092509250610d42565b5b9193909250565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6040518060800160405280838152602001436fffffffffffffffffffffffffffffffff1681526020014267ffffffffffffffff1681526020018267ffffffffffffffff16815250600360003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000820151816000015560208201518160010160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555060408201518160010160106101000a81548167ffffffffffffffff021916908367ffffffffffffffff16021790555060608201518160010160186101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055509050503373ffffffffffffffffffffffffffffffffffffffff167f3bd1fbfb1052b4dedf1d8b9fffd2ffd4624e689f83b75a192b9e824982633df48383604051610f0b9291906119ee565b60405180910390a25050565b6000806040518060400160405280601c81526020017f19457468657265756d205369676e6564204d6573736167653a0a36340000000081525090506000610f5d87610887565b905060008282604051602001610f74929190611d94565b604051602081830303815290604052805190602001209050600060018289898960405160008152602001604052604051610fb19493929190611dd6565b6020604051602081039080840390855afa158015610fd3573d6000803e3d6000fd5b50505060206040510351905080945050505050949350505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461104657600080fd5b81600581905550806006819055505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146110b057600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff161461112557806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b50565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff161461118057600080fd5b600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff16146111f65780600160006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505b50565b60405180608001604052806000815260200160006fffffffffffffffffffffffffffffffff168152602001600067ffffffffffffffff168152602001600067ffffffffffffffff1681525090565b6000604051905090565b600080fd5b600060ff82169050919050565b61126c81611256565b811461127757600080fd5b50565b60008135905061128981611263565b92915050565b6000819050919050565b6112a28161128f565b81146112ad57600080fd5b50565b6000813590506112bf81611299565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006112f0826112c5565b9050919050565b611300816112e5565b811461130b57600080fd5b50565b60008135905061131d816112f7565b92915050565b6000819050919050565b61133681611323565b811461134157600080fd5b50565b6000813590506113538161132d565b92915050565b600067ffffffffffffffff82169050919050565b61137681611359565b811461138157600080fd5b50565b6000813590506113938161136d565b92915050565b60008115159050919050565b6113ae81611399565b81146113b957600080fd5b50565b6000813590506113cb816113a5565b92915050565b600080600080600080600080610100898b0312156113f2576113f1611251565b5b60006114008b828c0161127a565b98505060206114118b828c016112b0565b97505060406114228b828c016112b0565b96505060606114338b828c0161130e565b95505060806114448b828c01611344565b94505060a06114558b828c01611384565b93505060c06114668b828c0161130e565b92505060e06114778b828c016113bc565b9150509295985092959890939650565b61149081611323565b82525050565b60006020820190506114ab6000830184611487565b92915050565b6000602082840312156114c7576114c6611251565b5b60006114d5848285016112b0565b91505092915050565b600081519050919050565b600082825260208201905092915050565b60005b838110156115185780820151818401526020810190506114fd565b83811115611527576000848401525b50505050565b6000601f19601f8301169050919050565b6000611549826114de565b61155381856114e9565b93506115638185602086016114fa565b61156c8161152d565b840191505092915050565b60006020820190508181036000830152611591818461153e565b905092915050565b60006115a4826112c5565b9050919050565b6115b481611599565b81146115bf57600080fd5b50565b6000813590506115d1816115ab565b92915050565b6000602082840312156115ed576115ec611251565b5b60006115fb848285016115c2565b91505092915050565b60006fffffffffffffffffffffffffffffffff82169050919050565b61162981611604565b82525050565b61163881611359565b82525050565b60006080820190506116536000830187611487565b6116606020830186611620565b61166d604083018561162f565b61167a606083018461162f565b95945050505050565b61168c81611323565b82525050565b61169b81611604565b82525050565b6116aa81611359565b82525050565b6080820160008201516116c66000850182611683565b5060208201516116d96020850182611692565b5060408201516116ec60408501826116a1565b5060608201516116ff60608501826116a1565b50505050565b61170e81611599565b82525050565b600060c08201905061172960008301866116b0565b6117366080830185611487565b61174360a0830184611705565b949350505050565b60006020820190506117606000830184611705565b92915050565b6000806040838503121561177d5761177c611251565b5b600061178b85828601611344565b925050602061179c85828601611384565b9150509250929050565b600080600080608085870312156117c0576117bf611251565b5b60006117ce878288016112b0565b94505060206117df8782880161127a565b93505060406117f0878288016112b0565b9250506060611801878288016112b0565b91505092959194509250565b6000806040838503121561182457611823611251565b5b600061183285828601611344565b925050602061184385828601611344565b9150509250929050565b600082825260208201905092915050565b7f5369676e617475726520646f6573206e6f74206d61746368207468652075736560008201527f7273206164647265737300000000000000000000000000000000000000000000602082015250565b60006118ba602a8361184d565b91506118c58261185e565b604082019050919050565b600060208201905081810360008301526118e9816118ad565b9050919050565b7f5265666572726572206d75737420626520726567697374657265640000000000600082015250565b6000611926601b8361184d565b9150611931826118f0565b602082019050919050565b6000602082019050818103600083015261195581611919565b9050919050565b7f4f6e6c79206e65772075736572206b65792063616e2062652061737369676e6560008201527f642062792061646d696e00000000000000000000000000000000000000000000602082015250565b60006119b8602a8361184d565b91506119c38261195c565b604082019050919050565b600060208201905081810360008301526119e7816119ab565b9050919050565b6000604082019050611a036000830185611487565b611a10602083018461162f565b9392505050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052603260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000611ade82611323565b9150611ae983611323565b925082611af957611af8611a75565b5b828204905092915050565b6000611b0f82611256565b9150611b1a83611256565b92508160ff0483118215151615611b3457611b33611aa4565b5b828202905092915050565b6000611b4a82611323565b9150611b5583611323565b925082611b6557611b64611a75565b5b828206905092915050565b6000611b7b82611256565b9150611b8683611256565b92508260ff03821115611b9c57611b9b611aa4565b5b828201905092915050565b6000611bb282611256565b915060ff821415611bc657611bc5611aa4565b5b600182019050919050565b600080fd5b611bdf8261152d565b810181811067ffffffffffffffff82111715611bfe57611bfd611a17565b5b80604052505050565b6000611c11611247565b9050611c1d8282611bd6565b919050565b600081519050611c318161132d565b92915050565b611c4081611604565b8114611c4b57600080fd5b50565b600081519050611c5d81611c37565b92915050565b600081519050611c728161136d565b92915050565b600060808284031215611c8e57611c8d611bd1565b5b611c986080611c07565b90506000611ca884828501611c22565b6000830152506020611cbc84828501611c4e565b6020830152506040611cd084828501611c63565b6040830152506060611ce484828501611c63565b60608301525092915050565b600081519050611cff816115ab565b92915050565b600080600060c08486031215611d1e57611d1d611251565b5b6000611d2c86828701611c78565b9350506080611d3d86828701611c22565b92505060a0611d4e86828701611cf0565b9150509250925092565b600081905092915050565b6000611d6e826114de565b611d788185611d58565b9350611d888185602086016114fa565b80840191505092915050565b6000611da08285611d63565b9150611dac8284611d63565b91508190509392505050565b611dc18161128f565b82525050565b611dd081611256565b82525050565b6000608082019050611deb6000830187611db8565b611df86020830186611dc7565b611e056040830185611db8565b611e126060830184611db8565b9594505050505056fea26469706673582212204be5490ac6f5be8300215dee6be4ccf757076af31d1d34a856a3f7ccf564c55364736f6c63430008090033',
    linkReferences: {},
    deployedLinkReferences: {},
};
//# sourceMappingURL=RegistryContract.js.map