import SmartBuffer from '@ylide/smart-buffer';
import {
	AbstractBlockchainController,
	IMessage,
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
	uint256ToHex,
	ISourceSubject,
	uint256ToUint8Array,
	BlockchainSourceType,
	ExternalYlidePublicKey,
	asyncDelay,
} from '@ylide/sdk';
import { EVM_CONTRACTS, EVM_ENS, IEthereumContractLink } from '../misc/constants';
import { EVMNetwork, EVM_CHAINS, EVM_NAMES, EVM_RPCS, IEthereumContentMessageBody, IEVMEnrichedEvent } from '../misc';
import { EthereumNameService } from './EthereumNameService';
import { Semaphore } from 'semaphore-promise';

export class EthereumBlockchainController extends AbstractBlockchainController {
	readonly blockchainReader: EthereumBlockchainReader;
	readonly historyReader: EthereumHistoryReader;

	readonly MESSAGES_FETCH_LIMIT = 50;

	readonly mailerContractAddress: string;
	readonly mailerFirstBlock: number = 0;
	readonly registryContractAddress: string;
	readonly registryFirstBlock: number = 0;

	readonly network: EVMNetwork;
	readonly chainId: number;

	readonly nameService: EthereumNameService | null = null;

	private readonly txcs = new Semaphore(3);

	constructor(
		private readonly options: {
			network?: EVMNetwork;
			mailerContractAddress?: string;
			registryContractAddress?: string;
			nameServiceAddress?: string;
			web3Readers?: provider[];
		} = {},
	) {
		super(options);

		if (options.network === undefined) {
			throw new Error('You must provide network for EVM controller');
		}

		this.network = options.network;
		this.chainId = EVM_CHAINS[options.network];

		const chainNodes = EVM_RPCS[options.network];

		this.web3Readers = options.web3Readers
			? options.web3Readers.map(r => ({
					web3: new Web3(r),
					blockLimit: 0,
					latestNotSupported: false,
					batchNotSupported: false,
			  }))
			: chainNodes.map(data => {
					const url = data.rpc;
					if (url.startsWith('ws')) {
						return {
							web3: new Web3(new Web3.providers.WebsocketProvider(url)),
							blockLimit: data.blockLimit || 0,
							latestNotSupported: data.lastestNotSupported || false,
							batchNotSupported: data.batchNotSupported || false,
						};
					} else {
						return {
							web3: new Web3(new Web3.providers.HttpProvider(url)),
							blockLimit: data.blockLimit || 0,
							latestNotSupported: data.lastestNotSupported || false,
							batchNotSupported: data.batchNotSupported || false,
						};
					}
			  });

		this.mailerContractAddress = options.mailerContractAddress || EVM_CONTRACTS[this.network].mailer.address;
		this.registryContractAddress = options.registryContractAddress || EVM_CONTRACTS[this.network].registry.address;
		this.registryFirstBlock = EVM_CONTRACTS[this.network].registry.fromBlock || 0;
		this.mailerFirstBlock = EVM_CONTRACTS[this.network].mailer.fromBlock || 0;

		this.nameService = options?.nameServiceAddress
			? new EthereumNameService(this, options?.nameServiceAddress)
			: this.tryGetNameService();
	}

	blockchainGroup() {
		return 'evm';
	}

	blockchain(): string {
		return EVM_NAMES[this.network];
	}

	private tryGetNameService(): EthereumNameService | null {
		return EVM_ENS[this.network] ? new EthereumNameService(this, EVM_ENS[this.network]!) : null;
	}

	isReadingBySenderAvailable(): boolean {
		return false;
	}

	defaultNameService(): EthereumNameService | null {
		return this.nameService;
	}

	async init(): Promise<void> {
		// np
	}

	async getBalance(address: string): Promise<{ original: string; number: number; string: string; e18: string }> {
		return await this.executeWeb3Op(async w3 => {
			const stringValue = await w3.eth.getBalance(address);
			// Web3.utils.fromWei(
			return {
				original: stringValue,
				number: Number(Web3.utils.fromWei(stringValue)),
				string: Web3.utils.fromWei(stringValue),
				e18: stringValue,
			};
		});
	}

	async getRecipientIndex(recipient: Uint256, mailerAddress: string) {
		return await this.executeWeb3Op(async w3 => {
			return MailerContract.extractRecipientIndex(recipient, w3, mailerAddress);
		});
	}

	async executeWeb3Op<T>(
		callback: (
			w3: Web3,
			blockLimit: number,
			latestNotSupported: boolean,
			batchNotSupported: boolean,
			doBreak: () => void,
		) => Promise<T>,
	): Promise<T> {
		let lastError;
		const errors = [];
		for (const w3 of this.web3Readers) {
			let doBreak = false;
			try {
				return await callback(
					w3.web3,
					w3.blockLimit,
					w3.latestNotSupported,
					w3.batchNotSupported,
					() => (doBreak = true),
				);
			} catch (err: any) {
				lastError = err;
				if (err && typeof err.message === 'string' && err.message.includes('blocks range')) {
					throw err;
				}
				errors.push(err);
				if (doBreak) {
					break;
				} else {
					continue;
				}
			}
		}
		// console.error('lastError: ', lastError);
		// errors.forEach(err => console.error('w3 err: ', err));
		throw new Error('Was not able to execute in all of web3 providers');
	}

	async getRecipientReadingRules(address: string): Promise<any> {
		return [];
	}

	async getAddressByPublicKey(publicKey: Uint8Array): Promise<string | null> {
		return null;
	}

	async getPublicKeyByAddress(registryAddress: string, address: string) {
		return await this.executeWeb3Op(async (w3, blockLimit) => {
			const result = await RegistryContract.extractPublicKeyFromAddress(address, w3, registryAddress);
			// console.log('extractPublicKeyFromAddress result: ', result);
			if (result) {
				return result;
			} else {
				return null;
			}
		});
	}

	async extractAddressFromPublicKey(publicKey: PublicKey): Promise<string | null> {
		return this.getAddressByPublicKey(publicKey.bytes);
	}

	async extractPublicKeyFromAddress(address: string): Promise<ExternalYlidePublicKey | null> {
		const rawKey = await this.getPublicKeyByAddress(this.registryContractAddress, address);
		if (!rawKey) {
			return null;
		}
		return {
			publicKey: PublicKey.fromBytes(PublicKeyType.YLIDE, rawKey.publicKey),
			timestamp: rawKey.timestamp,
			keyVersion: rawKey.keyVersion,
		};
	}

	async getBlock(n: number): Promise<BlockTransactionString> {
		if (!this.blocksCache[n]) {
			try {
				this.blocksCache[n] = await this.executeWeb3Op(w3 => w3.eth.getBlock(n));
			} catch (err) {
				// console.log('getBlock err: ', err);
				throw err;
			}
		}

		return this.blocksCache[n];
	}

	async getLastBlockNumber() {
		return this.executeWeb3Op(w3 => w3.eth.getBlockNumber());
	}

	async getBlockNumberByTime(
		time: number,
		firstBlock?: BlockTransactionString,
		lastBlock?: BlockTransactionString,
	): Promise<BlockTransactionString> {
		if (!firstBlock) {
			firstBlock = await this.getBlock(this.mailerFirstBlock || 0);
		}
		if (time <= firstBlock.timestamp) {
			return firstBlock;
		}
		if (!lastBlock) {
			const lastBlockNumber = await this.getLastBlockNumber();
			lastBlock = await this.getBlock(lastBlockNumber);
		}
		if (time >= lastBlock.timestamp) {
			return lastBlock;
		}
		const middleBlockNumber = Math.floor((firstBlock.number + lastBlock.number) / 2);
		const middleBlock = await this.getBlock(middleBlockNumber);
		if (middleBlockNumber === firstBlock.number) {
			return firstBlock;
		} else if (time >= middleBlock.timestamp) {
			return this.getBlockNumberByTime(time, middleBlock, lastBlock);
		} else {
			return this.getBlockNumberByTime(time, firstBlock, middleBlock);
		}
	}

	async binSearchBlocks(fromTime?: number, toTime?: number) {
		const firstBlock = await this.getBlock(this.mailerFirstBlock || 0);
		const lastBlockNumber = await this.getLastBlockNumber();
		const lastBlock = await this.getBlock(lastBlockNumber);
		const fromBlock = await this.getBlockNumberByTime(fromTime || 0, firstBlock, lastBlock);
		const toBlock = await this.getBlockNumberByTime(toTime || Number(lastBlock.timestamp), firstBlock, lastBlock);
		return { fromBlock, toBlock };
	}

	async doEventsRequest(
		mailerAddress: string,
		subject: ISourceSubject,
		w3: Web3,
		fromBlock: BlockNumber,
		toBlock: BlockNumber,
	) {
		const ctrct = new w3.eth.Contract(MAILER_ABI.abi as AbiItem[], mailerAddress);
		return await ctrct.getPastEvents(subject.type === BlockchainSourceType.DIRECT ? 'MailPush' : 'MailBroadcast', {
			filter:
				subject.type === BlockchainSourceType.DIRECT
					? subject.recipient
						? {
								recipient: '0x' + uint256ToHex(subject.recipient),
						  }
						: {}
					: subject.sender
					? { sender: subject.sender }
					: {},
			fromBlock,
			toBlock,
		});
	}

	async tryRequest(
		mailerAddress: string,
		subject: ISourceSubject,
		fromBlockNumber: number,
		toBlockNumber: number,
	): Promise<{ result: false } | { result: true; data: EventData[] }> {
		try {
			return {
				result: true,
				data: await this.executeWeb3Op(async (w3, blockLimit, latestNotSupported, b, doBreak) => {
					if (blockLimit && toBlockNumber - fromBlockNumber > blockLimit) {
						doBreak();
						throw new Error(`Block limit is ${blockLimit}`);
					}
					return this.doEventsRequest(mailerAddress, subject, w3, fromBlockNumber, toBlockNumber);
				}),
			};
		} catch (err) {
			// debugger;
			// console.log('err: ', err);
			return {
				result: false,
			};
		}
	}

	eventCmprDesc(a: EventData, b: EventData): number {
		if (a.blockNumber === b.blockNumber) {
			if (a.transactionIndex === b.transactionIndex) {
				return b.logIndex - a.logIndex;
			} else {
				return b.transactionIndex - a.transactionIndex;
			}
		} else {
			return b.blockNumber - a.blockNumber;
		}
	}

	async retrieveEventsByBounds(
		mailerAddress: string,
		subject: ISourceSubject,
		fromBlockNumber: number,
		toBlockNumber: number,
		limit?: number,
	): Promise<EventData[]> {
		const full = await this.tryRequest(mailerAddress, subject, fromBlockNumber, toBlockNumber);
		if (full.result) {
			const sortedData = full.data.sort(this.eventCmprDesc);
			return limit ? sortedData.slice(0, limit) : sortedData;
		} else {
			if (fromBlockNumber === toBlockNumber) {
				return [];
			}
			const middleBlockNumber = Math.floor((toBlockNumber + fromBlockNumber) / 2);
			const middleBlockRealNumber =
				middleBlockNumber === fromBlockNumber
					? fromBlockNumber
					: middleBlockNumber === toBlockNumber
					? toBlockNumber
					: middleBlockNumber;
			const leftSide = await this.retrieveEventsByBounds(
				mailerAddress,
				subject,
				fromBlockNumber,
				middleBlockRealNumber,
				limit,
			);
			if (!limit || leftSide.length < limit) {
				if (middleBlockRealNumber === fromBlockNumber) {
					return leftSide;
				} else {
					const rightSide = await this.retrieveEventsByBounds(
						mailerAddress,
						subject,
						middleBlockRealNumber,
						toBlockNumber,
						limit ? limit - leftSide.length : undefined,
					);
					return leftSide.concat(rightSide);
				}
			} else {
				return leftSide;
			}
		}
	}

	async _retrieveEventsSinceBlock(
		mailerAddress: string,
		subject: ISourceSubject,
		fromBlockNumber: number,
		limit?: number,
	): Promise<EventData[]> {
		const full = await this.executeWeb3Op(async (w3, blockLimit, latestNotSupported) => {
			if (latestNotSupported) {
				const lastBlock = await w3.eth.getBlockNumber();
				return await this.doEventsRequest(mailerAddress, subject, w3, fromBlockNumber, lastBlock);
			} else {
				return await this.doEventsRequest(mailerAddress, subject, w3, fromBlockNumber, 'latest');
			}
		});
		const sortedData = full.sort(this.eventCmprDesc);
		return limit ? sortedData.slice(0, limit) : sortedData;
	}

	getDefaultMailerAddress() {
		return this.mailerContractAddress;
	}

	async _retrieveMessageHistoryByTime(
		mailerAddress: string,
		subject: ISourceSubject,
		fromTimestamp?: number,
		toTimestamp?: number,
		limit?: number,
	): Promise<IMessage[]> {
		if (!mailerAddress) {
			mailerAddress = this.getDefaultMailerAddress();
		}
		const { fromBlock, toBlock } = await this.binSearchBlocks(fromTimestamp, toTimestamp);
		const events = await this.retrieveEventsByBounds(
			mailerAddress,
			subject,
			fromBlock.number,
			toBlock.number,
			limit,
		);
		const msgs = await this.processMessages(events);
		const result = msgs.map(m =>
			subject.type === BlockchainSourceType.DIRECT ? this.formatPushMessage(m) : this.formatBroadcastMessage(m),
		);
		return result.filter(
			r =>
				(!fromTimestamp || r.$$meta.block.timestamp > fromTimestamp) &&
				(!toTimestamp || r.$$meta.block.timestamp <= toTimestamp),
		);
	}

	async retrieveHistorySinceBlock(subject: ISourceSubject, fromBlock: number, firstMessage?: IMessage) {
		const rawEvents = await this._retrieveEventsSinceBlock(this.getDefaultMailerAddress(), subject, fromBlock);

		const bottomBound = firstMessage
			? rawEvents.findIndex(r => bigIntToUint256(r.returnValues.msgId) === firstMessage.msgId)
			: -1;

		const events = rawEvents.slice(0, bottomBound === -1 ? undefined : bottomBound);

		const msgs = await this.processMessages(events);
		return msgs.map(m =>
			subject.type === BlockchainSourceType.DIRECT ? this.formatPushMessage(m) : this.formatBroadcastMessage(m),
		);
	}

	async advancedRetrieveMessageHistoryByBounds(
		sender: string | null,
		recipient: Uint256 | null,
		fromMessage?: IMessage,
		fromMessageIncluding = false,
		fromBlockNumber?: number,
		toMessage?: IMessage,
		toMessageIncluding = false,
		limit?: number,
	) {
		const _toBlockNumber = await this.getLastBlockNumber();
		return {
			messages: await this.iterateMailers(limit, async mailer => {
				if (sender === null && recipient) {
					const indexation = await this.executeWeb3Op(async w3 => {
						return await MailerContract.extractRecipientIndex(recipient, w3, mailer.address);
					});
					if (!indexation.length) {
						return [];
					}
				}
				return await this._retrieveMessageHistoryByBounds(
					mailer.address,
					{ type: BlockchainSourceType.DIRECT, sender, recipient },
					fromMessage,
					fromMessageIncluding,
					fromBlockNumber,
					toMessage,
					toMessageIncluding,
					_toBlockNumber,
					limit,
				);
			}),
			toBlockNumber: _toBlockNumber,
		};
	}

	async _retrieveMessageHistoryByBounds(
		mailerAddress: string,
		subject: ISourceSubject,
		fromMessage?: IMessage,
		fromMessageIncluding: boolean = false,
		fromBlockNumber?: number,
		toMessage?: IMessage,
		toMessageIncluding: boolean = false,
		toBlockNumber?: number,
		limit?: number,
	) {
		const _fromBlockNumber =
			fromBlockNumber || (fromMessage ? fromMessage.$$meta.block.number : this.mailerFirstBlock || 0);
		const _toBlockNumber =
			toBlockNumber || (toMessage ? toMessage.$$meta.block.number : await this.getLastBlockNumber());
		const rawEvents = await this.retrieveEventsByBounds(
			mailerAddress,
			subject,
			_fromBlockNumber,
			_toBlockNumber,
			limit,
		);

		const topBound = toMessage
			? rawEvents.findIndex(r => bigIntToUint256(r.returnValues.msgId) === toMessage.msgId)
			: -1;
		const bottomBound = fromMessage
			? rawEvents.findIndex(r => bigIntToUint256(r.returnValues.msgId) === fromMessage.msgId)
			: -1;

		const events = rawEvents.slice(
			topBound === -1 ? 0 : (toMessageIncluding ? topBound - 1 : topBound) + 1,
			bottomBound === -1 ? undefined : fromMessageIncluding ? bottomBound + 1 : bottomBound,
		);

		const msgs = await this.processMessages(events);
		const result = msgs.map(m =>
			subject.type === BlockchainSourceType.DIRECT ? this.formatPushMessage(m) : this.formatBroadcastMessage(m),
		);
		const output = result;
		return output;
	}

	async iterateMailers(
		limit: number | undefined,
		callback: (mailer: IEthereumContractLink) => Promise<IMessage[]>,
	): Promise<IMessage[]> {
		const mailers = [EVM_CONTRACTS[this.network].mailer, ...(EVM_CONTRACTS[this.network].legacyMailers || [])];
		const totalList = await Promise.all(mailers.map(callback));
		const msgs = totalList.flat();
		msgs.sort((a, b) => {
			return b.createdAt - a.createdAt;
		});
		return limit !== undefined ? msgs.slice(0, limit) : msgs;
	}

	async retrieveMessageHistoryByTime(
		sender: Uint256 | null,
		recipient: Uint256 | null,
		fromTimestamp?: number,
		toTimestamp?: number,
		limit?: number,
	): Promise<IMessage[]> {
		return this.iterateMailers(limit, mailer =>
			this._retrieveMessageHistoryByTime(
				mailer.address,
				{ type: BlockchainSourceType.DIRECT, sender, recipient },
				fromTimestamp,
				toTimestamp,
				limit,
			),
		);
	}

	async retrieveMessageHistoryByBounds(
		sender: string | null,
		recipient: Uint256 | null,
		fromMessage?: IMessage,
		toMessage?: IMessage,
		limit?: number,
	): Promise<IMessage[]> {
		return this.iterateMailers(limit, mailer =>
			this._retrieveMessageHistoryByBounds(
				mailer.address,
				{ type: BlockchainSourceType.DIRECT, sender, recipient },
				fromMessage,
				false,
				undefined,
				toMessage,
				false,
				undefined,
				limit,
			),
		);
	}

	async retrieveBroadcastHistoryByTime(
		sender: string | null,
		fromTimestamp?: number,
		toTimestamp?: number,
		limit?: number,
	): Promise<IMessage[]> {
		return this.iterateMailers(limit, mailer =>
			this._retrieveMessageHistoryByTime(
				mailer.address,
				{ type: BlockchainSourceType.BROADCAST, sender },
				fromTimestamp,
				toTimestamp,
				limit,
			),
		);
	}

	async retrieveBroadcastHistoryByBounds(
		sender: string | null,
		fromMessage?: IMessage,
		toMessage?: IMessage,
		limit?: number,
	): Promise<IMessage[]> {
		return this.iterateMailers(limit, mailer =>
			this._retrieveMessageHistoryByBounds(
				mailer.address,
				{ type: BlockchainSourceType.BROADCAST, sender },
				fromMessage,
				false,
				undefined,
				toMessage,
				false,
				undefined,
				limit,
			),
		);
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

	processMessageContent(
		msgId: string,
		messagePartEvents: IEVMEnrichedEvent[],
	): IMessageContent | IMessageCorruptedContent | null {
		if (!messagePartEvents.length) {
			return null;
		}
		let decodedChunks: { msg: IEVMEnrichedEvent; body: IEthereumContentMessageBody }[];
		try {
			decodedChunks = messagePartEvents.map((m: IEVMEnrichedEvent) => ({
				msg: m,
				body: decodeContentMessageBody(m.event),
			}));
		} catch (err) {
			return {
				msgId,
				corrupted: true,
				chunks: messagePartEvents.map((m: IEVMEnrichedEvent) => ({
					createdAt: Number(m.block.timestamp),
				})),
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
			storage: 'evm',
			createdAt: Math.min(...decodedChunks.map(d => Number(d.msg.block.timestamp))),
			senderAddress: sender,
			parts,
			content: buf.bytes,
		};
	}

	async retrieveMessageContentByMsgId(msgId: string): Promise<IMessageContent | IMessageCorruptedContent | null> {
		const messages = await this.processMessages(
			await this.executeWeb3Op(async w3 => {
				const ctrct = new w3.eth.Contract(
					MAILER_ABI.abi as AbiItem[],
					EVM_CONTRACTS[this.network].mailer.address,
				);
				const lastBlock = await w3.eth.getBlockNumber();
				try {
					return await ctrct.getPastEvents('MailContent', {
						filter: {
							msgId: '0x' + msgId,
						},
						fromBlock: this.mailerFirstBlock || 0,
						toBlock: lastBlock,
					});
				} catch (err: any) {
					if (err && typeof err.message === 'string' && err.message.includes('range')) {
						const max = err.message.includes('max: ')
							? parseInt(err.message.split('max: ')[1], 10) - 1
							: 9999;
						const result: EventData[] = [];
						for (let i = lastBlock; i > this.mailerFirstBlock || 0; i -= max) {
							const tempEvents = await ctrct.getPastEvents('MailContent', {
								filter: {
									msgId: '0x' + msgId,
								},
								fromBlock: Math.max(i - max, 0),
								toBlock: i,
							});
							result.push(...tempEvents);
						}
						return result;
					} else {
						throw err;
					}
				}
			}),
		);
		return this.processMessageContent(msgId, messages);
	}

	formatPushMessage(message: IEVMEnrichedEvent): IMessage {
		const { recipient: recipientUint256, sender, msgId, key } = message.event.returnValues;
		const recipient = bigIntToUint256(String(recipientUint256));
		const createdAt = message.block.timestamp;

		return {
			isBroadcast: false,

			msgId: bigIntToUint256(msgId),
			createdAt: Number(createdAt),
			senderAddress: sender,
			recipientAddress: recipient,
			blockchain: EVM_NAMES[this.network],

			key: SmartBuffer.ofHexString(key ? key.substring(2) : '').bytes,

			$$meta: message,
		};
	}

	formatBroadcastMessage(message: IEVMEnrichedEvent): IMessage {
		const { sender, msgId } = message.event.returnValues;
		const createdAt = message.block.timestamp;

		return {
			isBroadcast: true,

			msgId: bigIntToUint256(msgId),
			createdAt: Number(createdAt),
			senderAddress: sender,
			recipientAddress: sender,
			blockchain: EVM_NAMES[this.network],

			key: new Uint8Array(),

			$$meta: message,
		};
	}

	isAddressValid(address: string): boolean {
		return Web3.utils.isAddress(address);
	}

	async processMessages(msgs: EventData[]): Promise<IEVMEnrichedEvent[]> {
		if (!msgs.length) {
			return [];
		}
		const txHashes = msgs.map(e => e.transactionHash).filter((e, i, a) => a.indexOf(e) === i);
		const blockHashes = msgs.map(e => e.blockHash).filter((e, i, a) => a.indexOf(e) === i);
		const { txs, blocks } = await this.executeWeb3Op(async (w3, a, b, c) => {
			const noBatch = async () => {
				return {
					txs: await Promise.all(
						txHashes.map(async txHash => {
							const release = await this.txcs.acquire();
							try {
								return await w3.eth.getTransaction(txHash);
							} catch (err) {
								// console.log('err: ', err);
								throw err;
							} finally {
								release();
							}
						}),
					),
					blocks: await Promise.all(
						blockHashes.map(async blockHash => {
							const release = await this.txcs.acquire();
							try {
								return await w3.eth.getBlock(blockHash);
							} catch (err) {
								// console.log('err: ', err);
								throw err;
							} finally {
								release();
							}
						}),
					),
				};
			};
			if (c) {
				return await noBatch();
			}
			const batch = new w3.BatchRequest();
			const txsPromise: Promise<Transaction[]> = Promise.all(
				txHashes.map(
					txHash =>
						new Promise<Transaction>((resolve, reject) => {
							batch.add(
								// @ts-ignore
								w3.eth.getTransaction.request(txHash, (err, tx) => {
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
								w3.eth.getBlock.request(blockHash, false, (err, block) => {
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
			try {
				const _txs = await txsPromise;
				const _blocks = await blocksPromise;
				for (let i = 0; i < _txs.length; i++) {
					// try one more time...
					if (!_txs[i]) {
						await asyncDelay(500);
						_txs[i] = await w3.eth.getTransaction(txHashes[i]);
					}
				}
				return { txs: _txs, blocks: _blocks };
			} catch (err) {
				return await noBatch();
			}
		});
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

	uint256ToAddress(value: Uint256): string {
		return '0x' + new SmartBuffer(uint256ToUint8Array(value).slice(12)).toHexString();
	}

	addressToUint256(address: string): Uint256 {
		const lowerAddress = address.toLowerCase();
		const cleanHexAddress = lowerAddress.startsWith('0x') ? lowerAddress.substring(2) : lowerAddress;
		return hexToUint256(''.padStart(24, '0') + cleanHexAddress);
	}

	compareMessagesTime(a: IMessage, b: IMessage): number {
		if (a.createdAt === b.createdAt) {
			return a.$$meta.event.logIndex - b.$$meta.event.logIndex;
		} else {
			return a.createdAt - b.createdAt;
		}
	}
}

function getBlockchainFactory(network: EVMNetwork): BlockchainControllerFactory {
	return {
		create: async (options?: any) => new EthereumBlockchainController(Object.assign({ network }, options || {})),
		blockchain: EVM_NAMES[network],
		blockchainGroup: 'evm',
	};
}

export const evmBlockchainFactories: Record<EVMNetwork, BlockchainControllerFactory> = {
	[EVMNetwork.LOCAL_HARDHAT]: getBlockchainFactory(EVMNetwork.LOCAL_HARDHAT),

	[EVMNetwork.ETHEREUM]: getBlockchainFactory(EVMNetwork.ETHEREUM),
	[EVMNetwork.BNBCHAIN]: getBlockchainFactory(EVMNetwork.BNBCHAIN),
	[EVMNetwork.POLYGON]: getBlockchainFactory(EVMNetwork.POLYGON),
	[EVMNetwork.AVALANCHE]: getBlockchainFactory(EVMNetwork.AVALANCHE),
	[EVMNetwork.OPTIMISM]: getBlockchainFactory(EVMNetwork.OPTIMISM),
	[EVMNetwork.ARBITRUM]: getBlockchainFactory(EVMNetwork.ARBITRUM),
	[EVMNetwork.CRONOS]: getBlockchainFactory(EVMNetwork.CRONOS),
	[EVMNetwork.FANTOM]: getBlockchainFactory(EVMNetwork.FANTOM),
	[EVMNetwork.KLAYTN]: getBlockchainFactory(EVMNetwork.KLAYTN),
	[EVMNetwork.GNOSIS]: getBlockchainFactory(EVMNetwork.GNOSIS),
	[EVMNetwork.AURORA]: getBlockchainFactory(EVMNetwork.AURORA),
	[EVMNetwork.CELO]: getBlockchainFactory(EVMNetwork.CELO),
	[EVMNetwork.MOONBEAM]: getBlockchainFactory(EVMNetwork.MOONBEAM),
	[EVMNetwork.MOONRIVER]: getBlockchainFactory(EVMNetwork.MOONRIVER),
	[EVMNetwork.METIS]: getBlockchainFactory(EVMNetwork.METIS),
	[EVMNetwork.ASTAR]: getBlockchainFactory(EVMNetwork.ASTAR),
};
