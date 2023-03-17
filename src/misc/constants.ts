import { EVMMailerContractType, EVMRegistryContractType, EVMNetwork, IEVMNetworkContracts } from './types';

// last contract id: 47, next id is 48
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
		currentRegistryId: 5,
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
				address: '0x7cefe876a8b57e7d52840bd3007533e7501587cc',
				creationBlock: 39852322,
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
		currentRegistryId: 9,
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
		currentRegistryId: 11,
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
		currentRegistryId: 13,
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
		currentRegistryId: 15,
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
				address: '0x7e5acf25334ff987bfe492c88b366e26a435462d',
				creationBlock: 56745366,
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
		currentRegistryId: 23,
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
		currentRegistryId: 25,
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
		currentRegistryId: 27,
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
		currentRegistryId: 29,
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
		currentRegistryId: 31,
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

export const EVM_CONTRACT_TO_NETWORK: Record<number, EVMNetwork> = {};

export const evmNetworks: EVMNetwork[] = Object.values(EVMNetwork).filter(v => typeof v === 'number') as EVMNetwork[];

for (const network of evmNetworks) {
	for (const contract of EVM_CONTRACTS[network].registryContracts) {
		EVM_CONTRACT_TO_NETWORK[contract.id] = network;
	}
	for (const contract of EVM_CONTRACTS[network].mailerContracts) {
		EVM_CONTRACT_TO_NETWORK[contract.id] = network;
	}
}

export const EVM_NAMES: Record<EVMNetwork, string> = {
	[EVMNetwork.LOCAL_HARDHAT]: 'LOCAL_HARDHAT',

	[EVMNetwork.ETHEREUM]: 'ETHEREUM',
	[EVMNetwork.BNBCHAIN]: 'BNBCHAIN',
	[EVMNetwork.POLYGON]: 'POLYGON',
	[EVMNetwork.AVALANCHE]: 'AVALANCHE',
	[EVMNetwork.OPTIMISM]: 'OPTIMISM',
	[EVMNetwork.ARBITRUM]: 'ARBITRUM',
	[EVMNetwork.CRONOS]: 'CRONOS',
	[EVMNetwork.FANTOM]: 'FANTOM',
	[EVMNetwork.KLAYTN]: 'KLAYTN',
	[EVMNetwork.GNOSIS]: 'GNOSIS',
	[EVMNetwork.AURORA]: 'AURORA',
	[EVMNetwork.CELO]: 'CELO',
	[EVMNetwork.MOONBEAM]: 'MOONBEAM',
	[EVMNetwork.MOONRIVER]: 'MOONRIVER',
	[EVMNetwork.METIS]: 'METIS',
	[EVMNetwork.ASTAR]: 'ASTAR',
};

export const EVM_ENS: Record<EVMNetwork, string | null> = {
	[EVMNetwork.LOCAL_HARDHAT]: null,

	[EVMNetwork.ETHEREUM]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
	[EVMNetwork.BNBCHAIN]: null,
	[EVMNetwork.POLYGON]: null,
	[EVMNetwork.AVALANCHE]: null,
	[EVMNetwork.OPTIMISM]: null,
	[EVMNetwork.ARBITRUM]: null,
	[EVMNetwork.AURORA]: null,
	[EVMNetwork.FANTOM]: null,
	[EVMNetwork.KLAYTN]: null,
	[EVMNetwork.GNOSIS]: null,
	[EVMNetwork.CELO]: null,
	[EVMNetwork.MOONRIVER]: null,
	[EVMNetwork.MOONBEAM]: null,
	[EVMNetwork.ASTAR]: null,
	[EVMNetwork.METIS]: null,
	[EVMNetwork.CRONOS]: null,
};

export const EVM_CHAINS: Record<EVMNetwork, number> = {
	[EVMNetwork.LOCAL_HARDHAT]: 31337,

	[EVMNetwork.ETHEREUM]: 1,
	[EVMNetwork.BNBCHAIN]: 56,
	[EVMNetwork.POLYGON]: 137,
	[EVMNetwork.AVALANCHE]: 43114,
	[EVMNetwork.OPTIMISM]: 10,
	[EVMNetwork.ARBITRUM]: 42161,
	[EVMNetwork.CRONOS]: 25,
	[EVMNetwork.FANTOM]: 250,
	[EVMNetwork.KLAYTN]: 8217,
	[EVMNetwork.GNOSIS]: 100,
	[EVMNetwork.AURORA]: 1313161554,
	[EVMNetwork.CELO]: 42220,
	[EVMNetwork.MOONBEAM]: 1284,
	[EVMNetwork.MOONRIVER]: 1285,
	[EVMNetwork.METIS]: 1088,
	[EVMNetwork.ASTAR]: 592,
};

export const EVM_CHAIN_ID_TO_NETWORK: Record<number, EVMNetwork> = Object.keys(EVM_CHAINS)
	.map(network => ({
		[EVM_CHAINS[network as unknown as EVMNetwork]]: Number(network as unknown as EVMNetwork),
	}))
	.reduce((p, c) => ({ ...p, ...c }), {} as Record<number, EVMNetwork>);

export const EVM_RPCS: Record<
	EVMNetwork,
	{ rpc: string; blockLimit?: number; lastestNotSupported?: boolean; batchNotSupported?: boolean }[]
> = {
	[EVMNetwork.LOCAL_HARDHAT]: [{ rpc: 'http://localhost:8545/' }],

	[EVMNetwork.ETHEREUM]: [
		{ rpc: 'wss://eth-mainnet.g.alchemy.com/v2/MbanB2kJ4QyiFjOlUTSmkUj8lfbU6T6K', blockLimit: 30000 },
		{ rpc: 'https://eth-mainnet.g.alchemy.com/v2/MbanB2kJ4QyiFjOlUTSmkUj8lfbU6T6K', blockLimit: 30000 },
		{ rpc: 'wss://mainnet.infura.io/ws/v3/3bcb970aa2dd447cbad6ac4301ed63bf' },
		{ rpc: 'https://mainnet.infura.io/v3/3bcb970aa2dd447cbad6ac4301ed63bf' },
		{ rpc: 'https://eth-mainnet.public.blastapi.io' },
		{ rpc: 'https://eth-rpc.gateway.pokt.network' },
	],
	[EVMNetwork.BNBCHAIN]: [
		{
			rpc: 'wss://bsc-mainnet.nodereal.io/ws/v1/03e041fbd4e74ce489f9be55da8e895a',
			blockLimit: 49999,
		},
		{
			rpc: 'https://still-tiniest-surf.bsc.discover.quiknode.pro/390c72acf357bb7fc5f2b9175a08d48b774c69db/',
			blockLimit: 3499,
			lastestNotSupported: true,
		},
		{ rpc: 'https://bsc-dataseed.binance.org/' },
		{ rpc: 'https://bsc-dataseed2.binance.org' },
		{ rpc: 'https://bsc-dataseed3.binance.org' },
	],
	[EVMNetwork.POLYGON]: [
		{ rpc: 'https://polygon-mainnet.g.alchemy.com/v2/QsyQEuK4OgNSuo086MfKTXhO4DQCfYFu', blockLimit: 30000 },
		{ rpc: 'wss://polygon-mainnet.g.alchemy.com/v2/QsyQEuK4OgNSuo086MfKTXhO4DQCfYFu', blockLimit: 30000 },
	],
	[EVMNetwork.ARBITRUM]: [
		{ rpc: 'https://arb-mainnet.g.alchemy.com/v2/KY0LKW4PMTxWlVz8DkyBZ_IODtnn5_7r', blockLimit: 30000 },
		{ rpc: 'wss://arb-mainnet.g.alchemy.com/v2/KY0LKW4PMTxWlVz8DkyBZ_IODtnn5_7r', blockLimit: 30000 },
		{ rpc: 'https://arb1.arbitrum.io/rpc' },
		{ rpc: 'https://rpc.ankr.com/arbitrum' },
	],
	[EVMNetwork.OPTIMISM]: [
		{ rpc: 'https://opt-mainnet.g.alchemy.com/v2/G8JwqBBJNnRouFnVbsmGA0E4WZtJNqPO', blockLimit: 30000 },
		{ rpc: 'wss://opt-mainnet.g.alchemy.com/v2/G8JwqBBJNnRouFnVbsmGA0E4WZtJNqPO', blockLimit: 30000 },
		{ rpc: 'https://mainnet.optimism.io' },
		{ rpc: 'https://optimism-mainnet.public.blastapi.io' },
		{ rpc: 'https://rpc.ankr.com/optimism' },
	],
	[EVMNetwork.AVALANCHE]: [
		{
			rpc: 'https://rpc.ankr.com/avalanche',
			blockLimit: 3000,
		},
		{
			rpc: 'https://avalanche-mainnet.infura.io/v3/3bcb970aa2dd447cbad6ac4301ed63bf',
			blockLimit: 2048,
			batchNotSupported: true,
		},
		{
			rpc: 'https://ava-mainnet.blastapi.io/cc59bb68-a7ff-4278-9f16-278ba49d7635/ext/bc/C/rpc',
			blockLimit: 500,
		},
	],
	[EVMNetwork.CRONOS]: [
		{ rpc: 'https://evm.cronos.org', blockLimit: 2000 },
		{ rpc: 'https://cronosrpc-1.xstaking.sg', blockLimit: 2000 },
	],
	[EVMNetwork.FANTOM]: [{ rpc: 'https://rpc.fantom.network', blockLimit: 10000 }],
	[EVMNetwork.KLAYTN]: [
		{ rpc: 'https://public-node-api.klaytnapi.com/v1/cypress', batchNotSupported: true, blockLimit: 50000 },
		{ rpc: 'https://klaytn01.fandom.finance' },
		{ rpc: 'https://klaytn02.fandom.finance' },
	],
	[EVMNetwork.GNOSIS]: [
		{ rpc: 'https://rpc.gnosischain.com', blockLimit: 10000 },
		{ rpc: 'wss://rpc.gnosischain.com/wss', blockLimit: 10000 },
		{ rpc: 'https://cosmopolitan-dawn-sky.xdai.discover.quiknode.pro/4405e640361b4c7ef17a3f07431647fd6375fc29/' },
		{ rpc: 'https://xdai-rpc.gateway.pokt.network' },
		{ rpc: 'https://gnosis-mainnet.public.blastapi.io' },
	],
	[EVMNetwork.AURORA]: [{ rpc: 'https://mainnet.aurora.dev', blockLimit: 10000 }],

	[EVMNetwork.CELO]: [
		{ rpc: 'https://forno.celo.org', blockLimit: 10000 },
		{ rpc: 'wss://forno.celo.org/ws' },
		{ rpc: 'https://rpc.ankr.com/celo' },
	],
	[EVMNetwork.MOONBEAM]: [
		{ rpc: 'https://rpc.api.moonbeam.network', blockLimit: 2000 },
		{ rpc: 'wss://wss.api.moonbeam.network' },
		{ rpc: 'https://moonbeam.public.blastapi.io' },
	],
	[EVMNetwork.MOONRIVER]: [{ rpc: 'https://rpc.api.moonriver.moonbeam.network', blockLimit: 2000 }],
	[EVMNetwork.ASTAR]: [
		{ rpc: 'https://astar-mainnet.g.alchemy.com/v2/Ib5I59bSB2Vv41PJlF2TWWqjND4ppGdi', blockLimit: 30000 },
		{ rpc: 'wss://astar-mainnet.g.alchemy.com/v2/Ib5I59bSB2Vv41PJlF2TWWqjND4ppGdi', blockLimit: 30000 },
		{
			rpc: 'https://astar.blastapi.io/cc59bb68-a7ff-4278-9f16-278ba49d7635',
			blockLimit: 500,
			lastestNotSupported: true,
		},
	],
	[EVMNetwork.METIS]: [{ rpc: 'https://andromeda.metis.io/?owner=1088', blockLimit: 10000 }],
};

export const EVM_CHUNK_SIZES: Record<EVMNetwork, number> = {
	[EVMNetwork.LOCAL_HARDHAT]: 15 * 1024,

	[EVMNetwork.ETHEREUM]: 15 * 1024,
	[EVMNetwork.BNBCHAIN]: 15 * 1024,
	[EVMNetwork.POLYGON]: 15 * 1024,
	[EVMNetwork.AVALANCHE]: 15 * 1024,
	[EVMNetwork.OPTIMISM]: 15 * 1024,
	[EVMNetwork.ARBITRUM]: 15 * 1024,
	[EVMNetwork.CRONOS]: 15 * 1024,
	[EVMNetwork.FANTOM]: 15 * 1024,
	[EVMNetwork.KLAYTN]: 15 * 1024,
	[EVMNetwork.GNOSIS]: 15 * 1024,
	[EVMNetwork.AURORA]: 15 * 1024,
	[EVMNetwork.CELO]: 15 * 1024,
	[EVMNetwork.MOONBEAM]: 15 * 1024,
	[EVMNetwork.MOONRIVER]: 15 * 1024,
	[EVMNetwork.METIS]: 15 * 1024,
	[EVMNetwork.ASTAR]: 15 * 1024,
};
