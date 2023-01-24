import { Block, Log } from '@ethersproject/providers';
import { Transaction } from 'ethers';
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
export declare type IEthereumMessage<T extends Log> = {
    event: T;
    tx: Transaction;
    block: Omit<Block, 'transactions'>;
};
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
