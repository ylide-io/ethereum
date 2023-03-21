import { EVMNetwork, IEVMNetworkContracts, EVMRegistryContractType, EVMMailerContractType } from './types';

// last contract id: 57, next id is 58
export const EVM_CONTRACTS: Record<EVMNetwork, IEVMNetworkContracts> = {
	[EVMNetwork.LOCAL_HARDHAT]: {
		registryContracts: [
			{
				id: 1,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xB7f8BC63BbcaD18155201308C8f3540b07f84F5e',
				creationBlock: 1,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 2,
				type: EVMMailerContractType.EVMMailerV8,
				address: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0',
				creationBlock: 1,
				verified: true,
			},
		],
		currentRegistryId: 1,
		currentMailerId: 2,
	},
	[EVMNetwork.ETHEREUM]: {
		registryContracts: [
			{
				id: 3,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xe90f1cd859a309dddbbf1ba4999bb911823ea0db',
				creationBlock: 15841992,
				verified: false,
			},
		],
		mailerContracts: [
			{
				id: 4,
				type: EVMMailerContractType.EVMMailerV6,
				address: '0x003c0ac0e7fff5452fb7de73925ce18f91660532',
				creationBlock: 15883991,
				verified: false,
			},
		],
		currentRegistryId: 3,
		currentMailerId: 4,
	},
	[EVMNetwork.BNBCHAIN]: {
		registryContracts: [
			{
				id: 5,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0x8c030408e3c873282b57033fee38685f74e0ceff',
				creationBlock: 22544208,
				verified: false,
			},
			{
				id: 49,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xda1fa95a630ba2ef6d96f15c9eb721af0f64914e',
				creationBlock: 26646304,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 6,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0x28d9bb1aed64c115dd70e886c546ee0420623bc2',
				creationBlock: 23930418,
				verified: false,
			},
		],
		currentRegistryId: 49,
		currentMailerId: 6,
	},
	[EVMNetwork.POLYGON]: {
		registryContracts: [
			{
				id: 7,
				type: EVMRegistryContractType.EVMRegistryV5,
				address: '0x7a68e6ddc82ee745cebac93aece15af57e5931e5',
				creationBlock: 37717312,
				verified: true,
			},
			{
				id: 37,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xff0e2f4c0351f78dcb5d05ba485aec76a1d0a851',
				creationBlock: 34868841,
				verified: false,
			},
			{
				id: 46,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xc6235283cf30d30a7c1b8860e3a8bf158acfef01',
				creationBlock: 40436378,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 8,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0xa08756ba4a3844b42414ee50e908ee6221ef299c',
				creationBlock: 36867250,
				verified: true,
			},
			{
				id: 43,
				type: EVMMailerContractType.EVMMailerV6,
				address: '0x003c0ac0e7fff5452fb7de73925ce18f91660532',
				creationBlock: 34869078,
				verified: true,
			},
			{
				id: 47,
				type: EVMMailerContractType.EVMMailerV8,
				address: '0xad0404834332174c3e78ad095254ac7a5a62cc3e',
				creationBlock: 39852277,
				verified: true,
			},
		],
		currentRegistryId: 46,
		currentMailerId: 47,
	},
	[EVMNetwork.AVALANCHE]: {
		registryContracts: [
			{
				id: 9,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xb195e6f456b350de42b14a4f2aceea34e696cb75',
				creationBlock: 21613407,
				verified: false,
			},
			{
				id: 51,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xa6b0345fe964cf538595b18ef9bf6d4e044c5bf7',
				creationBlock: 27710627,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 10,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0x85143b48bf2efca893493239500147bb742ec69a',
				creationBlock: 23673967,
				verified: false,
			},
			{
				id: 39,
				type: EVMMailerContractType.EVMMailerV6,
				address: '0xcdb5d5e87e29fb5fccff8ff5c2a9827705c0a260',
				creationBlock: 22784050,
				verified: true,
			},
		],
		currentRegistryId: 51,
		currentMailerId: 10,
	},
	[EVMNetwork.OPTIMISM]: {
		registryContracts: [
			{
				id: 11,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xb195e6f456b350de42b14a4f2aceea34e696cb75',
				creationBlock: 32046889,
				verified: false,
			},
			{
				id: 52,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xa6b0345fe964cf538595b18ef9bf6d4e044c5bf7',
				creationBlock: 82542240,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 12,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0x85143b48bf2efca893493239500147bb742ec69a',
				creationBlock: 50131061,
				verified: false,
			},
		],
		currentRegistryId: 52,
		currentMailerId: 12,
	},
	[EVMNetwork.ARBITRUM]: {
		registryContracts: [
			{
				id: 13,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xb195e6f456b350de42b14a4f2aceea34e696cb75',
				creationBlock: 33111730,
				verified: false,
			},
			{
				id: 50,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xa6b0345fe964cf538595b18ef9bf6d4e044c5bf7',
				creationBlock: 71990782,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 14,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0x85143b48bf2efca893493239500147bb742ec69a',
				creationBlock: 46422622,
				verified: true,
			},
			{
				id: 38,
				type: EVMMailerContractType.EVMMailerV6,
				address: '0xcdb5d5e87e29fb5fccff8ff5c2a9827705c0a260',
				creationBlock: 33112089,
				verified: true,
			},
		],
		currentRegistryId: 50,
		currentMailerId: 14,
	},
	[EVMNetwork.CRONOS]: {
		registryContracts: [
			{
				id: 15,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0x28d9bb1aed64c115dd70e886c546ee0420623bc2',
				creationBlock: 5286437,
				verified: false,
			},
			{
				id: 48,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xda1fa95a630ba2ef6d96f15c9eb721af0f64914e',
				creationBlock: 7490147,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 16,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0xfb3658fba39459a6b76e4f5a6813e73bf49bc6bd',
				creationBlock: 6031727,
				verified: false,
			},
		],
		currentRegistryId: 48,
		currentMailerId: 16,
	},
	[EVMNetwork.FANTOM]: {
		registryContracts: [
			{
				id: 17,
				type: EVMRegistryContractType.EVMRegistryV5,
				address: '0x003c0ac0e7fff5452fb7de73925ce18f91660532',
				creationBlock: 53293641,
				verified: false,
			},
			{
				id: 36,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xda1fa95a630ba2ef6d96f15c9eb721af0f64914e',
				creationBlock: 50113599,
				verified: false,
			},
			{
				id: 44,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xa08756ba4a3844b42414ee50e908ee6221ef299c',
				creationBlock: 57746655,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 18,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0xd7b5bf96f6932c03ffb53c847cc96e124893737e',
				creationBlock: 52390788,
				verified: true,
			},
			{
				id: 40,
				type: EVMMailerContractType.EVMMailerV6,
				address: '0xdfee2128e3d441078dc286171f27f612b35fd7bd',
				creationBlock: 50113669,
				verified: true,
			},
			{
				id: 45,
				type: EVMMailerContractType.EVMMailerV8,
				address: '0x1df52e2658d40ab8db09f80a2da0900bd0b0b8d4',
				creationBlock: 56745288,
				verified: true,
			},
		],
		currentRegistryId: 44,
		currentMailerId: 45,
	},
	[EVMNetwork.KLAYTN]: {
		registryContracts: [
			{
				id: 19,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xda1fa95a630ba2ef6d96f15c9eb721af0f64914e',
				creationBlock: 104982969,
				verified: false,
			},
		],
		mailerContracts: [
			{
				id: 20,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0xb195e6f456b350de42b14a4f2aceea34e696cb75',
				creationBlock: 109216786,
				verified: false,
			},
		],
		currentRegistryId: 19,
		currentMailerId: 20,
	},
	[EVMNetwork.GNOSIS]: {
		registryContracts: [
			{
				id: 21,
				type: EVMRegistryContractType.EVMRegistryV5,
				address: '0xff694f5cf2009522595cef2fe7dbda2767c12361',
				creationBlock: 25817554,
				verified: false,
			},
			{
				id: 35,
				type: EVMRegistryContractType.EVMRegistryV4,
				address: '0xcdb5d5e87e29fb5fccff8ff5c2a9827705c0a260',
				creationBlock: 25479320,
				verified: true,
			},
			{
				id: 41,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0x99620987edf8e6e975ec4a977b7e5178dceabe32',
				creationBlock: 26979009,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 22,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0xb195e6f456b350de42b14a4f2aceea34e696cb75',
				creationBlock: 24758425,
				verified: false,
			},
			{
				id: 42,
				type: EVMMailerContractType.EVMMailerV8,
				address: '0x822cc63c031fb213af9a73efb78682e490d7074a',
				creationBlock: 26682200,
				verified: false,
			},
		],
		currentRegistryId: 41,
		currentMailerId: 42,
	},
	[EVMNetwork.AURORA]: {
		registryContracts: [
			{
				id: 23,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xda1fa95a630ba2ef6d96f15c9eb721af0f64914e',
				creationBlock: 77156327,
				verified: false,
			},
			{
				id: 53,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xcdb5d5e87e29fb5fccff8ff5c2a9827705c0a260',
				creationBlock: 87769530,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 24,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0xb195e6f456b350de42b14a4f2aceea34e696cb75',
				creationBlock: 80717658,
				verified: false,
			},
		],
		currentRegistryId: 53,
		currentMailerId: 24,
	},
	[EVMNetwork.CELO]: {
		registryContracts: [
			{
				id: 25,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xda1fa95a630ba2ef6d96f15c9eb721af0f64914e',
				creationBlock: 15844403,
				verified: false,
			},
			{
				id: 54,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xcdb5d5e87e29fb5fccff8ff5c2a9827705c0a260',
				creationBlock: 18340856,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 26,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0xb195e6f456b350de42b14a4f2aceea34e696cb75',
				creationBlock: 16691003,
				verified: false,
			},
		],
		currentRegistryId: 54,
		currentMailerId: 26,
	},
	[EVMNetwork.MOONBEAM]: {
		registryContracts: [
			{
				id: 27,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xda1fa95a630ba2ef6d96f15c9eb721af0f64914e',
				creationBlock: 2169935,
				verified: false,
			},
			{
				id: 55,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xcdb5d5e87e29fb5fccff8ff5c2a9827705c0a260',
				creationBlock: 3184168,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 28,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0xb195e6f456b350de42b14a4f2aceea34e696cb75',
				creationBlock: 2516445,
				verified: false,
			},
		],
		currentRegistryId: 55,
		currentMailerId: 28,
	},
	[EVMNetwork.MOONRIVER]: {
		registryContracts: [
			{
				id: 29,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xda1fa95a630ba2ef6d96f15c9eb721af0f64914e',
				creationBlock: 2864035,
				verified: false,
			},
			{
				id: 56,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xcdb5d5e87e29fb5fccff8ff5c2a9827705c0a260',
				creationBlock: 3864253,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 30,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0xb195e6f456b350de42b14a4f2aceea34e696cb75',
				creationBlock: 3196644,
				verified: false,
			},
		],
		currentRegistryId: 56,
		currentMailerId: 30,
	},
	[EVMNetwork.METIS]: {
		registryContracts: [
			{
				id: 31,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xda1fa95a630ba2ef6d96f15c9eb721af0f64914e',
				creationBlock: 3886879,
				verified: false,
			},
			{
				id: 57,
				type: EVMRegistryContractType.EVMRegistryV6,
				address: '0xcdb5d5e87e29fb5fccff8ff5c2a9827705c0a260',
				creationBlock: 5132620,
				verified: true,
			},
		],
		mailerContracts: [
			{
				id: 32,
				type: EVMMailerContractType.EVMMailerV7,
				address: '0xb195e6f456b350de42b14a4f2aceea34e696cb75',
				creationBlock: 4188014,
				verified: false,
			},
		],
		currentRegistryId: 57,
		currentMailerId: 32,
	},
	[EVMNetwork.ASTAR]: {
		registryContracts: [
			{
				id: 33,
				type: EVMRegistryContractType.EVMRegistryV3,
				address: '0xdfee2128e3d441078dc286171f27f612b35fd7bd',
				creationBlock: 2163788,
				verified: false,
			},
		],
		mailerContracts: [
			{
				id: 34,
				type: EVMMailerContractType.EVMMailerV6,
				address: '0xb195e6f456b350de42b14a4f2aceea34e696cb75',
				creationBlock: 2163788,
				verified: false,
			},
		],
		currentRegistryId: 33,
		currentMailerId: 34,
	},
};
