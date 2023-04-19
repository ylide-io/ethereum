import { IYlideMailer, YlidePayV1, YlideSafeV1 } from '@ylide/ethereum-contracts';
import { TokenAttachmentEventObject } from '@ylide/ethereum-contracts/lib/contracts/YlidePayV1';
import type { IMessage, MessageKey, Uint256 } from '@ylide/sdk';
import { BigNumber, BigNumberish, ethers } from 'ethers';
import { EthereumMailerV6Wrapper, EthereumMailerV7Wrapper, EthereumMailerV8Wrapper } from '../contract-wrappers';
import { EthereumMailerV9Wrapper } from '../contract-wrappers/v9';

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

export type YlideSafeArgs = YlideSafeV1.SafeArgsStruct;

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

export type MailWrapperArgs = {
	mailer: IEVMMailerContractLink;
	signer: ethers.Signer;
	from: string;
	value: ethers.BigNumber;
};

export type Recipient = { address: Uint256; messageKey: MessageKey };

export type Options = {
	network?: EVMNetwork;
	value?: BigNumber;
	generateSignature?: GenerateSignatureCallback;
	payments?: YlidePayment;
	safeArgs?: YlideSafeArgs;
};

export type MailerWrapper =
	| EthereumMailerV6Wrapper
	| EthereumMailerV7Wrapper
	| EthereumMailerV8Wrapper
	| EthereumMailerV9Wrapper;
