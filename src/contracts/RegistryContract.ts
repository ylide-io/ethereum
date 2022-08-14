import { Uint256 } from '@ylide/sdk';
import SmartBuffer from '@ylide/smart-buffer';
import { Contract, EventData } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import { EthereumBlockchainController } from '../controllers';
import { publicKeyToBigIntString } from '../misc';

export class RegistryContract {
	private readonly contractAddress: string;
	readonly contract: Contract;

	constructor(private readonly blockchainController: EthereumBlockchainController, contractAddress: string) {
		this.contractAddress = contractAddress;
		this.contract = new this.blockchainController.writeWeb3.eth.Contract(
			REGISTRY_ABI.abi as AbiItem[],
			this.contractAddress,
		);
	}

	async estimateAndCall(address: string, method: string, args: any[]) {
		const data = this.blockchainController.writeWeb3.eth.abi.encodeFunctionCall(
			(REGISTRY_ABI.abi as AbiItem[]).find(t => t.name === method)!,
			args,
		);
		const gasPrice = await this.blockchainController.writeWeb3.eth.getGasPrice();
		const gas = await this.blockchainController.writeWeb3.eth.estimateGas({
			to: this.contract.options.address,
			data,
		});
		return await this.contract.methods[method](...args).send({ from: address, gas, gasPrice });
	}

	async getAddressByPublicKey(publicKey: Uint8Array): Promise<string | null> {
		// const messages = await this.blockchainController.gqlQueryMessages(
		// 	getContractMessagesQuery(this.publicKeyToAddress(publicKey), this.contractAddress),
		// );
		// if (messages.length) {
		// 	return this.decodePublicKeyToAddressMessageBody(messages[0].body);
		// } else {
		return null;
		// }
	}

	async getPublicKeyByAddress(address: string): Promise<Uint8Array | null> {
		const events = await this.contract.getPastEvents('AddressToPublicKey', {
			filter: {
				addr: address,
			},
			fromBlock: 0,
			toBlock: 'latest',
		});
		if (events.length) {
			return this.decodeAddressToPublicKeyMessageBody(events[events.length - 1]);
		} else {
			return null;
		}
	}

	async attachPublicKey(address: string, publicKey: Uint8Array): Promise<boolean> {
		await this.estimateAndCall(address, 'attachPublicKey', [publicKeyToBigIntString(publicKey)]);
		return true;
	}

	async attachAddress(address: string, publicKey: Uint8Array): Promise<boolean> {
		await this.estimateAndCall(address, 'attachAddress', [publicKeyToBigIntString(publicKey)]);
		return true;
	}

	private decodePublicKeyToAddressMessageBody(ev: EventData): string {
		const { addr } = ev.returnValues;
		return addr;
	}

	private decodeAddressToPublicKeyMessageBody(ev: EventData): Uint8Array {
		const { publicKey } = ev.returnValues;
		return SmartBuffer.ofHexString(BigInt(publicKey).toString(16).padStart(64, '0')).bytes;
	}
}

const REGISTRY_ABI = {
	_format: 'hh-sol-artifact-1',
	contractName: 'YlideRegistryV1',
	sourceName: 'contracts/YlideRegistryV1.sol',
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
					name: 'addr',
					type: 'address',
				},
				{
					indexed: false,
					internalType: 'uint256',
					name: 'publicKey',
					type: 'uint256',
				},
			],
			name: 'AddressToPublicKey',
			type: 'event',
		},
		{
			anonymous: false,
			inputs: [
				{
					indexed: true,
					internalType: 'uint256',
					name: 'publicKey',
					type: 'uint256',
				},
				{
					indexed: false,
					internalType: 'address',
					name: 'addr',
					type: 'address',
				},
			],
			name: 'PublicKeyToAddress',
			type: 'event',
		},
		{
			inputs: [
				{
					internalType: 'uint256',
					name: 'publicKey',
					type: 'uint256',
				},
			],
			name: 'attachAddress',
			outputs: [],
			stateMutability: 'nonpayable',
			type: 'function',
		},
		{
			inputs: [
				{
					internalType: 'uint256',
					name: 'publicKey',
					type: 'uint256',
				},
			],
			name: 'attachPublicKey',
			outputs: [],
			stateMutability: 'nonpayable',
			type: 'function',
		},
	],
	bytecode:
		'0x608060405234801561001057600080fd5b50610223806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80632bdf8f681461003b578063bd672d1514610057575b600080fd5b6100556004803603810190610050919061013a565b610073565b005b610071600480360381019061006c919061013a565b6100c4565b005b3373ffffffffffffffffffffffffffffffffffffffff167f3fb5d86f1a84499e73ea94b123d98ab2e39807af01937208e404e14448b2c9df826040516100b99190610176565b60405180910390a250565b807f05c98cadc254df6236cdf4d65b2c11dc30599c026068003ec3b694b76e0b30b2336040516100f491906101d2565b60405180910390a250565b600080fd5b6000819050919050565b61011781610104565b811461012257600080fd5b50565b6000813590506101348161010e565b92915050565b6000602082840312156101505761014f6100ff565b5b600061015e84828501610125565b91505092915050565b61017081610104565b82525050565b600060208201905061018b6000830184610167565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006101bc82610191565b9050919050565b6101cc816101b1565b82525050565b60006020820190506101e760008301846101c3565b9291505056fea26469706673582212205f4e14425717baab29baa0d70d8efd137e70bc0084ed1f3697220f6e9c16173664736f6c63430008090033',
	deployedBytecode:
		'0x608060405234801561001057600080fd5b50600436106100365760003560e01c80632bdf8f681461003b578063bd672d1514610057575b600080fd5b6100556004803603810190610050919061013a565b610073565b005b610071600480360381019061006c919061013a565b6100c4565b005b3373ffffffffffffffffffffffffffffffffffffffff167f3fb5d86f1a84499e73ea94b123d98ab2e39807af01937208e404e14448b2c9df826040516100b99190610176565b60405180910390a250565b807f05c98cadc254df6236cdf4d65b2c11dc30599c026068003ec3b694b76e0b30b2336040516100f491906101d2565b60405180910390a250565b600080fd5b6000819050919050565b61011781610104565b811461012257600080fd5b50565b6000813590506101348161010e565b92915050565b6000602082840312156101505761014f6100ff565b5b600061015e84828501610125565b91505092915050565b61017081610104565b82525050565b600060208201905061018b6000830184610167565b92915050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006101bc82610191565b9050919050565b6101cc816101b1565b82525050565b60006020820190506101e760008301846101c3565b9291505056fea26469706673582212205f4e14425717baab29baa0d70d8efd137e70bc0084ed1f3697220f6e9c16173664736f6c63430008090033',
	linkReferences: {},
	deployedLinkReferences: {},
};
