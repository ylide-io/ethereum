import type { ConnectorScope } from '@ylide/sdk';
import { evmBlockchainFactories, evmWalletFactories } from './controllers';
import { EVMNetwork } from './misc';

export * from './contract-wrappers';
export * from './controllers';
export * from './messages-sources';
export * from './misc';

export const evm: ConnectorScope = {
	walletFactories: [
		evmWalletFactories.binance,
		evmWalletFactories.coinbase,
		evmWalletFactories.trustwallet,
		evmWalletFactories.frontier,
		evmWalletFactories.metamask,
		evmWalletFactories.okx,
		evmWalletFactories.walletconnect,
	],
	blockchainFactories: [
		evmBlockchainFactories[EVMNetwork.ETHEREUM],
		evmBlockchainFactories[EVMNetwork.AVALANCHE],
		evmBlockchainFactories[EVMNetwork.ARBITRUM],
		evmBlockchainFactories[EVMNetwork.BNBCHAIN],
		evmBlockchainFactories[EVMNetwork.OPTIMISM],
		evmBlockchainFactories[EVMNetwork.POLYGON],
		evmBlockchainFactories[EVMNetwork.FANTOM],
		evmBlockchainFactories[EVMNetwork.KLAYTN],
		evmBlockchainFactories[EVMNetwork.GNOSIS],
		evmBlockchainFactories[EVMNetwork.AURORA],
		evmBlockchainFactories[EVMNetwork.CELO],
		evmBlockchainFactories[EVMNetwork.CRONOS],
		evmBlockchainFactories[EVMNetwork.MOONBEAM],
		evmBlockchainFactories[EVMNetwork.MOONRIVER],
		evmBlockchainFactories[EVMNetwork.METIS],
		evmBlockchainFactories[EVMNetwork.BASE],
		evmBlockchainFactories[EVMNetwork.ZETA],
		evmBlockchainFactories[EVMNetwork.LINEA],
	],
};
