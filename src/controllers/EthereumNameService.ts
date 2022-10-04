import { AbstractNameService } from '@ylide/sdk';
import { EthereumBlockchainController } from './EthereumBlockchainController';

export class EthereumNameService extends AbstractNameService {
	constructor(public readonly controller: EthereumBlockchainController, public readonly contractAddress: string) {
		super();
	}

	isCandidate(name: string): boolean {
		return name.toLowerCase().endsWith('.eth');
	}

	resolve(name: string): Promise<string | null> {
		return this.controller.executeWeb3Op(w3 => {
			w3.eth.ens.registryAddress = this.contractAddress;
			return w3.eth.ens.getAddress(name);
			// const ens = new ENS({ provider: w3, ensAddress: this.contractAddress });
			// return ens.name(name).getAddress();
		});
	}

	reverseResolve(address: string): Promise<string | null> {
		return this.controller.executeWeb3Op(async w3 => {
			return null;
			// w3.eth.ens.registryAddress = this.contractAddress;
			// return w3.eth.ens.;
			// const ens = new ENS({ provider: w3, ensAddress: this.contractAddress });
			// return (await ens.getName(address)).name;
		});
	}
}
