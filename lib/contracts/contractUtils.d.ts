import { EventData } from 'web3-eth-contract';
import { IEthereumContentMessageBody } from '../misc';
export declare function decodeContentMessageBody(ev: EventData): IEthereumContentMessageBody;
export declare function decodePublicKeyToAddressMessageBody(ev: EventData): string;
export declare function decodeAddressToPublicKeyMessageBody(ev: EventData): Uint8Array;
