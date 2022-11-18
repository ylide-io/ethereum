"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVM_RPCS = exports.EVM_CHAIN_ID_TO_NETWORK = exports.EVM_CHAINS = exports.EVM_ENS = exports.EVM_NAMES = exports.EVM_CONTRACTS = void 0;
const types_1 = require("./types");
exports.EVM_CONTRACTS = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: {
        mailer: { address: '0x5FbDB2315678afecb367f032d93F642f64180aa3' },
        registry: { address: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512' },
    },
    [types_1.EVMNetwork.ETHEREUM]: {
        registry: { address: '0xe90f1cd859a309dddbbf1ba4999bb911823ea0db', fromBlock: 15841992 },
        mailer: { address: '0x003c0ac0e7fff5452fb7de73925ce18f91660532', fromBlock: 15841992 },
    },
    [types_1.EVMNetwork.BNBCHAIN]: {
        registry: { address: '0x8c030408e3C873282B57033Fee38685F74E0CefF', fromBlock: 22544208 },
        mailer: { address: '0xBf52A156A8422464BD0b1859898Fa14a28537284', fromBlock: 22544208 },
    },
    [types_1.EVMNetwork.POLYGON]: {
        registry: { address: '0xff0e2f4c0351f78dcb5d05ba485aec76a1d0a851', fromBlock: 34868841 },
        mailer: { address: '0x003c0ac0e7fff5452fb7de73925ce18f91660532', fromBlock: 34868841 },
    },
    [types_1.EVMNetwork.AVALANCHE]: {
        registry: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 21613407 },
        mailer: { address: '0xCdb5D5E87E29fB5Fccff8fF5c2A9827705C0A260', fromBlock: 21613407 },
    },
    [types_1.EVMNetwork.OPTIMISM]: {
        registry: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 32046889 },
        mailer: { address: '0xCdb5D5E87E29fB5Fccff8fF5c2A9827705C0A260', fromBlock: 32046889 },
    },
    [types_1.EVMNetwork.ARBITRUM]: {
        registry: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 33111730 },
        mailer: { address: '0xCdb5D5E87E29fB5Fccff8fF5c2A9827705C0A260', fromBlock: 33111730 },
    },
    [types_1.EVMNetwork.CRONOS]: {
        registry: { address: '0x28D9Bb1AEd64C115dD70e886C546ee0420623BC2', fromBlock: 5286437 },
        mailer: { address: '0x79935f5d685452C361058C0Fe5a50B803AA214a1', fromBlock: 5286437 },
    },
    [types_1.EVMNetwork.FANTOM]: {
        registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 50113599 },
        mailer: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 50113599 },
    },
    [types_1.EVMNetwork.KLAYTN]: {
        registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 104982969 },
        mailer: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 104982969 },
    },
    [types_1.EVMNetwork.GNOSIS]: {
        registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 24758425 },
        mailer: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 24758425 },
    },
    [types_1.EVMNetwork.AURORA]: {
        registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 77156327 },
        mailer: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 77156327 },
    },
    [types_1.EVMNetwork.CELO]: {
        registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 15844403 },
        mailer: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 15844403 },
    },
    [types_1.EVMNetwork.MOONBEAM]: {
        registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 2169935 },
        mailer: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 2169935 },
    },
    [types_1.EVMNetwork.MOONRIVER]: {
        registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 2864035 },
        mailer: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 2864035 },
    },
    [types_1.EVMNetwork.METIS]: {
        registry: { address: '0xda1fa95A630Ba2EF6d96f15C9EB721aF0F64914E', fromBlock: 3886879 },
        mailer: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 3886879 },
    },
    [types_1.EVMNetwork.ASTAR]: {
        registry: { address: '0xDFEe2128E3D441078dC286171F27F612B35fD7bD', fromBlock: 2163788 },
        mailer: { address: '0xB195E6f456b350de42B14A4f2acEEa34E696cb75', fromBlock: 2163788 },
    },
};
exports.EVM_NAMES = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: 'LOCAL_HARDHAT',
    [types_1.EVMNetwork.ETHEREUM]: 'ETHEREUM',
    [types_1.EVMNetwork.BNBCHAIN]: 'BNBCHAIN',
    [types_1.EVMNetwork.POLYGON]: 'POLYGON',
    [types_1.EVMNetwork.AVALANCHE]: 'AVALANCHE',
    [types_1.EVMNetwork.OPTIMISM]: 'OPTIMISM',
    [types_1.EVMNetwork.ARBITRUM]: 'ARBITRUM',
    [types_1.EVMNetwork.CRONOS]: 'CRONOS',
    [types_1.EVMNetwork.FANTOM]: 'FANTOM',
    [types_1.EVMNetwork.KLAYTN]: 'KLAYTN',
    [types_1.EVMNetwork.GNOSIS]: 'GNOSIS',
    [types_1.EVMNetwork.AURORA]: 'AURORA',
    [types_1.EVMNetwork.CELO]: 'CELO',
    [types_1.EVMNetwork.MOONBEAM]: 'MOONBEAM',
    [types_1.EVMNetwork.MOONRIVER]: 'MOONRIVER',
    [types_1.EVMNetwork.METIS]: 'METIS',
    [types_1.EVMNetwork.ASTAR]: 'ASTAR',
};
exports.EVM_ENS = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: null,
    [types_1.EVMNetwork.ETHEREUM]: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    [types_1.EVMNetwork.BNBCHAIN]: null,
    [types_1.EVMNetwork.POLYGON]: null,
    [types_1.EVMNetwork.AVALANCHE]: null,
    [types_1.EVMNetwork.OPTIMISM]: null,
    [types_1.EVMNetwork.ARBITRUM]: null,
    [types_1.EVMNetwork.AURORA]: null,
    [types_1.EVMNetwork.FANTOM]: null,
    [types_1.EVMNetwork.KLAYTN]: null,
    [types_1.EVMNetwork.GNOSIS]: null,
    [types_1.EVMNetwork.CELO]: null,
    [types_1.EVMNetwork.MOONRIVER]: null,
    [types_1.EVMNetwork.MOONBEAM]: null,
    [types_1.EVMNetwork.ASTAR]: null,
    [types_1.EVMNetwork.METIS]: null,
    [types_1.EVMNetwork.CRONOS]: null,
};
exports.EVM_CHAINS = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: 31337,
    [types_1.EVMNetwork.ETHEREUM]: 1,
    [types_1.EVMNetwork.BNBCHAIN]: 56,
    [types_1.EVMNetwork.POLYGON]: 137,
    [types_1.EVMNetwork.AVALANCHE]: 43114,
    [types_1.EVMNetwork.OPTIMISM]: 10,
    [types_1.EVMNetwork.ARBITRUM]: 42161,
    [types_1.EVMNetwork.CRONOS]: 25,
    [types_1.EVMNetwork.FANTOM]: 250,
    [types_1.EVMNetwork.KLAYTN]: 8217,
    [types_1.EVMNetwork.GNOSIS]: 100,
    [types_1.EVMNetwork.AURORA]: 1313161554,
    [types_1.EVMNetwork.CELO]: 42220,
    [types_1.EVMNetwork.MOONBEAM]: 1284,
    [types_1.EVMNetwork.MOONRIVER]: 1285,
    [types_1.EVMNetwork.METIS]: 1088,
    [types_1.EVMNetwork.ASTAR]: 592,
};
exports.EVM_CHAIN_ID_TO_NETWORK = Object.keys(exports.EVM_CHAINS)
    .map(network => ({
    [exports.EVM_CHAINS[network]]: Number(network),
}))
    .reduce((p, c) => ({ ...p, ...c }), {});
exports.EVM_RPCS = {
    [types_1.EVMNetwork.LOCAL_HARDHAT]: [{ rpc: 'http://localhost:8545/' }],
    [types_1.EVMNetwork.ETHEREUM]: [
        { rpc: 'wss://eth-mainnet.g.alchemy.com/v2/MbanB2kJ4QyiFjOlUTSmkUj8lfbU6T6K' },
        { rpc: 'wss://mainnet.infura.io/ws/v3/3bcb970aa2dd447cbad6ac4301ed63bf' },
        { rpc: 'https://mainnet.infura.io/v3/3bcb970aa2dd447cbad6ac4301ed63bf' },
        { rpc: 'https://eth-mainnet.public.blastapi.io' },
        { rpc: 'https://eth-rpc.gateway.pokt.network' },
    ],
    [types_1.EVMNetwork.BNBCHAIN]: [
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
    [types_1.EVMNetwork.POLYGON]: [
        { rpc: 'wss://polygon-mainnet.g.alchemy.com/v2/QsyQEuK4OgNSuo086MfKTXhO4DQCfYFu' },
        { rpc: 'https://polygon-mainnet.g.alchemy.com/v2/QsyQEuK4OgNSuo086MfKTXhO4DQCfYFu' },
    ],
    [types_1.EVMNetwork.ARBITRUM]: [
        { rpc: 'wss://arb-mainnet.g.alchemy.com/v2/KY0LKW4PMTxWlVz8DkyBZ_IODtnn5_7r' },
        { rpc: 'https://arb-mainnet.g.alchemy.com/v2/KY0LKW4PMTxWlVz8DkyBZ_IODtnn5_7r' },
        { rpc: 'https://arb1.arbitrum.io/rpc' },
        { rpc: 'https://rpc.ankr.com/arbitrum' },
    ],
    [types_1.EVMNetwork.OPTIMISM]: [
        { rpc: 'wss://opt-mainnet.g.alchemy.com/v2/G8JwqBBJNnRouFnVbsmGA0E4WZtJNqPO' },
        { rpc: 'https://opt-mainnet.g.alchemy.com/v2/G8JwqBBJNnRouFnVbsmGA0E4WZtJNqPO' },
        { rpc: 'https://mainnet.optimism.io' },
        { rpc: 'https://optimism-mainnet.public.blastapi.io' },
        { rpc: 'https://rpc.ankr.com/optimism' },
    ],
    [types_1.EVMNetwork.AVALANCHE]: [
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
    [types_1.EVMNetwork.CRONOS]: [
        { rpc: 'https://evm.cronos.org', blockLimit: 2000 },
        { rpc: 'https://cronosrpc-1.xstaking.sg', blockLimit: 2000 },
    ],
    [types_1.EVMNetwork.FANTOM]: [{ rpc: 'https://rpc.fantom.network' }],
    [types_1.EVMNetwork.KLAYTN]: [
        { rpc: 'https://public-node-api.klaytnapi.com/v1/cypress', batchNotSupported: true },
        { rpc: 'https://klaytn01.fandom.finance' },
        { rpc: 'https://klaytn02.fandom.finance' },
    ],
    [types_1.EVMNetwork.GNOSIS]: [
        { rpc: 'wss://rpc.gnosischain.com/wss' },
        { rpc: 'https://rpc.gnosischain.com' },
        { rpc: 'https://xdai-rpc.gateway.pokt.network' },
        { rpc: 'https://gnosis-mainnet.public.blastapi.io' },
    ],
    [types_1.EVMNetwork.AURORA]: [{ rpc: 'https://mainnet.aurora.dev' }],
    [types_1.EVMNetwork.CELO]: [
        { rpc: 'wss://forno.celo.org/ws' },
        { rpc: 'https://forno.celo.org' },
        { rpc: 'https://rpc.ankr.com/celo' },
    ],
    [types_1.EVMNetwork.MOONBEAM]: [
        { rpc: 'wss://wss.api.moonbeam.network' },
        { rpc: 'https://rpc.api.moonbeam.network' },
        { rpc: 'https://moonbeam.public.blastapi.io' },
    ],
    [types_1.EVMNetwork.MOONRIVER]: [{ rpc: 'https://rpc.api.moonriver.moonbeam.network' }],
    [types_1.EVMNetwork.ASTAR]: [
        { rpc: 'https://astar-mainnet.g.alchemy.com/v2/Ib5I59bSB2Vv41PJlF2TWWqjND4ppGdi', blockLimit: 30000 },
        { rpc: 'wss://astar-mainnet.g.alchemy.com/v2/Ib5I59bSB2Vv41PJlF2TWWqjND4ppGdi', blockLimit: 30000 },
        {
            rpc: 'https://astar.blastapi.io/cc59bb68-a7ff-4278-9f16-278ba49d7635',
            blockLimit: 500,
            lastestNotSupported: true,
        },
    ],
    [types_1.EVMNetwork.METIS]: [{ rpc: 'https://andromeda.metis.io/?owner=1088' }],
};
//# sourceMappingURL=constants.js.map