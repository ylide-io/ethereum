"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVM_RPCS = exports.EVM_CHAIN_ID_TO_NETWORK = exports.EVM_CHAINS = exports.EVM_ENS = exports.EVM_NAMES = exports.EVM_CONTRACTS = void 0;
const types_1 = require("./types");
exports.EVM_CONTRACTS = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: {
        mailer: { address: '0x5FbDB2315678afecb367f032d93F642f64180aa3' },
        registry: { address: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82' },
    },
    [types_1.EVMNetwork.ETHEREUM]: {
        mailer: { address: '0xec77e30c68ac3b496f0a713e9a9e6ad0d0a0a93f', fromBlock: 15372374 },
        registry: { address: '0xf1564eB529cDe03250943f946Ea307301aa19235', fromBlock: 15372319 },
    },
    [types_1.EVMNetwork.BNBCHAIN]: {
        mailer: { address: '0xa445a576d0f6fa6baa23f805da804c6ff1c0f886', fromBlock: 20582134 },
        registry: { address: '0x9702e74Bd5Fc0aA5586cbBF236dfC72ee1C93579', fromBlock: 20582146 },
    },
    [types_1.EVMNetwork.POLYGON]: {
        mailer: { address: '0x28D9Bb1AEd64C115dD70e886C546ee0420623BC2', fromBlock: 32039400 },
        registry: { address: '0xCdb5D5E87E29fB5Fccff8fF5c2A9827705C0A260', fromBlock: 32039400 },
    },
    [types_1.EVMNetwork.AVALANCHE]: {
        mailer: { address: '0x28D9Bb1AEd64C115dD70e886C546ee0420623BC2', fromBlock: 18851746 },
        registry: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 18851846 },
    },
    [types_1.EVMNetwork.OPTIMISM]: {
        mailer: { address: '0x28d9bb1aed64c115dd70e886c546ee0420623bc2', fromBlock: 19796019 },
        registry: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 19796104 },
    },
    [types_1.EVMNetwork.ARBITRUM]: {
        mailer: { address: '0x79935f5d685452c361058c0fe5a50b803aa214a1', fromBlock: 20707340 },
        registry: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 20707262 },
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
exports.EVM_NAMES = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: 'LOCAL_HARDHAT',
    [types_1.EVMNetwork.ETHEREUM]: 'ETHEREUM',
    [types_1.EVMNetwork.BNBCHAIN]: 'BNBCHAIN',
    [types_1.EVMNetwork.POLYGON]: 'POLYGON',
    [types_1.EVMNetwork.AVALANCHE]: 'AVALANCHE',
    [types_1.EVMNetwork.OPTIMISM]: 'OPTIMISM',
    [types_1.EVMNetwork.ARBITRUM]: 'ARBITRUM',
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
exports.EVM_ENS = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: null,
    [types_1.EVMNetwork.ETHEREUM]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    [types_1.EVMNetwork.BNBCHAIN]: null,
    [types_1.EVMNetwork.POLYGON]: null,
    [types_1.EVMNetwork.AVALANCHE]: null,
    [types_1.EVMNetwork.OPTIMISM]: null,
    [types_1.EVMNetwork.ARBITRUM]: null,
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
exports.EVM_CHAINS = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: 31337,
    [types_1.EVMNetwork.ETHEREUM]: 1,
    [types_1.EVMNetwork.BNBCHAIN]: 56,
    [types_1.EVMNetwork.POLYGON]: 137,
    [types_1.EVMNetwork.AVALANCHE]: 43114,
    [types_1.EVMNetwork.OPTIMISM]: 10,
    [types_1.EVMNetwork.ARBITRUM]: 42161,
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
exports.EVM_CHAIN_ID_TO_NETWORK = Object.keys(exports.EVM_CHAINS)
    .map(network => ({
    [exports.EVM_CHAINS[network]]: Number(network),
}))
    .reduce((p, c) => ({ ...p, ...c }), {});
exports.EVM_RPCS = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: [{ rpc: 'http://localhost:8545/' }],
    [types_1.EVMNetwork.ETHEREUM]: [
        { rpc: 'https://eth-mainnet.g.alchemy.com/v2/MbanB2kJ4QyiFjOlUTSmkUj8lfbU6T6K' },
        { rpc: 'wss://mainnet.infura.io/ws/v3/3bcb970aa2dd447cbad6ac4301ed63bf' },
        { rpc: 'https://mainnet.infura.io/v3/3bcb970aa2dd447cbad6ac4301ed63bf' },
        { rpc: 'https://eth-mainnet.public.blastapi.io' },
        { rpc: 'https://eth-rpc.gateway.pokt.network' },
    ],
    [types_1.EVMNetwork.BNBCHAIN]: [
        {
            rpc: 'https://still-tiniest-surf.bsc.discover.quiknode.pro/390c72acf357bb7fc5f2b9175a08d48b774c69db/',
            blockLimit: 3500,
        },
        { rpc: 'https://bsc-dataseed.binance.org/' },
        { rpc: 'https://bsc-dataseed2.binance.org' },
        { rpc: 'https://bsc-dataseed3.binance.org' },
    ],
    [types_1.EVMNetwork.POLYGON]: [
        { rpc: 'https://polygon-mainnet.g.alchemy.com/v2/QsyQEuK4OgNSuo086MfKTXhO4DQCfYFu' },
        // 'https://polygon-mainnet.infura.io/v3/3bcb970aa2dd447cbad6ac4301ed63bf',
        // 'https://polygon-rpc.com',
        // 'https://rpc-mainnet.matic.quiknode.pro',
        // 'https://polygon-mainnet.public.blastapi.io',
    ],
    [types_1.EVMNetwork.ARBITRUM]: [
        { rpc: 'https://arb-mainnet.g.alchemy.com/v2/KY0LKW4PMTxWlVz8DkyBZ_IODtnn5_7r' },
        { rpc: 'https://arb1.arbitrum.io/rpc' },
        { rpc: 'https://rpc.ankr.com/arbitrum' },
    ],
    [types_1.EVMNetwork.OPTIMISM]: [
        { rpc: 'https://opt-mainnet.g.alchemy.com/v2/G8JwqBBJNnRouFnVbsmGA0E4WZtJNqPO' },
        { rpc: 'https://mainnet.optimism.io' },
        { rpc: 'https://optimism-mainnet.public.blastapi.io' },
        { rpc: 'https://rpc.ankr.com/optimism' },
    ],
    [types_1.EVMNetwork.AVALANCHE]: [
        // {
        // 	rpc: 'https://serene-proud-snowflake.avalanche-mainnet.discover.quiknode.pro/205e5b82f885604ee4428c55a512d4ff9d4c4815/',
        // },
        { rpc: 'https://api.avax.network/ext/bc/C/rpc' },
        // { rpc: 'https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc' },
        // { rpc: 'https://avalancheapi.terminet.io/ext/bc/C/rpc' },
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
//# sourceMappingURL=constants.js.map