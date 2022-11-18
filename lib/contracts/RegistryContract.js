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
            data,
        });
        return await this.contract.methods[method](...args).send({ from: address, gas, gasPrice });
    }
    async attachPublicKey(address, publicKey, keyVersion) {
        await this.estimateAndCall(address, 'attachPublicKey', [(0, misc_1.publicKeyToBigIntString)(publicKey), keyVersion]);
        return true;
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
    contractName: 'YlideRegistryV3',
    sourceName: 'contracts/YlideRegistryV3.sol',
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
    bytecode: '0x6080604052600360005534801561001557600080fd5b50604051610ba2380380610ba2833981810160405281019061003791906100e1565b80600260006101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505061010e565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006100ae82610083565b9050919050565b6100be816100a3565b81146100c957600080fd5b50565b6000815190506100db816100b5565b92915050565b6000602082840312156100f7576100f661007e565b5b6000610105848285016100cc565b91505092915050565b610a858061011d6000396000f3fe608060405234801561001057600080fd5b506004361061004c5760003560e01c806354fd4d501461005157806369f465b61461006f578063857cdbb8146100a2578063ce14686d146100d4575b600080fd5b6100596100f0565b604051610066919061059c565b60405180910390f35b61008960048036038101906100849190610624565b6100f6565b604051610099949392919061069f565b60405180910390f35b6100bc60048036038101906100b79190610624565b61016a565b6040516100cb93929190610775565b60405180910390f35b6100ee60048036038101906100e99190610804565b6103b1565b005b60005481565b60016020528060005260406000206000915090508060000154908060010160009054906101000a90046fffffffffffffffffffffffffffffffff16908060010160109054906101000a900467ffffffffffffffff16908060010160189054906101000a900467ffffffffffffffff16905084565b610172610535565b6000806000549150309050600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020604051806080016040529081600082015481526020016001820160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff1681526020016001820160109054906101000a900467ffffffffffffffff1667ffffffffffffffff1667ffffffffffffffff1681526020016001820160189054906101000a900467ffffffffffffffff1667ffffffffffffffff1667ffffffffffffffff168152505092506000836060015167ffffffffffffffff161480156102ee5750600073ffffffffffffffffffffffffffffffffffffffff16600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614155b156103a957600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663857cdbb8856040518263ffffffff1660e01b815260040161034e9190610844565b60c06040518083038186803b15801561036657600080fd5b505afa15801561037a573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061039e91906109d3565b9250925092506103aa565b5b9193909250565b6040518060800160405280838152602001436fffffffffffffffffffffffffffffffff1681526020014267ffffffffffffffff1681526020018267ffffffffffffffff16815250600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000820151816000015560208201518160010160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555060408201518160010160106101000a81548167ffffffffffffffff021916908367ffffffffffffffff16021790555060608201518160010160186101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055509050503373ffffffffffffffffffffffffffffffffffffffff167f3bd1fbfb1052b4dedf1d8b9fffd2ffd4624e689f83b75a192b9e824982633df48383604051610529929190610a26565b60405180910390a25050565b60405180608001604052806000815260200160006fffffffffffffffffffffffffffffffff168152602001600067ffffffffffffffff168152602001600067ffffffffffffffff1681525090565b6000819050919050565b61059681610583565b82525050565b60006020820190506105b1600083018461058d565b92915050565b6000604051905090565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006105f1826105c6565b9050919050565b610601816105e6565b811461060c57600080fd5b50565b60008135905061061e816105f8565b92915050565b60006020828403121561063a576106396105c1565b5b60006106488482850161060f565b91505092915050565b60006fffffffffffffffffffffffffffffffff82169050919050565b61067681610651565b82525050565b600067ffffffffffffffff82169050919050565b6106998161067c565b82525050565b60006080820190506106b4600083018761058d565b6106c1602083018661066d565b6106ce6040830185610690565b6106db6060830184610690565b95945050505050565b6106ed81610583565b82525050565b6106fc81610651565b82525050565b61070b8161067c565b82525050565b60808201600082015161072760008501826106e4565b50602082015161073a60208501826106f3565b50604082015161074d6040850182610702565b5060608201516107606060850182610702565b50505050565b61076f816105e6565b82525050565b600060c08201905061078a6000830186610711565b610797608083018561058d565b6107a460a0830184610766565b949350505050565b6107b581610583565b81146107c057600080fd5b50565b6000813590506107d2816107ac565b92915050565b6107e18161067c565b81146107ec57600080fd5b50565b6000813590506107fe816107d8565b92915050565b6000806040838503121561081b5761081a6105c1565b5b6000610829858286016107c3565b925050602061083a858286016107ef565b9150509250929050565b60006020820190506108596000830184610766565b92915050565b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6108ad82610864565b810181811067ffffffffffffffff821117156108cc576108cb610875565b5b80604052505050565b60006108df6105b7565b90506108eb82826108a4565b919050565b6000815190506108ff816107ac565b92915050565b61090e81610651565b811461091957600080fd5b50565b60008151905061092b81610905565b92915050565b600081519050610940816107d8565b92915050565b60006080828403121561095c5761095b61085f565b5b61096660806108d5565b90506000610976848285016108f0565b600083015250602061098a8482850161091c565b602083015250604061099e84828501610931565b60408301525060606109b284828501610931565b60608301525092915050565b6000815190506109cd816105f8565b92915050565b600080600060c084860312156109ec576109eb6105c1565b5b60006109fa86828701610946565b9350506080610a0b868287016108f0565b92505060a0610a1c868287016109be565b9150509250925092565b6000604082019050610a3b600083018561058d565b610a486020830184610690565b939250505056fea26469706673582212208412ba6104e4ad9e2ee57db3e7f945e79836f542403b180a020ba5f767135ddd64736f6c63430008090033',
    deployedBytecode: '0x608060405234801561001057600080fd5b506004361061004c5760003560e01c806354fd4d501461005157806369f465b61461006f578063857cdbb8146100a2578063ce14686d146100d4575b600080fd5b6100596100f0565b604051610066919061059c565b60405180910390f35b61008960048036038101906100849190610624565b6100f6565b604051610099949392919061069f565b60405180910390f35b6100bc60048036038101906100b79190610624565b61016a565b6040516100cb93929190610775565b60405180910390f35b6100ee60048036038101906100e99190610804565b6103b1565b005b60005481565b60016020528060005260406000206000915090508060000154908060010160009054906101000a90046fffffffffffffffffffffffffffffffff16908060010160109054906101000a900467ffffffffffffffff16908060010160189054906101000a900467ffffffffffffffff16905084565b610172610535565b6000806000549150309050600160008573ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff168152602001908152602001600020604051806080016040529081600082015481526020016001820160009054906101000a90046fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff166fffffffffffffffffffffffffffffffff1681526020016001820160109054906101000a900467ffffffffffffffff1667ffffffffffffffff1667ffffffffffffffff1681526020016001820160189054906101000a900467ffffffffffffffff1667ffffffffffffffff1667ffffffffffffffff168152505092506000836060015167ffffffffffffffff161480156102ee5750600073ffffffffffffffffffffffffffffffffffffffff16600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1614155b156103a957600260009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663857cdbb8856040518263ffffffff1660e01b815260040161034e9190610844565b60c06040518083038186803b15801561036657600080fd5b505afa15801561037a573d6000803e3d6000fd5b505050506040513d601f19601f8201168201806040525081019061039e91906109d3565b9250925092506103aa565b5b9193909250565b6040518060800160405280838152602001436fffffffffffffffffffffffffffffffff1681526020014267ffffffffffffffff1681526020018267ffffffffffffffff16815250600160003373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020019081526020016000206000820151816000015560208201518160010160006101000a8154816fffffffffffffffffffffffffffffffff02191690836fffffffffffffffffffffffffffffffff16021790555060408201518160010160106101000a81548167ffffffffffffffff021916908367ffffffffffffffff16021790555060608201518160010160186101000a81548167ffffffffffffffff021916908367ffffffffffffffff1602179055509050503373ffffffffffffffffffffffffffffffffffffffff167f3bd1fbfb1052b4dedf1d8b9fffd2ffd4624e689f83b75a192b9e824982633df48383604051610529929190610a26565b60405180910390a25050565b60405180608001604052806000815260200160006fffffffffffffffffffffffffffffffff168152602001600067ffffffffffffffff168152602001600067ffffffffffffffff1681525090565b6000819050919050565b61059681610583565b82525050565b60006020820190506105b1600083018461058d565b92915050565b6000604051905090565b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006105f1826105c6565b9050919050565b610601816105e6565b811461060c57600080fd5b50565b60008135905061061e816105f8565b92915050565b60006020828403121561063a576106396105c1565b5b60006106488482850161060f565b91505092915050565b60006fffffffffffffffffffffffffffffffff82169050919050565b61067681610651565b82525050565b600067ffffffffffffffff82169050919050565b6106998161067c565b82525050565b60006080820190506106b4600083018761058d565b6106c1602083018661066d565b6106ce6040830185610690565b6106db6060830184610690565b95945050505050565b6106ed81610583565b82525050565b6106fc81610651565b82525050565b61070b8161067c565b82525050565b60808201600082015161072760008501826106e4565b50602082015161073a60208501826106f3565b50604082015161074d6040850182610702565b5060608201516107606060850182610702565b50505050565b61076f816105e6565b82525050565b600060c08201905061078a6000830186610711565b610797608083018561058d565b6107a460a0830184610766565b949350505050565b6107b581610583565b81146107c057600080fd5b50565b6000813590506107d2816107ac565b92915050565b6107e18161067c565b81146107ec57600080fd5b50565b6000813590506107fe816107d8565b92915050565b6000806040838503121561081b5761081a6105c1565b5b6000610829858286016107c3565b925050602061083a858286016107ef565b9150509250929050565b60006020820190506108596000830184610766565b92915050565b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6108ad82610864565b810181811067ffffffffffffffff821117156108cc576108cb610875565b5b80604052505050565b60006108df6105b7565b90506108eb82826108a4565b919050565b6000815190506108ff816107ac565b92915050565b61090e81610651565b811461091957600080fd5b50565b60008151905061092b81610905565b92915050565b600081519050610940816107d8565b92915050565b60006080828403121561095c5761095b61085f565b5b61096660806108d5565b90506000610976848285016108f0565b600083015250602061098a8482850161091c565b602083015250604061099e84828501610931565b60408301525060606109b284828501610931565b60608301525092915050565b6000815190506109cd816105f8565b92915050565b600080600060c084860312156109ec576109eb6105c1565b5b60006109fa86828701610946565b9350506080610a0b868287016108f0565b92505060a0610a1c868287016109be565b9150509250925092565b6000604082019050610a3b600083018561058d565b610a486020830184610690565b939250505056fea26469706673582212208412ba6104e4ad9e2ee57db3e7f945e79836f542403b180a020ba5f767135ddd64736f6c63430008090033',
    linkReferences: {},
    deployedLinkReferences: {},
};
//# sourceMappingURL=RegistryContract.js.map