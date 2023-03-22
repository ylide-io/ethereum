import { ethers } from 'ethers';

const WebSocketProviderClass = (): new () => ethers.providers.WebSocketProvider => class {} as never;

export class BetterWebSocketProvider extends WebSocketProviderClass() {
	private provider?: ethers.providers.WebSocketProvider;
	private events: ethers.providers.WebSocketProvider['_events'] = [];
	private requests: ethers.providers.WebSocketProvider['_requests'] = {};

	private handler = {
		get: (target: BetterWebSocketProvider, prop: string, receiver: unknown) => {
			const value = target.provider && Reflect.get(target.provider, prop, receiver);

			return value instanceof Function ? value.bind(target.provider) : value;
		},
	};

	constructor(private providerUrl: string, private __network: ethers.providers.Networkish) {
		super();
		this.create(0);

		return new Proxy(this, this.handler);
	}

	private create(attempt: number) {
		if (this.provider) {
			this.events = [...this.events, ...this.provider._events];
			this.requests = { ...this.requests, ...this.provider._requests };
		}

		const provider = new ethers.providers.WebSocketProvider(this.providerUrl, this.__network);

		const on = provider._websocket.on
			? provider._websocket.on.bind(provider._websocket)
			: provider._websocket.addEventListener.bind(provider._websocket);

		on('open', () => {
			let event;
			while ((event = this.events.pop())) {
				provider._events.push(event);
				provider._startEvent(event);
			}

			for (const key of Object.keys(this.requests)) {
				provider._requests[key] = this.requests[key];
				provider._websocket.send(this.requests[key].payload);
				delete this.requests[key];
			}
		});
		on('close', (code: number) => {
			provider._wsReady = false;

			if (code !== 1000) {
				setTimeout(
					() => this.create(attempt + 1),
					attempt < 3 ? 500 : attempt < 6 ? 5000 : attempt < 12 ? 10000 : 30000,
				);
			}
		});

		this.provider = provider;
	}
}
