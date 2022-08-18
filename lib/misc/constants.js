"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVM_RPCS = exports.EVM_CHAIN_ID_TO_NETWORK = exports.EVM_CHAINS = exports.EVM_NAMES = exports.EVM_CONTRACTS = void 0;
const types_1 = require("./types");
exports.EVM_CONTRACTS = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: {
        mailer: { address: '0x5FbDB2315678afecb367f032d93F642f64180aa3' },
        registry: { address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' },
    },
    [types_1.EVMNetwork.ETHEREUM]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.BNBCHAIN]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.POLYGON]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.AVALANCHE]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.OPTIMISM]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.ARBITRUM]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.AURORA]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.KLAYTN]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.GNOSIS]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.CRONOS]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.CELO]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.MOONRIVER]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.MOONBEAM]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.ASTAR]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.HECO]: { mailer: { address: '' }, registry: { address: '' } },
    [types_1.EVMNetwork.METIS]: { mailer: { address: '' }, registry: { address: '' } },
};
exports.EVM_NAMES = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: 'LOCAL_HARDHAT',
    [types_1.EVMNetwork.ETHEREUM]: 'ETHEREUM',
    [types_1.EVMNetwork.BNBCHAIN]: 'BNBCHAIN',
    [types_1.EVMNetwork.POLYGON]: 'POLYGON',
    [types_1.EVMNetwork.AVALANCHE]: 'AVALANCHE',
    [types_1.EVMNetwork.OPTIMISM]: 'OPTIMISM',
    [types_1.EVMNetwork.ARBITRUM]: 'ARBITRUM',
    [types_1.EVMNetwork.AURORA]: 'AURORA',
    [types_1.EVMNetwork.KLAYTN]: 'KLAYTN',
    [types_1.EVMNetwork.GNOSIS]: 'GNOSIS',
    [types_1.EVMNetwork.CRONOS]: 'CRONOS',
    [types_1.EVMNetwork.CELO]: 'CELO',
    [types_1.EVMNetwork.MOONRIVER]: 'MOONRIVER',
    [types_1.EVMNetwork.MOONBEAM]: 'MOONBEAM',
    [types_1.EVMNetwork.ASTAR]: 'ASTAR',
    [types_1.EVMNetwork.HECO]: 'HECO',
    [types_1.EVMNetwork.METIS]: 'METIS',
};
exports.EVM_CHAINS = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: 31337,
    [types_1.EVMNetwork.ETHEREUM]: 1,
    [types_1.EVMNetwork.BNBCHAIN]: 56,
    [types_1.EVMNetwork.POLYGON]: 137,
    [types_1.EVMNetwork.AVALANCHE]: 43114,
    [types_1.EVMNetwork.OPTIMISM]: 10,
    [types_1.EVMNetwork.ARBITRUM]: 42161,
    [types_1.EVMNetwork.AURORA]: 1313161554,
    [types_1.EVMNetwork.KLAYTN]: 8217,
    [types_1.EVMNetwork.GNOSIS]: 100,
    [types_1.EVMNetwork.CRONOS]: 25,
    [types_1.EVMNetwork.CELO]: 42220,
    [types_1.EVMNetwork.MOONRIVER]: 1285,
    [types_1.EVMNetwork.MOONBEAM]: 1284,
    [types_1.EVMNetwork.ASTAR]: 592,
    [types_1.EVMNetwork.HECO]: 128,
    [types_1.EVMNetwork.METIS]: 1088,
};
exports.EVM_CHAIN_ID_TO_NETWORK = Object.keys(exports.EVM_CHAINS)
    .map(network => ({
    [exports.EVM_CHAINS[network]]: Number(network),
}))
    .reduce((p, c) => ({ ...p, ...c }), {});
exports.EVM_RPCS = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: ['http://localhost:8545/'],
    [types_1.EVMNetwork.ETHEREUM]: [
        'wss://mainnet.infura.io/ws/v3/3bcb970aa2dd447cbad6ac4301ed63bf',
        'https://mainnet.infura.io/v3/3bcb970aa2dd447cbad6ac4301ed63bf',
        'https://eth-mainnet.public.blastapi.io',
        'https://eth-rpc.gateway.pokt.network',
    ],
    [types_1.EVMNetwork.BNBCHAIN]: [
        'https://bsc-dataseed.binance.org/',
        'https://bsc-dataseed2.binance.org',
        'https://bsc-dataseed3.binance.org',
    ],
    [types_1.EVMNetwork.POLYGON]: [
        'https://polygon-rpc.com',
        'https://rpc-mainnet.matic.quiknode.pro',
        'https://polygon-mainnet.public.blastapi.io',
    ],
    [types_1.EVMNetwork.AVALANCHE]: [
        'https://api.avax.network/ext/bc/C/rpc',
        'https://ava-mainnet.public.blastapi.io/ext/bc/C/rpc',
        'https://avalancheapi.terminet.io/ext/bc/C/rpc',
    ],
    [types_1.EVMNetwork.OPTIMISM]: [
        'https://mainnet.optimism.io',
        'https://optimism-mainnet.public.blastapi.io',
        'https://rpc.ankr.com/optimism',
    ],
    [types_1.EVMNetwork.ARBITRUM]: ['https://arb1.arbitrum.io/rpc', 'https://rpc.ankr.com/arbitrum'],
    [types_1.EVMNetwork.AURORA]: ['https://mainnet.aurora.dev'],
    [types_1.EVMNetwork.KLAYTN]: [
        'https://public-node-api.klaytnapi.com/v1/cypress',
        'https://klaytn01.fandom.finance',
        'https://klaytn02.fandom.finance',
    ],
    [types_1.EVMNetwork.GNOSIS]: [
        'https://rpc.gnosischain.com',
        'wss://rpc.gnosischain.com/wss',
        'https://xdai-rpc.gateway.pokt.network',
        'https://gnosis-mainnet.public.blastapi.io',
    ],
    [types_1.EVMNetwork.CRONOS]: ['https://evm.cronos.org', 'https://cronosrpc-1.xstaking.sg'],
    [types_1.EVMNetwork.CELO]: ['wss://forno.celo.org/ws', 'https://forno.celo.org', 'https://rpc.ankr.com/celo'],
    [types_1.EVMNetwork.MOONRIVER]: ['https://rpc.api.moonriver.moonbeam.network'],
    [types_1.EVMNetwork.MOONBEAM]: [
        'wss://wss.api.moonbeam.network',
        'https://rpc.api.moonbeam.network',
        'https://moonbeam.public.blastapi.io',
    ],
    [types_1.EVMNetwork.ASTAR]: ['https://rpc.astar.network:8545', 'https://astar.public.blastapi.io'],
    [types_1.EVMNetwork.HECO]: [
        'wss://ws-mainnet.hecochain.com',
        'https://http-mainnet.hecochain.com',
        'https://hecoapi.terminet.io/rpc',
    ],
    [types_1.EVMNetwork.METIS]: ['https://andromeda.metis.io/?owner=1088'],
};
//# sourceMappingURL=constants.js.map