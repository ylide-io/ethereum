import { EVMNetwork } from './types';
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
export declare const EVM_RPCS: Record<EVMNetwork, {
    rpc: string;
    blockLimit?: number;
    lastestNotSupported?: boolean;
}[]>;
