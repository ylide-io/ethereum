import { Block, Log } from '@ethersproject/providers';
import { MailPushEvent } from '@ylide/ethereum-contracts/lib/YlideMailerV8';
import { Transaction } from 'ethers';

export enum EVMNetwork {
	LOCAL_HARDHAT,

	ETHEREUM,
	BNBCHAIN,
	POLYGON,
	ARBITRUM,
	OPTIMISM,

	AVALANCHE,

	CRONOS,
	FANTOM,
	KLAYTN,
	GNOSIS,
	AURORA,
	CELO,
	MOONBEAM,
	MOONRIVER,
	METIS,
	ASTAR,

	// HECO,
}

export type IEthereumMessage<T extends Log> = { event: T; tx: Transaction; block: Omit<Block, 'transactions'> };

export interface IEthereumPushMessageBody {
	sender: string;
	msgId: string;
	key: Uint8Array;
}

export interface IEthereumContentMessageBody {
	sender: string;
	msgId: string;
	parts: number;
	partIdx: number;
	content: Uint8Array;
}

// export interface IEthereumContentMessage extends IEthereumMessage, IEthereumContentMessageBody {}
