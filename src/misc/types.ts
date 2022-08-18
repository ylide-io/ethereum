import { Transaction } from 'web3-core';
import { BlockTransactionString } from 'web3-eth';
import { EventData } from 'web3-eth-contract';

export enum EVMNetwork {
	LOCAL_HARDHAT,

	ETHEREUM,
	BNBCHAIN,
	POLYGON,
	AVALANCHE,
	OPTIMISM,

	ARBITRUM,
	AURORA,
	KLAYTN,
	GNOSIS,
	CRONOS,

	CELO,
	MOONRIVER,
	MOONBEAM,
	ASTAR,
	HECO,

	METIS,
}

export type IEthereumMessage = { event: EventData; tx: Transaction; block: BlockTransactionString };

export interface IEthereumPushMessageBody {
	sender: string;
	msgId: string;
	key: Uint8Array;
}

export interface IEthereumPushMessage extends IEthereumMessage, IEthereumPushMessageBody {}

export interface IEthereumContentMessageBody {
	sender: string;
	msgId: string;
	parts: number;
	partIdx: number;
	content: Uint8Array;
}

export interface IEthereumContentMessage extends IEthereumMessage, IEthereumContentMessageBody {}