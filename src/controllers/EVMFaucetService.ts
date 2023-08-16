import { AbstractFaucetService, YlideError, YlideErrorType } from '@ylide/sdk';
import type { PublicKey, DontAccessThisObjectDirectly } from '@ylide/sdk';
import type { EVMWalletAccount } from '../misc';
import { EVMNetwork } from '../misc';
import { EVM_CHAINS, constructFaucetMsg } from '../misc';
import type { EVMWalletController } from './EVMWalletController';
import { SmartBuffer } from '@ylide/smart-buffer';

interface FaucetAuthorizationData {
	url: string;
	key: string;
	body: any;
}

export class EVMFaucetService extends AbstractFaucetService {
	constructor(
		private readonly controller: EVMWalletController,
		private readonly network: EVMNetwork.GNOSIS | EVMNetwork.FANTOM | EVMNetwork.POLYGON,
		private readonly faucet?: {
			registrar?: number;
			apiKey?: { type: 'server' | 'client'; key: string };
			host?: string;
		},
	) {
		super();
		//
	}

	private async requestFaucetSignature(
		publicKey: Uint8Array,
		account: EVMWalletAccount,
		chainId: number,
		registrar: number,
		timestampLock: number,
	) {
		const msg = constructFaucetMsg(publicKey, registrar, chainId, timestampLock);
		return await this.controller.signString(account, msg);
	}

	private async request<T>(url: string, apiKey: string, body: Record<string, any>): Promise<T> {
		const host = this.faucet?.host ?? 'https://faucet-v2.ylide.io';
		let json;
		try {
			const response = await fetch(`${host}${url}?key=${encodeURIComponent(apiKey)}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(body),
			});

			json = await response.json();
		} catch (err: any) {
			throw new YlideError(YlideErrorType.NETWORK_ERROR, err.message);
		}

		if (json.result) {
			return json.data;
		} else {
			throw new YlideError(YlideErrorType.RESPONSE_ERROR, json.error);
		}
	}

	async authorizePublishing(
		account: EVMWalletAccount,
		publicKey: PublicKey,
		_registrar?: number,
		_apiKey?: { type: 'server' | 'client'; key: string },
	): Promise<DontAccessThisObjectDirectly> {
		if (!this.faucet?.apiKey && !_apiKey) {
			throw new Error('No faucet API key provided');
		}
		if (this.faucet?.registrar === undefined && _registrar === undefined) {
			throw new Error('No default registrar specified, no registrar provided');
		}

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const registrar = (_registrar ?? this.faucet?.registrar)!;
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const apiKey = (_apiKey ?? this.faucet?.apiKey)!;

		const chainId = EVM_CHAINS[this.network];
		const timestampLock = Math.floor(Date.now() / 1000);

		const signature = await this.requestFaucetSignature(
			publicKey.keyBytes,
			account,
			chainId,
			registrar,
			timestampLock,
		);

		const names = {
			[EVMNetwork.GNOSIS]: 'gnosis',
			[EVMNetwork.FANTOM]: 'fantom',
			[EVMNetwork.POLYGON]: 'polygon',
		};

		const url = `/v2/${apiKey.type}/${names[this.network]}`;

		return {
			url,
			key: apiKey.key,
			body: {
				address: account.address.toLowerCase(),
				referrer: '0x0000000000000000000000000000000000000000',
				payBonus: '0',
				registrar,
				timestampLock,
				publicKey: '0x' + new SmartBuffer(publicKey.keyBytes).toHexString(),
				keyVersion: publicKey.keyVersion,
				_r: signature.r,
				_s: signature.s,
				_v: signature.v,
			},
		} as any;
	}

	async attachPublicKey(authorizationData: DontAccessThisObjectDirectly): Promise<{ txHash: string }> {
		const data = authorizationData as FaucetAuthorizationData;
		return await this.request(data.url, data.key, data.body);
	}
}
