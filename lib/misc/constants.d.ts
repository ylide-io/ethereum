import { EVMNetwork } from './types';
export declare const DEV_MAILER_ADDRESS = "0x67d269191c92Caf3cD7723F116c85e6E9bf55933";
export declare const DEV_REGISTRY_ADDRESS = "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1";
export interface IEthereumContractLink {
    address: string;
    fromBlock?: number;
    toBlock?: number;
}
export declare const EVM_CONTRACTS: Record<EVMNetwork, {
    mailer: IEthereumContractLink;
    registry: IEthereumContractLink;
    legacyMailers?: IEthereumContractLink[];
    legacyRegistries?: IEthereumContractLink[];
}>;
export declare const EVM_NAMES: Record<EVMNetwork, string>;
export declare const EVM_CHAINS: Record<EVMNetwork, number>;
export declare const EVM_CHAIN_ID_TO_NETWORK: Record<number, EVMNetwork>;
export declare const EVM_RPCS: Record<EVMNetwork, string[]>;
