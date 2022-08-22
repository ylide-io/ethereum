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
    AVALANCHE = 6
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
