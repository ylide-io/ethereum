import { IMessage, Uint256 } from '@ylide/sdk';

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

export interface IEVMEvent<Parsed = {}> {
	blockNumber: number;
	blockHash: string;

	transactionHash: string;
	transactionIndex: number;

	logIndex: number;

	eventName: string;
	topics: Array<string>;
	data: string;

	parsed: Parsed;
}

export interface IEVMEnrichedEvent<ParsedEvent = {}> {
	event: IEVMEvent<ParsedEvent>;
	tx: IEVMTransaction;
	block: IEVMBlock;
}

export interface IEVMMeta extends IEVMEnrichedEvent {
	contentId: Uint256;
	index: number[];
}

export enum EVMMailerContractType {
	YlideMailerV6 = 'YlideMailerV6',
	YlideMailerV7 = 'YlideMailerV7',
	YlideMailerV8 = 'YlideMailerV8',
}

export enum EVMRegistryContractType {
	YlideRegistryV3 = 'YlideRegistryV3',
	YlideRegistryV5 = 'YlideRegistryV5',
	YlideRegistryV6 = 'YlideRegistryV6',
}

export interface IEVMBaseContractLink {
	id: number;
	verified: boolean;
	address: string;
	creationBlock: number;
}

export interface IEVMMailerContractLink extends IEVMBaseContractLink {
	type: EVMMailerContractType;
}

export interface IEVMRegistryContractLink extends IEVMBaseContractLink {
	type: EVMRegistryContractType;
}

export interface IEVMNetworkContracts {
	mailerContracts: IEVMMailerContractLink[];
	registryContracts: IEVMRegistryContractLink[];

	currentRegistryId: number;
	currentMailerId: number;
}

export type IEVMMessage = IMessage<IEVMMeta>;

export type IHistorySource = { type: 'recipient'; recipient: Uint256 } | { type: 'broadcast'; sender: string };
