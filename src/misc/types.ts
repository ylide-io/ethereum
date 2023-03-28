import type { IMessage, Uint256 } from '@ylide/sdk';
import { ethers } from 'ethers';
import { YlideStreamSablierV1 } from '@mock/ethereum-contracts/typechain-types';
import { IYlidePayStake } from '@mock/ethereum-contracts/typechain-types/contracts/YlidePayV1';

export enum EVMNetwork {
	LOCAL_HARDHAT, //  = 'LOCAL_HARDHAT',

	ETHEREUM, //  = 'ETHEREUM',
	BNBCHAIN, //  = 'BNBCHAIN',
	POLYGON, //  = 'POLYGON',
	ARBITRUM, //  = 'ARBITRUM',
	OPTIMISM, //  = 'OPTIMISM',
	AVALANCHE, //  = 'AVALANCHE',
	CRONOS, //  = 'CRONOS',
	FANTOM, //  = 'FANTOM',
	KLAYTN, //  = 'KLAYTN',
	GNOSIS, //  = 'GNOSIS',
	AURORA, //  = 'AURORA',
	CELO, //  = 'CELO',
	MOONBEAM, //  = 'MOONBEAM',
	MOONRIVER, //  = 'MOONRIVER',
	METIS, //  = 'METIS',
	ASTAR, //  = 'ASTAR',
}

export interface IEVMBlock {
	hash: string;
	parentHash: string;
	// eslint-disable-next-line id-denylist
	number: number;
	timestamp: number;
}

export interface IEVMTransaction {
	hash: string;

	from: string;
	to: string | null;
	nonce: number;

	data: string;
	value: string;
	chainId: number;
}

export interface IEVMEvent<Parsed = object> {
	blockNumber: number;
	blockHash: string;

	transactionHash: string;
	transactionIndex: number;

	logIndex: number;

	eventName: string;
	topics: string[];
	data: string;

	parsed: Parsed;
}

export interface IEVMEnrichedEvent<ParsedEvent = object> {
	event: IEVMEvent<ParsedEvent>;
	tx: IEVMTransaction;
	block: IEVMBlock;
}

export interface IEVMMeta extends IEVMEnrichedEvent {
	contentId: Uint256;
	index: number[];
}

export enum EVMMailerContractType {
	EVMMailerV6 = 'EVMMailerV6',
	EVMMailerV7 = 'EVMMailerV7',
	EVMMailerV8 = 'EVMMailerV8',
	EVMMailerV9 = 'EVMMailerV9',
}

export enum EVMRegistryContractType {
	EVMRegistryV3 = 'EVMRegistryV3',
	EVMRegistryV4 = 'EVMRegistryV4',
	EVMRegistryV5 = 'EVMRegistryV5',
	EVMRegistryV6 = 'EVMRegistryV6',
}

export enum EVMYlidePayContractType {
	EVMYlidePayV1 = 'EVMYlidePayV1',
}
export enum EVMYlideStakeContractType {
	EVMYlideStakeV1 = 'EVMYlideStakeV1',
}
export enum EVMYlideStreamSablierContractType {
	EVMYlideStreamSablierV1 = 'EVMYlideStreamSablierV1',
}

export interface IEVMBaseContractLink {
	id: number;
	verified: boolean;
	address: string;
	creationBlock: number;
	terminationBlock?: number;
}

export interface IEVMMailerContractLink extends IEVMBaseContractLink {
	type: EVMMailerContractType;
	ylidePayContract: string;
	ylideStakeContract: string;
	ylideStreamSablierContract: string;
}

export interface IEVMRegistryContractLink extends IEVMBaseContractLink {
	type: EVMRegistryContractType;
}

export interface IEVMYlidePayContractType extends IEVMBaseContractLink {
	type: EVMYlidePayContractType;
}

export interface IEVMYlideStakeContractType extends IEVMBaseContractLink {
	type: EVMYlideStakeContractType;
}

export interface IEVMYlideStreamSablierContractType extends IEVMBaseContractLink {
	type: EVMYlideStreamSablierContractType;
}

export interface IEVMNetworkContracts {
	mailerContracts: IEVMMailerContractLink[];
	registryContracts: IEVMRegistryContractLink[];

	ylidePayContracts: IEVMYlidePayContractType[];
	ylideStakeContracts: IEVMYlideStakeContractType[];
	ylideStreamSablierContracts: IEVMYlideStreamSablierContractType[];

	currentRegistryId: number;
	currentMailerId: number;
}

export type IEVMMessage = IMessage<IEVMMeta>;

export type IHistorySource =
	| { type: 'recipient'; feedId: Uint256; recipient: Uint256 }
	| { type: 'broadcast'; feedId: Uint256 };

export enum TokenAttachmentContractType {
	Pay = 'Pay',
	Stake = 'Stake',
	StreamSablier = 'StreamSablier',
}

export type Payment = {
	type: TokenAttachmentContractType;
	args: IYlidePayStake.TransferInfoStruct[] | YlideStreamSablierV1.StreamInfoStruct[];
};

export type LogInternal = {
	log: ethers.providers.Log;
	logDescription: ethers.utils.LogDescription;
};
