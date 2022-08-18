import { EVMNetwork } from './types';

// Dev addresses
export const DEV_MAILER_ADDRESS = '0x67d269191c92Caf3cD7723F116c85e6E9bf55933'; //'0x0165878A594ca255338adfa4d48449f69242Eb8F';
export const DEV_REGISTRY_ADDRESS = '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1';

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
	[EVMNetwork.ETHEREUM]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.BNBCHAIN]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.POLYGON]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.AVALANCHE]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.OPTIMISM]: { mailer: { address: '' }, registry: { address: '' } },

	[EVMNetwork.ARBITRUM]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.AURORA]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.KLAYTN]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.GNOSIS]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.CRONOS]: { mailer: { address: '' }, registry: { address: '' } },

	[EVMNetwork.CELO]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.MOONRIVER]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.MOONBEAM]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.ASTAR]: { mailer: { address: '' }, registry: { address: '' } },
	[EVMNetwork.HECO]: { mailer: { address: '' }, registry: { address: '' } },

	[EVMNetwork.METIS]: { mailer: { address: '' }, registry: { address: '' } },
};

export const EVM_NAMES: Record<EVMNetwork, string> = {
	[EVMNetwork.LOCAL_HARDHAT]: 'LOCAL_HARDHAT',

	[EVMNetwork.ETHEREUM]: 'ETHEREUM',
	[EVMNetwork.BNBCHAIN]: 'BNBCHAIN',
	[EVMNetwork.POLYGON]: 'POLYGON',
	[EVMNetwork.AVALANCHE]: 'AVALANCHE',
	[EVMNetwork.OPTIMISM]: 'OPTIMISM',

	[EVMNetwork.ARBITRUM]: 'ARBITRUM',
	[EVMNetwork.AURORA]: 'AURORA',
	[EVMNetwork.KLAYTN]: 'KLAYTN',
	[EVMNetwork.GNOSIS]: 'GNOSIS',
	[EVMNetwork.CRONOS]: 'CRONOS',

	[EVMNetwork.CELO]: 'CELO',
	[EVMNetwork.MOONRIVER]: 'MOONRIVER',
	[EVMNetwork.MOONBEAM]: 'MOONBEAM',
	[EVMNetwork.ASTAR]: 'ASTAR',
	[EVMNetwork.HECO]: 'HECO',

	[EVMNetwork.METIS]: 'METIS',
};

export const EVM_CHAINS: Record<EVMNetwork, number> = {
	[EVMNetwork.LOCAL_HARDHAT]: 31337,

	[EVMNetwork.ETHEREUM]: 1,
	[EVMNetwork.BNBCHAIN]: 56,
	[EVMNetwork.POLYGON]: 137,
	[EVMNetwork.AVALANCHE]: 43114,
	[EVMNetwork.OPTIMISM]: 10,

	[EVMNetwork.ARBITRUM]: 42161,
	[EVMNetwork.AURORA]: 1313161554,
	[EVMNetwork.KLAYTN]: 8217,
	[EVMNetwork.GNOSIS]: 100,
	[EVMNetwork.CRONOS]: 25,

	[EVMNetwork.CELO]: 42220,
	[EVMNetwork.MOONRIVER]: 1285,
	[EVMNetwork.MOONBEAM]: 1284,
	[EVMNetwork.ASTAR]: 592,
	[EVMNetwork.HECO]: 128,

	[EVMNetwork.METIS]: 1088,
};

export const EVM_CHAIN_ID_TO_NETWORK: Record<number, EVMNetwork> = Object.keys(EVM_CHAINS)
	.map(network => ({
		[EVM_CHAINS[network as unknown as EVMNetwork]]: Number(network as unknown as EVMNetwork),
	}))
	.reduce((p, c) => ({ ...p, ...c }), {} as Record<number, EVMNetwork>);

export const EVM_RPCS: Record<EVMNetwork, string[]> = {
	[EVMNetwork.LOCAL_HARDHAT]: ['http://localhost:8545/'],

	[EVMNetwork.ETHEREUM]: [
		'wss://mainnet.infura.io/ws/v3/3bcb970aa2dd447cbad6ac4301ed63bf',
		'https://mainnet.infura.io/v3/3bcb970aa2dd447cbad6ac4301ed63bf',
		'https://eth-mainnet.public.blastapi.io',
		'https://eth-rpc.gateway.pokt.network',
	],
	[EVMNetwork.BNBCHAIN]: [
		'https://bsc-dataseed.binance.org/',
		'https://bsc-dataseed2.binance.org',
		'https://bsc-dataseed3.binance.org',
	],
	[EVMNetwork.POLYGON]: [
		'https://polygon-rpc.com',
		'https://rpc-mainnet.matic.quiknode.pro',
		'https://polygon-mainnet.public.blastapi.io',
	],
	[EVMNetwork.AVALANCHE]: [
		'https://api.avax.network/ext/bc/C/rpc',
		'https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc',
		'https://avalancheapi.terminet.io/ext/bc/C/rpc',
	],
	[EVMNetwork.OPTIMISM]: [
		'https://mainnet.optimism.io',
		'https://optimism-mainnet.public.blastapi.io',
		'https://rpc.ankr.com/optimism',
	],

	[EVMNetwork.ARBITRUM]: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
	[EVMNetwork.AURORA]: ['https://mainnet.aurora.dev'],
	[EVMNetwork.KLAYTN]: [
		'https://public-node-api.klaytnapi.com/v1/cypress',
		'https://klaytn01.fandom.finance',
		'https://klaytn02.fandom.finance',
	],
	[EVMNetwork.GNOSIS]: [
		'https://rpc.gnosischain.com',
		'wss://rpc.gnosischain.com/wss',
		'https://xdai-rpc.gateway.pokt.network',
		'https://gnosis-mainnet.public.blastapi.io',
	],
	[EVMNetwork.CRONOS]: ['https://evm.cronos.org', 'https://cronosrpc-1.xstaking.sg'],

	[EVMNetwork.CELO]: ['wss://forno.celo.org/ws', 'https://forno.celo.org', 'https://rpc.ankr.com/celo'],
	[EVMNetwork.MOONRIVER]: ['https://rpc.api.moonriver.moonbeam.network'],
	[EVMNetwork.MOONBEAM]: [
		'wss://wss.api.moonbeam.network',
		'https://rpc.api.moonbeam.network',
		'https://moonbeam.public.blastapi.io',
	],
	[EVMNetwork.ASTAR]: ['https://rpc.astar.network:8545', 'https://astar.public.blastapi.io'],
	[EVMNetwork.HECO]: [
		'wss://ws-mainnet.hecochain.com',
		'https://http-mainnet.hecochain.com',
		'https://hecoapi.terminet.io/rpc',
	],

	[EVMNetwork.METIS]: ['https://andromeda.metis.io/?owner=1088'],
};
