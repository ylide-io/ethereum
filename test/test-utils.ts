import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'ethers';
import { ethers as hEthers } from 'hardhat';
import { EthereumBlockchainController, EthereumWalletController } from '../src/controllers';
import {
	EVMContracts,
	EVMMailerContractType,
	EVMNetwork,
	EVMRegistryContractType,
	EVMYlidePayContractType,
	EVMYlideSafeContractType,
} from '../src/misc/types';

export const getEvmContractsTest = ({
	mailer,
	payer,
	registry,
	safe,
}: {
	mailer: {
		address: string;
		type: EVMMailerContractType;
	};
	payer?: {
		address: string;
		type: EVMYlidePayContractType;
	};
	registry: {
		address: string;
		type: EVMRegistryContractType;
	};
	safe?: {
		address: string;
		type: EVMYlideSafeContractType;
	};
}): EVMContracts => {
	const payLink = payer
		? {
				id: 3,
				address: payer.address,
				type: payer.type,
				verified: false,
				creationBlock: 2,
		  }
		: undefined;
	const safeLink = safe
		? {
				id: 4,
				address: safe.address,
				type: safe.type,
				verified: false,
				creationBlock: 4,
		  }
		: undefined;
	const mailerLink = {
		id: 1,
		address: mailer.address,
		type: mailer.type,
		verified: false,
		creationBlock: 1,
		pay: payLink,
		safe: safeLink,
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
			payContracts: payLink ? [payLink] : [],
			registryContracts: [registryLink],
			safeContracts: safeLink ? [safeLink] : [],
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

export const getWalletController = async (
	signer: ethers.providers.JsonRpcSigner | SignerWithAddress,
	provider: ethers.providers.Provider,
	evmContractsTest: EVMContracts,
) => {
	const controller = new EthereumWalletController({
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
	await controller.init();
	return controller;
};

export const currentTimestamp = () =>
	hEthers.provider.getBlock(hEthers.provider.getBlockNumber()).then(block => block.timestamp);
