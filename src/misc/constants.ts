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
		registry: { address: '0xe90f1cd859a309dddbbf1ba4999bb911823ea0db', fromBlock: 15841992 },
		mailer: { address: '0x003c0ac0e7fff5452fb7de73925ce18f91660532', fromBlock: 15841992 },
	},
	[EVMNetwork.BNBCHAIN]: {
		registry: { address: '0x8c030408e3C873282B57033Fee38685F74E0CefF', fromBlock: 22544208 },
		mailer: { address: '0x28D9Bb1AEd64C115dD70e886C546ee0420623BC2', fromBlock: 23930418 },
	},
	[EVMNetwork.POLYGON]: {
		registry: { address: '0xff0e2f4c0351f78dcb5d05ba485aec76a1d0a851', fromBlock: 34868841 },
		mailer: { address: '0xA08756BA4A3844b42414eE50e908eE6221eF299c', fromBlock: 36867250 },
	},
	[EVMNetwork.AVALANCHE]: {
		registry: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 21613407 },
		mailer: { address: '0x85143B48Bf2EfCa893493239500147Bb742ec69a', fromBlock: 23673967 },
	},
	[EVMNetwork.OPTIMISM]: {
		registry: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 32046889 },
		mailer: { address: '0x85143B48Bf2EfCa893493239500147Bb742ec69a', fromBlock: 50131061 },
	},
	[EVMNetwork.ARBITRUM]: {
		registry: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 33111730 },
		mailer: { address: '0x85143B48Bf2EfCa893493239500147Bb742ec69a', fromBlock: 46422622 },
	},

	[EVMNetwork.CRONOS]: {
		registry: { address: '0x28D9Bb1AEd64C115dD70e886C546ee0420623BC2', fromBlock: 5286437 },
		mailer: { address: '0xfb3658fbA39459a6B76e4f5a6813e73Bf49BC6BD', fromBlock: 6031727 },
	},
	[EVMNetwork.FANTOM]: {
		registry: { address: '0x85143B48Bf2EfCa893493239500147Bb742ec69a', fromBlock: 52364878 },
		mailer: { address: '0xD7b5BF96F6932C03FFB53C847cc96E124893737E', fromBlock: 52390788 },
	},
	[EVMNetwork.KLAYTN]: {
		registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 104982969 },
		mailer: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 109216786 },
	},
	[EVMNetwork.GNOSIS]: {
		registry: { address: '0xCdb5D5E87E29fB5Fccff8fF5c2A9827705C0A260', fromBlock: 25464256 },
		mailer: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 24758425 },
	},
	[EVMNetwork.AURORA]: {
		registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 77156327 },
		mailer: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 80717658 },
	},

	[EVMNetwork.CELO]: {
		registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 15844403 },
		mailer: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 16691003 },
	},
	[EVMNetwork.MOONBEAM]: {
		registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 2169935 },
		mailer: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 2516445 },
	},
	[EVMNetwork.MOONRIVER]: {
		registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 2864035 },
		mailer: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 3196644 },
	},
	[EVMNetwork.METIS]: {
		registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 3886879 },
		mailer: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 4188014 },
	},
	[EVMNetwork.ASTAR]: {
		registry: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 2163788 },
		mailer: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 2163788 },
	},
};

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
		{ rpc: 'wss://eth-mainnet.g.alchemy.com/v2/MbanB2kJ4QyiFjOlUTSmkUj8lfbU6T6K' },
		{ rpc: 'wss://mainnet.infura.io/ws/v3/3bcb970aa2dd447cbad6ac4301ed63bf' },
		{ rpc: 'https://mainnet.infura.io/v3/3bcb970aa2dd447cbad6ac4301ed63bf' },
		{ rpc: 'https://eth-mainnet.public.blastapi.io' },
		{ rpc: 'https://eth-rpc.gateway.pokt.network' },
	],
	[EVMNetwork.BNBCHAIN]: [
		{
			rpc: 'wss://bsc-mainnet.nodereal.io/ws/v1/03e041fbd4e74ce489f9be55da8e895a',
			blockLimit: 50000,
		},
		{
			rpc: 'https://still-tiniest-surf.bsc.discover.quiknode.pro/390c72acf357bb7fc5f2b9175a08d48b774c69db/',
			blockLimit: 3500,
			lastestNotSupported: true,
		},
		{ rpc: 'https://bsc-dataseed.binance.org/' },
		{ rpc: 'https://bsc-dataseed2.binance.org' },
		{ rpc: 'https://bsc-dataseed3.binance.org' },
	],
	[EVMNetwork.POLYGON]: [
		{ rpc: 'wss://polygon-mainnet.g.alchemy.com/v2/QsyQEuK4OgNSuo086MfKTXhO4DQCfYFu' },
		{ rpc: 'https://polygon-mainnet.g.alchemy.com/v2/QsyQEuK4OgNSuo086MfKTXhO4DQCfYFu' },
	],
	[EVMNetwork.ARBITRUM]: [
		{ rpc: 'wss://arb-mainnet.g.alchemy.com/v2/KY0LKW4PMTxWlVz8DkyBZ_IODtnn5_7r' },
		{ rpc: 'https://arb-mainnet.g.alchemy.com/v2/KY0LKW4PMTxWlVz8DkyBZ_IODtnn5_7r' },
		{ rpc: 'https://arb1.arbitrum.io/rpc' },
		{ rpc: 'https://rpc.ankr.com/arbitrum' },
	],
	[EVMNetwork.OPTIMISM]: [
		{ rpc: 'wss://opt-mainnet.g.alchemy.com/v2/G8JwqBBJNnRouFnVbsmGA0E4WZtJNqPO' },
		{ rpc: 'https://opt-mainnet.g.alchemy.com/v2/G8JwqBBJNnRouFnVbsmGA0E4WZtJNqPO' },
		{ rpc: 'https://mainnet.optimism.io' },
		{ rpc: 'https://optimism-mainnet.public.blastapi.io' },
		{ rpc: 'https://rpc.ankr.com/optimism' },
	],

	[EVMNetwork.AVALANCHE]: [
		{
			rpc: 'https://avalanche-mainnet.infura.io/v3/3bcb970aa2dd447cbad6ac4301ed63bf',
			blockLimit: 2048,
			batchNotSupported: true,
		},
		{
			rpc: 'https://rpc.ankr.com/avalanche',
			blockLimit: 3000,
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
	[EVMNetwork.FANTOM]: [{ rpc: 'https://rpc.fantom.network' }],
	[EVMNetwork.KLAYTN]: [
		{ rpc: 'https://public-node-api.klaytnapi.com/v1/cypress', batchNotSupported: true },
		{ rpc: 'https://klaytn01.fandom.finance' },
		{ rpc: 'https://klaytn02.fandom.finance' },
	],
	[EVMNetwork.GNOSIS]: [
		{ rpc: 'wss://rpc.gnosischain.com/wss' },
		{ rpc: 'https://rpc.gnosischain.com' },
		{ rpc: 'https://xdai-rpc.gateway.pokt.network' },
		{ rpc: 'https://gnosis-mainnet.public.blastapi.io' },
	],
	[EVMNetwork.AURORA]: [{ rpc: 'https://mainnet.aurora.dev' }],

	[EVMNetwork.CELO]: [
		{ rpc: 'wss://forno.celo.org/ws' },
		{ rpc: 'https://forno.celo.org' },
		{ rpc: 'https://rpc.ankr.com/celo' },
	],
	[EVMNetwork.MOONBEAM]: [
		{ rpc: 'wss://wss.api.moonbeam.network' },
		{ rpc: 'https://rpc.api.moonbeam.network' },
		{ rpc: 'https://moonbeam.public.blastapi.io' },
	],
	[EVMNetwork.MOONRIVER]: [{ rpc: 'https://rpc.api.moonriver.moonbeam.network' }],
	[EVMNetwork.ASTAR]: [
		{ rpc: 'https://astar-mainnet.g.alchemy.com/v2/Ib5I59bSB2Vv41PJlF2TWWqjND4ppGdi', blockLimit: 30000 },
		{ rpc: 'wss://astar-mainnet.g.alchemy.com/v2/Ib5I59bSB2Vv41PJlF2TWWqjND4ppGdi', blockLimit: 30000 },
		{
			rpc: 'https://astar.blastapi.io/cc59bb68-a7ff-4278-9f16-278ba49d7635',
			blockLimit: 500,
			lastestNotSupported: true,
		},
	],
	[EVMNetwork.METIS]: [{ rpc: 'https://andromeda.metis.io/?owner=1088' }],
};
