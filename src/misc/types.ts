import { IYlideMailer, YlidePayV1, YlideSafeV1 } from '@ylide/ethereum-contracts';
import type { IMessage, MessageKey, Uint256 } from '@ylide/sdk';
import { BigNumber, BigNumberish, ethers } from 'ethers';
import { EthereumMailerV6Wrapper, EthereumMailerV7Wrapper, EthereumMailerV8Wrapper } from '../contract-wrappers';
import { EthereumMailerV9Wrapper } from '../contract-wrappers/v9';

export type EVMContracts = Record<EVMNetwork, IEVMNetworkContracts>;

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
	supplement?: IYlideMailer.SupplementStruct;
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

export enum EVMYlideSafeContractType {
	EVMYlideSafeV1 = 'EVMYlideSafeV1',
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
	safe?: IEVMYlideSafeContractLink;
}

export interface IEVMRegistryContractLink extends IEVMBaseContractLink {
	type: EVMRegistryContractType;
}

export interface IEVMYlidePayContractLink extends IEVMBaseContractLink {
	type: EVMYlidePayContractType;
}

export interface IEVMYlideSafeContractLink extends IEVMBaseContractLink {
	type: EVMYlideSafeContractType;
}

export interface IEVMNetworkContracts {
	mailerContracts: IEVMMailerContractLink[];
	registryContracts: IEVMRegistryContractLink[];
	payContracts: IEVMYlidePayContractLink[];
	safeContracts: IEVMYlideSafeContractLink[];

	currentRegistryId: number;
	currentMailerId: number;
}

export type IEVMMessage = IMessage<IEVMMeta>;

export type IHistorySource =
	| { type: 'recipient'; feedId: Uint256; recipient: Uint256 }
	| { type: 'broadcast'; feedId: Uint256 };

export type LogInternal = {
	log: ethers.providers.Log;
	logDescription: ethers.utils.LogDescription;
};

export enum ContractType {
	NONE,
	PAY,
	SAFE,
}

export type MailWrapperArgs = {
	mailer: IEVMMailerContractLink;
	signer: ethers.Signer;
	value: ethers.BigNumber;
};

export type Recipient = { address: Uint256; messageKey: MessageKey };

export type PayAttachment = {
	contentId: Uint256;
	amountOrTokenId: bigint;
	recipient: string;
	sender: string;
	token: string;
	tokenType: number;
};

export type YlideTokenAttachment = {
	kind: ContractType.PAY;
	attachments: PayAttachment[];
};

export type SupplementPay = {
	kind: ContractType.PAY;
	data: YlidePayV1.TransferInfoStruct[];
	deadline: number;
};

export type SupplementSafe = {
	kind: ContractType.SAFE;
	data: YlideSafeV1.SafeArgsStruct;
	deadline: number;
};

export type Options = {
	network?: EVMNetwork;
	value?: BigNumber;
	supplement?: SupplementPay | SupplementSafe;
};

export type YlideSignArgs = {
	mailer: IEVMMailerContractLink;
	signer: ethers.providers.JsonRpcSigner;
	deadline: BigNumberish;
	nonce: BigNumberish;
	chainId: number;
};

export type MailerWrapper =
	| EthereumMailerV6Wrapper
	| EthereumMailerV7Wrapper
	| EthereumMailerV8Wrapper
	| EthereumMailerV9Wrapper;

export type SafeMail = {
	safeSender: string;
	safeRecipients: string[];
	contentId: Uint256;
};
