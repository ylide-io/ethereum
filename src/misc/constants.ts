import { EVMNetwork } from './types';

export interface IEthereumContractLink {
	address: string;
	fromBlock?: number;
	toBlock?: number;
}

export const EVM_CONTRACTS: Record<
	EVMNetwork,
	{
		mailer: IEthereumContractLink;
		registry: IEthereumContractLink;
		legacyMailers?: IEthereumContractLink[];
		legacyRegistries?: IEthereumContractLink[];
	}
> = {
	[EVMNetwork.LOCAL_HARDHAT]: {
		mailer: { address: '0x5FbDB2315678afecb367f032d93F642f64180aa3' },
		registry: { address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' },
	},
	[EVMNetwork.ETHEREUM]: {
		mailer: { address: '0xec77e30c68ac3b496f0a713e9a9e6ad0d0a0a93f', fromBlock: 15372374 },
		registry: { address: '0xb1ddc61c8ae4ae410a4f92b9033409fbb61c2f66', fromBlock: 15372319 },
	},
	[EVMNetwork.BNBCHAIN]: {
		mailer: { address: '0xa445a576d0f6fa6baa23f805da804c6ff1c0f886', fromBlock: 20582134 },
		registry: { address: '0x5408ba893cfbd493ad05418e63d697b6f7d392bf', fromBlock: 20582146 },
	},
	[EVMNetwork.POLYGON]: {
		mailer: { address: '0x28D9Bb1AEd64C115dD70e886C546ee0420623BC2', fromBlock: 32039400 },
		registry: { address: '0x79935f5d685452C361058C0Fe5a50B803AA214a1', fromBlock: 32039400 },
	},
	[EVMNetwork.AVALANCHE]: {
		mailer: { address: '0x28D9Bb1AEd64C115dD70e886C546ee0420623BC2', fromBlock: 18851746 },
		registry: { address: '0x79935f5d685452C361058C0Fe5a50B803AA214a1', fromBlock: 18851846 },
	},
	[EVMNetwork.OPTIMISM]: {
		mailer: { address: '0x28d9bb1aed64c115dd70e886c546ee0420623bc2', fromBlock: 19796019 },
		registry: { address: '0x79935f5d685452c361058c0fe5a50b803aa214a1', fromBlock: 19796104 },
	},
	[EVMNetwork.ARBITRUM]: {
		mailer: { address: '0x79935f5d685452c361058c0fe5a50b803aa214a1', fromBlock: 20707340 },
		registry: { address: '0x28d9bb1aed64c115dd70e886c546ee0420623bc2', fromBlock: 20707262 },
	},

	// [EVMNetwork.AURORA]: { mailer: { address: '' }, registry: { address: '' } },
	// [EVMNetwork.KLAYTN]: { mailer: { address: '' }, registry: { address: '' } },
	// [EVMNetwork.GNOSIS]: { mailer: { address: '' }, registry: { address: '' } },
	// [EVMNetwork.CRONOS]: { mailer: { address: '' }, registry: { address: '' } },

	// [EVMNetwork.CELO]: { mailer: { address: '' }, registry: { address: '' } },
	// [EVMNetwork.MOONRIVER]: { mailer: { address: '' }, registry: { address: '' } },
	// [EVMNetwork.MOONBEAM]: { mailer: { address: '' }, registry: { address: '' } },
	// [EVMNetwork.ASTAR]: { mailer: { address: '' }, registry: { address: '' } },
	// [EVMNetwork.HECO]: { mailer: { address: '' }, registry: { address: '' } },

	// [EVMNetwork.METIS]: { mailer: { address: '' }, registry: { address: '' } },
};

export const EVM_NAMES: Record<EVMNetwork, string> = {
	[EVMNetwork.LOCAL_HARDHAT]: 'LOCAL_HARDHAT',

	[EVMNetwork.ETHEREUM]: 'ETHEREUM',
	[EVMNetwork.BNBCHAIN]: 'BNBCHAIN',
	[EVMNetwork.POLYGON]: 'POLYGON',
	[EVMNetwork.AVALANCHE]: 'AVALANCHE',
	[EVMNetwork.OPTIMISM]: 'OPTIMISM',
	[EVMNetwork.ARBITRUM]: 'ARBITRUM',

	// [EVMNetwork.AURORA]: 'AURORA',
	// [EVMNetwork.KLAYTN]: 'KLAYTN',
	// [EVMNetwork.GNOSIS]: 'GNOSIS',
	// [EVMNetwork.CRONOS]: 'CRONOS',

	// [EVMNetwork.CELO]: 'CELO',
	// [EVMNetwork.MOONRIVER]: 'MOONRIVER',
	// [EVMNetwork.MOONBEAM]: 'MOONBEAM',
	// [EVMNetwork.ASTAR]: 'ASTAR',
	// [EVMNetwork.HECO]: 'HECO',

	// [EVMNetwork.METIS]: 'METIS',
};

export const EVM_CHAINS: Record<EVMNetwork, number> = {
	[EVMNetwork.LOCAL_HARDHAT]: 31337,

	[EVMNetwork.ETHEREUM]: 1,
	[EVMNetwork.BNBCHAIN]: 56,
	[EVMNetwork.POLYGON]: 137,
	[EVMNetwork.AVALANCHE]: 43114,
	[EVMNetwork.OPTIMISM]: 10,
	[EVMNetwork.ARBITRUM]: 42161,

	// [EVMNetwork.AURORA]: 1313161554,
	// [EVMNetwork.KLAYTN]: 8217,
	// [EVMNetwork.GNOSIS]: 100,
	// [EVMNetwork.CRONOS]: 25,

	// [EVMNetwork.CELO]: 42220,
	// [EVMNetwork.MOONRIVER]: 1285,
	// [EVMNetwork.MOONBEAM]: 1284,
	// [EVMNetwork.ASTAR]: 592,
	// [EVMNetwork.HECO]: 128,

	// [EVMNetwork.METIS]: 1088,
};

export const EVM_CHAIN_ID_TO_NETWORK: Record<number, EVMNetwork> = Object.keys(EVM_CHAINS)
	.map(network => ({
		[EVM_CHAINS[network as unknown as EVMNetwork]]: Number(network as unknown as EVMNetwork),
	}))
	.reduce((p, c) => ({ ...p, ...c }), {} as Record<number, EVMNetwork>);

export const EVM_RPCS: Record<EVMNetwork, { rpc: string; blockLimit?: number }[]> = {
	[EVMNetwork.LOCAL_HARDHAT]: [{ rpc: 'http://localhost:8545/' }],

	[EVMNetwork.ETHEREUM]: [
		{ rpc: 'https://eth-mainnet.g.alchemy.com/v2/MbanB2kJ4QyiFjOlUTSmkUj8lfbU6T6K' },
		{ rpc: 'wss://mainnet.infura.io/ws/v3/3bcb970aa2dd447cbad6ac4301ed63bf' },
		{ rpc: 'https://mainnet.infura.io/v3/3bcb970aa2dd447cbad6ac4301ed63bf' },
		{ rpc: 'https://eth-mainnet.public.blastapi.io' },
		{ rpc: 'https://eth-rpc.gateway.pokt.network' },
	],
	[EVMNetwork.BNBCHAIN]: [
		{
			rpc: 'https://still-tiniest-surf.bsc.discover.quiknode.pro/390c72acf357bb7fc5f2b9175a08d48b774c69db/',
			blockLimit: 3500,
		},
		{ rpc: 'https://bsc-dataseed.binance.org/' },
		{ rpc: 'https://bsc-dataseed2.binance.org' },
		{ rpc: 'https://bsc-dataseed3.binance.org' },
	],
	[EVMNetwork.POLYGON]: [
		{ rpc: 'https://polygon-mainnet.g.alchemy.com/v2/QsyQEuK4OgNSuo086MfKTXhO4DQCfYFu' },
		// 'https://polygon-mainnet.infura.io/v3/3bcb970aa2dd447cbad6ac4301ed63bf',
		// 'https://polygon-rpc.com',
		// 'https://rpc-mainnet.matic.quiknode.pro',
		// 'https://polygon-mainnet.public.blastapi.io',
	],
	[EVMNetwork.ARBITRUM]: [
		{ rpc: 'https://arb-mainnet.g.alchemy.com/v2/KY0LKW4PMTxWlVz8DkyBZ_IODtnn5_7r' },
		{ rpc: 'https://arb1.arbitrum.io/rpc' },
		{ rpc: 'https://rpc.ankr.com/arbitrum' },
	],
	[EVMNetwork.OPTIMISM]: [
		{ rpc: 'https://opt-mainnet.g.alchemy.com/v2/G8JwqBBJNnRouFnVbsmGA0E4WZtJNqPO' },
		{ rpc: 'https://mainnet.optimism.io' },
		{ rpc: 'https://optimism-mainnet.public.blastapi.io' },
		{ rpc: 'https://rpc.ankr.com/optimism' },
	],

	[EVMNetwork.AVALANCHE]: [
		// 'https://serene-proud-snowflake.avalanche-mainnet.discover.quiknode.pro/205e5b82f885604ee4428c55a512d4ff9d4c4815/',
		{ rpc: 'https://api.avax.network/ext/bc/C/rpc' },
		{ rpc: 'https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc' },
		{ rpc: 'https://avalancheapi.terminet.io/ext/bc/C/rpc' },
	],
	// [EVMNetwork.AURORA]: ['https://mainnet.aurora.dev'],
	// [EVMNetwork.KLAYTN]: [
	// 	'https://public-node-api.klaytnapi.com/v1/cypress',
	// 	'https://klaytn01.fandom.finance',
	// 	'https://klaytn02.fandom.finance',
	// ],
	// [EVMNetwork.GNOSIS]: [
	// 	'https://rpc.gnosischain.com',
	// 	'wss://rpc.gnosischain.com/wss',
	// 	'https://xdai-rpc.gateway.pokt.network',
	// 	'https://gnosis-mainnet.public.blastapi.io',
	// ],
	// [EVMNetwork.CRONOS]: ['https://evm.cronos.org', 'https://cronosrpc-1.xstaking.sg'],

	// [EVMNetwork.CELO]: ['wss://forno.celo.org/ws', 'https://forno.celo.org', 'https://rpc.ankr.com/celo'],
	// [EVMNetwork.MOONRIVER]: ['https://rpc.api.moonriver.moonbeam.network'],
	// [EVMNetwork.MOONBEAM]: [
	// 	'wss://wss.api.moonbeam.network',
	// 	'https://rpc.api.moonbeam.network',
	// 	'https://moonbeam.public.blastapi.io',
	// ],
	// [EVMNetwork.ASTAR]: ['https://rpc.astar.network:8545', 'https://astar.public.blastapi.io'],
	// [EVMNetwork.HECO]: [
	// 	'wss://ws-mainnet.hecochain.com',
	// 	'https://http-mainnet.hecochain.com',
	// 	'https://hecoapi.terminet.io/rpc',
	// ],

	// [EVMNetwork.METIS]: ['https://andromeda.metis.io/?owner=1088'],
};
