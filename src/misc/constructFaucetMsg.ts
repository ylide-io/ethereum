import SmartBuffer from '@ylide/smart-buffer';

export const constructFaucetMsg = (
	publicKey: Uint8Array,
	registrar: number,
	chainId: number,
	timestampLock: number,
) => {
	const publicKeyHex = new SmartBuffer(publicKey).toHexString();

	const msg = `I authorize Ylide Faucet to publish my public key on my behalf to eliminate gas costs on my transaction for five minutes.

Public key: 0x${publicKeyHex.padStart(64, '0')}
Registrar: 0x${registrar.toString(16).padStart(8, '0')}
Chain ID: 0x${chainId.toString(16).padStart(64, '0')}
Timestamp: 0x${timestampLock.toString(16).padStart(16, '0')}`;
	return msg;
};
