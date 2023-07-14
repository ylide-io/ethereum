import type { IYlideMailer, YlidePayV1 } from '@ylide/ethereum-contracts';
import type { TokenAttachmentEventObject } from '@ylide/ethereum-contracts/lib/contracts/YlidePayV1';
import type { IMessage, Uint256 } from '@ylide/sdk';
import type { BigNumberish, ethers } from 'ethers';

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
	SHARDEUM, //  = 'SHARDEUM',
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
	supplement?: IYlideMailer.SupplementStruct;
	extraPayment?: string;
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
export interface IEVMBaseContractLink {
	id: number;
	verified: boolean;
	address: string;
	creationBlock: number;
	terminationBlock?: number;
}

export interface IEVMMailerContractLink extends IEVMBaseContractLink {
	type: EVMMailerContractType;
	pay?: IEVMYlidePayContractLink;
}

export interface IEVMRegistryContractLink extends IEVMBaseContractLink {
	type: EVMRegistryContractType;
}

export interface IEVMYlidePayContractLink extends IEVMBaseContractLink {
	type: EVMYlidePayContractType;
}

export interface IEVMNetworkContracts {
	mailerContracts: IEVMMailerContractLink[];
	registryContracts: IEVMRegistryContractLink[];
	payContracts: IEVMYlidePayContractLink[];

	currentRegistryId: number;
	currentMailerId: number;
}

export type IEVMMessage = IMessage<IEVMMeta>;

export type IHistorySource =
	| { type: 'recipient'; feedId: Uint256; recipient: Uint256 }
	| { type: 'broadcast'; feedId: Uint256 };

export enum TokenAttachmentContractType {
	Pay,
	Stake,
	StreamSablier,
}

export type Pay = {
	kind: TokenAttachmentContractType.Pay;
	args: YlidePayV1.TransferInfoStruct[];
};

export type YlidePayment = Pay;

export type PayAttachment = {
	kind: TokenAttachmentContractType.Pay;
	attachments: TokenAttachmentEventObject[];
};

export type StakeAttachment = {
	kind: TokenAttachmentContractType.Stake;
	attachments: TokenAttachmentEventObject[];
};

export type YlideTokenAttachment = PayAttachment | StakeAttachment;

export type LogInternal = {
	log: ethers.providers.Log;
	logDescription: ethers.utils.LogDescription;
};

export type GenerateSignatureCallback = (
	uniqueId: BigNumberish,
	firstBlockNumber?: BigNumberish,
	partsCount?: BigNumberish,
	blockCountLock?: BigNumberish,
	recipients?: string[],
	keys?: Uint8Array,
) => Promise<IYlideMailer.SignatureArgsStruct>;

export enum ContractType {
	NONE,
	PAY,
}
