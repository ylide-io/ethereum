import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'ethers';
import { EthereumBlockchainController, EthereumWalletController } from '../controllers';
import {
	EVMContracts,
	EVMMailerContractType,
	EVMNetwork,
	EVMRegistryContractType,
	EVMYlidePayContractType,
} from './types';

export const getEvmContractsTest = (
	mailer: {
		address: string;
		type: EVMMailerContractType;
	},
	payer: {
		address: string;
		type: EVMYlidePayContractType;
	},
	registry: {
		address: string;
		type: EVMRegistryContractType;
	},
) => {
	const payLink = {
		id: 3,
		address: payer.address,
		type: payer.type,
		verified: false,
		creationBlock: 2,
	};
	const mailerLink = {
		id: 1,
		address: mailer.address,
		type: mailer.type,
		verified: false,
		creationBlock: 1,
		pay: payLink,
	};
	const registryLink = {
		id: 2,
		address: registry.address,
		type: registry.type,
		verified: false,
		creationBlock: 1,
	};
	return {
		[EVMNetwork.LOCAL_HARDHAT]: {
			mailerContracts: [mailerLink],
			payContracts: [payLink],
			registryContracts: [registryLink],
			currentMailerId: mailerLink.id,
			currentRegistryId: registryLink.id,
		},
	} as unknown as EVMContracts;
};

export const getBlockchainController = (provider: ethers.providers.Provider, evmContractsTest: EVMContracts) => {
	return new EthereumBlockchainController({
		network: EVMNetwork.LOCAL_HARDHAT,
		rpcs: [
			{
				chainId: 31337,
				blockLimit: 100,
				rpcUrlOrProvider: provider,
			},
		],
		evmContractsTest,
	});
};

export const getWalletController = (
	signer: ethers.providers.JsonRpcSigner | SignerWithAddress,
	provider: ethers.providers.Provider,
	evmContractsTest: EVMContracts,
) => {
	return new EthereumWalletController({
		wallet: 'wallet',
		signer: signer as unknown as ethers.providers.JsonRpcSigner,
		onNetworkSwitchRequest: async (
			reason: string,
			currentNetwork: EVMNetwork | undefined,
			needNetwork: EVMNetwork,
			needChainId: number,
		) => {
			console.log('onNetworkSwitchRequest');
		},
		providerObject: provider,
		evmContractsTest,
	});
};
