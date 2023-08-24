import { EVM_CONTRACTS } from './contractConstants';
import { EVMNetwork } from './types';

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
	[EVMNetwork.SHARDEUM]: 'SHARDEUM',
	[EVMNetwork.ZETA]: 'ZETA',
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
	[EVMNetwork.SHARDEUM]: null,
	[EVMNetwork.ZETA]: null,
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
	[EVMNetwork.SHARDEUM]: 8081,
	[EVMNetwork.ZETA]: 7001,
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
		// {
		// 	rpc: 'https://still-tiniest-surf.bsc.discover.quiknode.pro/390c72acf357bb7fc5f2b9175a08d48b774c69db/',
		// 	blockLimit: 3499,
		// 	lastestNotSupported: true,
		// },
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
		{ rpc: 'https://cypress.fautor.app/archive' },
		{ rpc: 'https://klaytn.blockpi.network/v1/rpc/public' },
	],
	[EVMNetwork.GNOSIS]: [
		{ rpc: 'https://rpc.gnosischain.com', blockLimit: 10000 },
		{ rpc: 'wss://rpc.gnosischain.com/wss', blockLimit: 10000 },
		{
			rpc: 'https://rpc.ankr.com/gnosis',
			blockLimit: 1000,
		},
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
	[EVMNetwork.SHARDEUM]: [{ rpc: 'https://dapps.shardeum.org	', blockLimit: 10000 }],
	[EVMNetwork.ZETA]: [
		{
			rpc: 'https://zetachain-athens-evm.blockpi.network/v1/rpc/public',
			blockLimit: 10000,
		},
	],
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
	[EVMNetwork.SHARDEUM]: 15 * 1024,
	[EVMNetwork.ZETA]: 15 * 1024,
};
