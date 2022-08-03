import SmartBuffer from '@ylide/smart-buffer';
import {
	AbstractBlockchainController,
	IMessage,
	RetrievingMessagesOptions,
	IMessageContent,
	IMessageCorruptedContent,
	MessageContentFailure,
	IExtraEncryptionStrateryBulk,
	IExtraEncryptionStrateryEntry,
	MessageKey,
	PublicKey,
	PublicKeyType,
	BlockchainControllerFactory,
	Uint256,
	hexToUint256,
	bigIntToUint256,
} from '@ylide/sdk';
import { DEV_MAILER_ADDRESS, DEV_REGISTRY_ADDRESS, MAILER_ADDRESS, REGISTRY_ADDRESS } from '../misc/constants';
import { MailerContract, RegistryContract } from '../contracts';
import { IEthereumContentMessageBody, IEthereumMessage } from '../misc';
import Web3 from 'web3';
import { Transaction } from 'web3-core';
import { BlockTransactionString } from 'web3-eth';
import { EventData } from 'web3-eth-contract';

export class EthereumBlockchainController extends AbstractBlockchainController {
	web3: Web3;

	readonly MESSAGES_FETCH_LIMIT = 50;

	readonly mailerContract: MailerContract;
	readonly registryContract: RegistryContract;

	constructor(
		options: {
			dev?: boolean;
			mailerContractAddress?: string;
			registryContractAddress?: string;
			web3Provider?: any;
		} = {},
	) {
		super(options);

		// @ts-ignore
		this.web3 = window.www3 = new Web3(options?.web3Provider || Web3.givenProvider);

		this.mailerContract = new MailerContract(
			this,
			options.mailerContractAddress || (options.dev ? DEV_MAILER_ADDRESS : MAILER_ADDRESS),
		);
		this.registryContract = new RegistryContract(
			this,
			options.registryContractAddress || (options.dev ? DEV_REGISTRY_ADDRESS : REGISTRY_ADDRESS),
		);
	}

	async getRecipientReadingRules(address: string): Promise<any> {
		return [];
	}

	async extractAddressFromPublicKey(publicKey: PublicKey): Promise<string | null> {
		return this.registryContract.getAddressByPublicKey(publicKey.bytes);
	}

	async extractPublicKeyFromAddress(address: string): Promise<PublicKey | null> {
		const rawKey = await this.registryContract.getPublicKeyByAddress(address);
		if (!rawKey) {
			return null;
		}
		return PublicKey.fromBytes(PublicKeyType.YLIDE, rawKey);
	}

	private async binSearchMessages(fromBlock?: number, toBlock?: number) {
		if (!toBlock) {
			toBlock = await this.web3.eth.getBlockNumber();
		}
		if (!fromBlock) {
			fromBlock = 0;
		}
	}

	private async getBlockNumberByTime(
		time: number,
		firstBlock?: BlockTransactionString,
		lastBlock?: BlockTransactionString,
	): Promise<BlockTransactionString> {
		if (!firstBlock) {
			firstBlock = await this.web3.eth.getBlock(0, false);
		}
		if (time <= firstBlock.timestamp) {
			return firstBlock;
		}
		if (!lastBlock) {
			const lastBlockNumber = await this.web3.eth.getBlockNumber();
			lastBlock = await this.web3.eth.getBlock(lastBlockNumber, false);
		}
		if (time >= lastBlock.timestamp) {
			return lastBlock;
		}
		const middleBlockNumber = Math.floor((firstBlock.number + lastBlock.number) / 2);
		const middleBlock = await this.web3.eth.getBlock(middleBlockNumber, false);
		if (time >= middleBlock.timestamp) {
			return this.getBlockNumberByTime(time, middleBlock, lastBlock);
		} else {
			return this.getBlockNumberByTime(time, firstBlock, middleBlock);
		}
	}

	private async binSearchBlocks(fromTime?: number, toTime?: number) {
		const firstBlock = await this.web3.eth.getBlock(0, false);
		const lastBlockNumber = await this.web3.eth.getBlockNumber();
		const lastBlock = await this.web3.eth.getBlock(lastBlockNumber, false);
		const fromBlock = await this.getBlockNumberByTime(fromTime || 0, firstBlock, lastBlock);
		const toBlock = await this.getBlockNumberByTime(toTime || Number(lastBlock.timestamp), firstBlock, lastBlock);
		return { fromBlock, toBlock };
	}

	async retrieveMessageHistoryByTime(
		recipient: Uint256 | null,
		fromTimestamp?: number,
		toTimestamp?: number,
	): Promise<IMessage[]> {
		const { fromNumber, toNumber } = await this.binSearchBlockNumbers(fromTimestamp, toTimestamp);
	}

	retrieveMessageHistoryByBounds(
		recipient: Uint256 | null,
		fromMessage?: IMessage,
		toMessage?: IMessage,
	): Promise<IMessage[]> {
		//
	}

	// message history block
	// Query messages by interval options.since (included) - options.to (excluded)
	async retrieveMessageHistoryByDates(
		recipientAddress: Uint256,
		options?: RetrieveByDatesOptions,
	): Promise<IMessage[]> {
		const fullMessages: IMessage[] = [];

		console.log('bbb');

		while (true) {
			const messages = await this.queryMessagesList(recipientAddress, null, null);

			if (!messages.length) break;

			let foundDuplicate = false;

			fullMessages.push(
				...(await Promise.all(
					messages.map(async m => {
						if (m.msgId === options?.toMessage?.msgId) {
							foundDuplicate = true;
						}
						console.log('ggg');
						const content = await this.retrieveMessageContentByMsgId(m.msgId);
						if (content && !content.corrupted) {
							m.isContentLoaded = true;
							m.contentLink = content;
						}
						return m;
					}),
				)),
			);

			if (foundDuplicate) break;
			if (messages.length < this.MESSAGES_FETCH_LIMIT) break;

			// untilDate = messages[0].created_at * 1000;
		}

		return fullMessages;
	}

	async retrieveAndVerifyMessageContent(msg: IMessage): Promise<IMessageContent | IMessageCorruptedContent | null> {
		const result = await this.retrieveMessageContentByMsgId(msg.msgId);
		if (!result) {
			return null;
		}
		if (result.corrupted) {
			return result;
		}
		if (result.senderAddress !== msg.senderAddress) {
			return {
				msgId: msg.msgId,
				corrupted: true,
				chunks: [],
				reason: MessageContentFailure.NON_INTEGRITY_PARTS,
			};
		}
		return result;
	}

	async retrieveMessageContentByMsgId(msgId: string): Promise<IMessageContent | IMessageCorruptedContent | null> {
		console.log('hhh');
		const msgIdAsUint256 = BigInt('0x' + msgId).toString(10);
		console.log('iii: ', msgId);
		const messages = await this.processMessages(
			await this.mailerContract.contract.getPastEvents('MailContent', {
				filter: {
					msgId: '0x' + msgId,
				},
			}),
		);
		console.log('aaa');
		if (!messages.length) {
			return null;
		}
		let decodedChunks: { msg: IEthereumMessage; body: IEthereumContentMessageBody }[];
		try {
			decodedChunks = messages.map((m: IEthereumMessage) => ({
				msg: m,
				body: this.mailerContract.decodeContentMessageBody(m.event),
			}));
		} catch (err) {
			return {
				msgId,
				corrupted: true,
				chunks: messages.map((m: IEthereumMessage) => ({ createdAt: Number(m.block.timestamp) })),
				reason: MessageContentFailure.NON_DECRYPTABLE,
			};
		}
		const parts = decodedChunks[0].body.parts;
		const sender = decodedChunks[0].body.sender;
		if (!decodedChunks.every(t => t.body.parts === parts) || !decodedChunks.every(t => t.body.sender === sender)) {
			return {
				msgId,
				corrupted: true,
				chunks: decodedChunks.map(m => ({ createdAt: Number(m.msg.block.timestamp) })),
				reason: MessageContentFailure.NON_INTEGRITY_PARTS,
			};
		}
		for (let idx = 0; idx < parts; idx++) {
			if (!decodedChunks.find(d => d.body.partIdx === idx)) {
				return {
					msgId,
					corrupted: true,
					chunks: decodedChunks.map(m => ({ createdAt: Number(m.msg.block.timestamp) })),
					reason: MessageContentFailure.NOT_ALL_PARTS,
				};
			}
		}
		if (decodedChunks.length !== parts) {
			return {
				msgId,
				corrupted: true,
				chunks: decodedChunks.map(m => ({ createdAt: Number(m.msg.block.timestamp) })),
				reason: MessageContentFailure.DOUBLED_PARTS,
			};
		}
		const sortedChunks = decodedChunks
			.sort((a, b) => {
				return a.body.partIdx - b.body.partIdx;
			})
			.map(m => m.body.content);
		const contentSize = sortedChunks.reduce((p, c) => p + c.length, 0);
		const buf = SmartBuffer.ofSize(contentSize);
		for (const chunk of sortedChunks) {
			buf.writeBytes(chunk);
		}

		return {
			msgId,
			corrupted: false,
			storage: 'everscale',
			createdAt: Math.min(...decodedChunks.map(d => Number(d.msg.block.timestamp))),
			senderAddress: sender,
			parts,
			content: buf.bytes,
		};
	}

	private formatPushMessage(message: IEthereumMessage): IMessage {
		const { recipient: recipientUint256, sender, msgId, key } = message.event.returnValues;
		const recipient = bigIntToUint256(String(recipientUint256));
		const createdAt = message.block.timestamp;

		return {
			msgId: bigIntToUint256(msgId),
			createdAt: Number(createdAt),
			senderAddress: sender,
			recipientAddress: recipient,
			blockchain: 'ethereum',

			key: SmartBuffer.ofHexString(key.substring(2)).bytes,

			isContentLoaded: false,
			isContentDecrypted: false,
			contentLink: null,
			decryptedContent: null,

			blockchainMeta: message,
			userspaceMeta: null,
		};
	}

	isAddressValid(address: string): boolean {
		return this.web3.utils.isAddress(address);
	}

	private async processMessages(msgs: EventData[]): Promise<IEthereumMessage[]> {
		const txHashes = msgs.map(e => e.transactionHash).filter((e, i, a) => a.indexOf(e) === i);
		const blockHashes = msgs.map(e => e.blockHash).filter((e, i, a) => a.indexOf(e) === i);
		const batch = new this.web3.BatchRequest();
		const txsPromise: Promise<Transaction[]> = Promise.all(
			txHashes.map(
				txHash =>
					new Promise<Transaction>((resolve, reject) => {
						batch.add(
							// @ts-ignore
							this.web3.eth.getTransaction.request(txHash, (err, tx) => {
								if (err) {
									return reject(err);
								} else {
									return resolve(tx);
								}
							}),
						);
					}),
			),
		);
		const blocksPromise: Promise<BlockTransactionString[]> = Promise.all(
			blockHashes.map(
				blockHash =>
					new Promise<BlockTransactionString>((resolve, reject) => {
						batch.add(
							// @ts-ignore
							this.web3.eth.getBlock.request(blockHash, false, (err, block) => {
								if (err) {
									return reject(err);
								} else {
									return resolve(block);
								}
							}),
						);
					}),
			),
		);
		batch.execute();
		const txs = await txsPromise;
		const blocks = await blocksPromise;
		const txMap: Record<string, Transaction> = txs.reduce(
			(p, c) => ({
				...p,
				[c.hash]: c,
			}),
			{},
		);
		const blockMap: Record<string, BlockTransactionString> = blocks.reduce(
			(p, c) => ({
				...p,
				[c.hash]: c,
			}),
			{},
		);

		return msgs.map(ev => ({ event: ev, tx: txMap[ev.transactionHash], block: blockMap[ev.blockHash] }));
	}

	// Query messages by interval sinceDate(excluded) - untilDate (excluded)
	private async queryMessagesList(
		recipientAddress: Uint256,
		fromBlock: number | null,
		toBlock: number | 'latest' | null,
	): Promise<IMessage[]> {
		const events = await this.mailerContract.contract.getPastEvents('MailPush', {
			filter: {
				recipient: '0x' + recipientAddress,
			},
			fromBlock: fromBlock || 0,
			toBlock: toBlock || 'latest',
		});

		const msgs = await this.processMessages(events);

		const messages = msgs.map(ev => this.formatPushMessage(ev));

		return messages;
	}

	async getExtraEncryptionStrategiesFromAddress(address: string): Promise<IExtraEncryptionStrateryEntry[]> {
		return [];
	}

	getSupportedExtraEncryptionStrategies(): string[] {
		return [];
	}

	async prepareExtraEncryptionStrategyBulk(
		entries: IExtraEncryptionStrateryEntry[],
	): Promise<IExtraEncryptionStrateryBulk> {
		throw new Error('No native strategies supported for Ethereum');
	}

	async executeExtraEncryptionStrategy(
		entries: IExtraEncryptionStrateryEntry[],
		bulk: IExtraEncryptionStrateryBulk,
		addedPublicKeyIndex: number | null,
		messageKey: Uint8Array,
	): Promise<MessageKey[]> {
		throw new Error('No native strategies supported for Ethereum');
	}

	uint256ToAddress(value: Uint8Array, withPrefix: boolean = true): string {
		return '0x' + new SmartBuffer(value.slice(12)).toHexString();
	}

	addressToUint256(address: string): Uint256 {
		const lowerAddress = address.toLowerCase();
		const cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
		console.log('yonny: ', ''.padStart(24, '0') + cleanHexAddress);
		return hexToUint256(''.padStart(24, '0') + cleanHexAddress);
	}
}

export const ethereumBlockchainFactory: BlockchainControllerFactory = {
	create: (options?: any) => new EthereumBlockchainController(options),
	blockchain: 'ethereum',
};
