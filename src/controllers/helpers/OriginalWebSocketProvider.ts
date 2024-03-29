/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable @typescript-eslint/no-floating-promises */
import type { Network, Networkish } from '@ethersproject/providers';
import { BaseProvider } from '@ethersproject/providers';
import { JsonRpcProvider } from '@ethersproject/providers';
import type { InflightRequest, Subscription, WebSocketLike } from '@ethersproject/providers/lib/websocket-provider';
import { Logger } from '@ethersproject/logger';
import { defineReadOnly } from '@ethersproject/properties';
import { BigNumber } from 'ethers';

const logger = new Logger('9.9.9');

let NextId = 1;

export class OriginalWebSocketProvider extends JsonRpcProvider {
	readonly _websocket: any;
	readonly _requests!: { [name: string]: InflightRequest };
	readonly _detectNetwork!: Promise<Network>;

	// Maps event tag to subscription ID (we dedupe identical events)
	readonly _subIds!: { [tag: string]: Promise<string> };

	// Maps Subscription ID to Subscription
	readonly _subs!: { [name: string]: Subscription };

	_wsReady: boolean;

	constructor(url: string | WebSocketLike, network: Networkish) {
		// This will be added in the future; please open an issue to expedite
		if (network === 'any') {
			logger.throwError(
				"WebSocketProvider does not support 'any' network yet",
				Logger.errors.UNSUPPORTED_OPERATION,
				{
					operation: 'network:any',
				},
			);
		}

		if (typeof url === 'string') {
			super(url, network);
		} else {
			super('_websocket', network);
		}

		this._pollingInterval = -1;

		this._wsReady = false;

		if (typeof url === 'string') {
			defineReadOnly(this, '_websocket', new WebSocket(this.connection.url));
		} else {
			defineReadOnly(this, '_websocket', url);
		}

		defineReadOnly(this, '_requests', {});
		defineReadOnly(this, '_subs', {});
		defineReadOnly(this, '_subIds', {});

		const _network = BaseProvider.getNetwork(network);
		defineReadOnly(this, '_detectNetwork', Promise.resolve(_network));

		// Stall sending requests until the socket is open...
		this.websocket.onopen = () => {
			this._wsReady = true;
			Object.keys(this._requests).forEach(id => {
				this.websocket.send(this._requests[id].payload);
			});
		};

		this.websocket.onmessage = (messageEvent: { data: string }) => {
			const data = messageEvent.data;
			const result = JSON.parse(data);
			if (result.id != null) {
				const id = String(result.id);
				const request = this._requests[id];
				delete this._requests[id];

				if (result.result !== undefined) {
					request.callback(null as any, result.result);

					this.emit('debug', {
						action: 'response',
						request: JSON.parse(request.payload),
						response: result.result,
						provider: this,
					});
				} else {
					let error: Error | null = null;
					if (result.error) {
						error = new Error(result.error.message || 'unknown error');
						defineReadOnly(error as any, 'code', result.error.code || null);
						defineReadOnly(error as any, 'response', data);
					} else {
						error = new Error('unknown error');
					}

					request.callback(error, undefined);

					this.emit('debug', {
						action: 'response',
						error: error as any,
						request: JSON.parse(request.payload),
						provider: this,
					});
				}
			} else if (result.method === 'eth_subscription') {
				// Subscription...
				const sub = this._subs[result.params.subscription];
				if (sub) {
					// this.emit.apply(this,                  );
					sub.processFunc(result.params.result);
				}
			} else {
				console.warn('this should not happen');
			}
		};

		// This Provider does not actually poll, but we want to trigger
		// poll events for things that depend on them (like stalling for
		// block and transaction lookups)
		const fauxPoll = setInterval(() => {
			this.emit('poll');
		}, 1000);
		if (fauxPoll.unref) {
			fauxPoll.unref();
		}
	}

	// Cannot narrow the type of _websocket, as that is not backwards compatible
	// so we add a getter and let the WebSocket be a public API.
	get websocket(): WebSocketLike {
		return this._websocket;
	}

	detectNetwork(): Promise<Network> {
		return this._detectNetwork;
	}

	get pollingInterval(): number {
		return 0;
	}

	set pollingInterval(value: number) {
		logger.throwError('cannot set polling interval on WebSocketProvider', Logger.errors.UNSUPPORTED_OPERATION, {
			operation: 'setPollingInterval',
		});
	}

	resetEventsBlock(blockNumber: number): void {
		logger.throwError('cannot reset events block on WebSocketProvider', Logger.errors.UNSUPPORTED_OPERATION, {
			operation: 'resetEventBlock',
		});
	}

	async poll(): Promise<void> {
		return null as any;
	}

	set polling(value: boolean) {
		if (!value) {
			return;
		}

		logger.throwError('cannot set polling on WebSocketProvider', Logger.errors.UNSUPPORTED_OPERATION, {
			operation: 'setPolling',
		});
	}

	send(method: string, params?: any[]): Promise<any> {
		const rid = NextId++;

		return new Promise((resolve, reject) => {
			const callback = (error: Error, result: any) => {
				if (error) {
					return reject(error);
				}
				return resolve(result);
			};

			const payload = JSON.stringify({
				method,
				params,
				id: rid,
				jsonrpc: '2.0',
			});

			this.emit('debug', {
				action: 'request',
				request: JSON.parse(payload),
				provider: this,
			});

			this._requests[String(rid)] = { callback, payload };

			if (this._wsReady) {
				this.websocket.send(payload);
			}
		});
	}

	static defaultUrl(): string {
		return 'ws://localhost:8546';
	}

	async _subscribe(tag: string, param: any[], processFunc: (result: any) => void): Promise<void> {
		let subIdPromise = this._subIds[tag];
		if (subIdPromise == null) {
			subIdPromise = Promise.all(param).then((params: any[]) => {
				return this.send('eth_subscribe', params);
			});
			this._subIds[tag] = subIdPromise;
		}
		const subId = await subIdPromise;
		this._subs[subId] = { tag, processFunc };
	}

	_startEvent(event: any): void {
		switch (event.type) {
			case 'block':
				this._subscribe('block', ['newHeads'], (result: any) => {
					const blockNumber = BigNumber.from(result.number).toNumber();
					this._emitted.block = blockNumber;
					this.emit('block', blockNumber);
				});
				break;

			case 'pending':
				this._subscribe('pending', ['newPendingTransactions'], (result: any) => {
					this.emit('pending', result);
				});
				break;

			case 'filter':
				this._subscribe(event.tag, ['logs', this._getFilter(event.filter)], (result: any) => {
					if (result.removed == null) {
						result.removed = false;
					}
					this.emit(event.filter, this.formatter.filterLog(result));
				});
				break;

			case 'tx': {
				const emitReceipt = (_event: any) => {
					const hash = _event.hash;
					this.getTransactionReceipt(hash).then(receipt => {
						if (!receipt) {
							return;
						}
						this.emit(hash, receipt);
					});
				};

				// In case it is already mined
				emitReceipt(event);

				// To keep things simple, we start up a single newHeads subscription
				// to keep an eye out for transactions we are watching for.
				// Starting a subscription for an event (i.e. "tx") that is already
				// running is (basically) a nop.
				this._subscribe('tx', ['newHeads'], (result: any) => {
					this._events.filter(e => e.type === 'tx').forEach(emitReceipt);
				});
				break;
			}

			// Nothing is needed
			case 'debug':
			case 'poll':
			case 'willPoll':
			case 'didPoll':
			case 'error':
				break;

			default:
				console.log('unhandled:', event);
				break;
		}
	}

	_stopEvent(event: any): void {
		let tag = event.tag;

		if (event.type === 'tx') {
			// There are remaining transaction event listeners
			if (this._events.filter(e => e.type === 'tx').length) {
				return;
			}
			tag = 'tx';
		} else if (this.listenerCount(event.event)) {
			// There are remaining event listeners
			return;
		}

		const subId = this._subIds[tag];
		if (!subId) {
			return;
		}

		delete this._subIds[tag];
		subId.then(_subId => {
			if (!this._subs[_subId]) {
				return;
			}
			delete this._subs[_subId];
			this.send('eth_unsubscribe', [_subId]);
		});
	}

	async destroy(): Promise<void> {
		// Wait until we have connected before trying to disconnect
		if (this.websocket.readyState === WebSocket.CONNECTING) {
			await new Promise(resolve => {
				this.websocket.onopen = () => {
					resolve(true);
				};

				this.websocket.onerror = () => {
					resolve(false);
				};
			});
		}

		// Hangup
		// See: https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes
		this.websocket.close(1000);
	}
}
