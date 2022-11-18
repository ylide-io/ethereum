import { Transaction } from 'web3-core';
import { BlockTransactionString } from 'web3-eth';
import { EventData } from 'web3-eth-contract';
export declare enum EVMNetwork {
    LOCAL_HARDHAT = 0,
    ETHEREUM = 1,
    BNBCHAIN = 2,
    POLYGON = 3,
    ARBITRUM = 4,
    OPTIMISM = 5,
    AVALANCHE = 6,
    CRONOS = 7,
    FANTOM = 8,
    KLAYTN = 9,
    GNOSIS = 10,
    AURORA = 11,
    CELO = 12,
    MOONBEAM = 13,
    MOONRIVER = 14,
    METIS = 15,
    ASTAR = 16
}
export declare type IEthereumMessage = {
    event: EventData;
    tx: Transaction;
    block: BlockTransactionString;
};
export interface IEthereumPushMessageBody {
    sender: string;
    msgId: string;
    key: Uint8Array;
}
export interface IEthereumPushMessage extends IEthereumMessage, IEthereumPushMessageBody {
}
export interface IEthereumContentMessageBody {
    sender: string;
    msgId: string;
    parts: number;
    partIdx: number;
    content: Uint8Array;
}
export interface IEthereumContentMessage extends IEthereumMessage, IEthereumContentMessageBody {
}
