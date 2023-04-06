import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
	YlideMailerV9,
	YlideMailerV9__factory,
	YlidePayV1,
	YlidePayV1__factory,
	YlideRegistryV6,
	YlideRegistryV6__factory,
} from '@ylide/ethereum-contracts';
import { Uint256 } from '@ylide/sdk';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { before, describe } from 'mocha';
import {
	EVMMailerContractType,
	EVMNetwork,
	EVMRegistryContractType,
	EVMYlidePayContractType,
	EthereumBlockchainController,
	EthereumWalletController,
	bnToUint256,
	getBlockchainController,
	getEvmContractsTest,
	getWalletController,
} from '../src';

class MessageKey {
	constructor(
		public readonly publicKeyIndex: number,
		public readonly decryptingPublicKeySignature: number | undefined,
		public readonly encryptedMessageKey: Uint8Array,
	) {}

	toBytes() {
		return new Uint8Array([1, 2, 3, 4, 5, 6]);
	}

	static fromBytes(bytes: Uint8Array) {
		return new MessageKey(1, undefined, bytes);
	}
}

describe('Controllers', () => {
	let blockchainController: EthereumBlockchainController;
	let walletController: EthereumWalletController;
	let ylideMailer: YlideMailerV9;
	let ylideRegistry: YlideRegistryV6;
	let ylidePay: YlidePayV1;
	let owner: SignerWithAddress;
	let user1: SignerWithAddress;
	let user2: SignerWithAddress;
	let feedId: Uint256;

	const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

	before(async () => {
		[owner, user1, user2] = await ethers.getSigners();
		ylideMailer = await new YlideMailerV9__factory(owner).deploy();
		ylidePay = await new YlidePayV1__factory(owner).deploy(ylideMailer.address);
		ylideRegistry = await new YlideRegistryV6__factory(owner).deploy();

		const evmContractsTest = getEvmContractsTest(
			{
				address: ylideMailer.address,
				type: EVMMailerContractType.EVMMailerV9,
			},
			{ address: ylidePay.address, type: EVMYlidePayContractType.EVMYlidePayV1 },
			{ address: ylideRegistry.address, type: EVMRegistryContractType.EVMRegistryV6 },
		);
		blockchainController = getBlockchainController(ethers.provider, evmContractsTest);
		walletController = getWalletController(owner, ethers.provider, evmContractsTest);

		await walletController.init();

		await ethers.provider.send('hardhat_mine', ['0x81']);

		const tx = await ylideMailer.createMailingFeed('768768768768121341');
		const receipt = await tx.wait();
		feedId = bnToUint256(BigNumber.from(receipt.events?.[0].args?.[0] || 0));
	});

	it('should work', async () => {
		await blockchainController.getUserNonceMailer(owner.address).then(console.log);
		await walletController.sendMail(
			{
				blockchain: 'hardhat',
				address: owner.address.toLowerCase(),
				publicKey: null,
			},
			feedId,
			content,
			[
				{
					address: bnToUint256(BigNumber.from(user2.address)),
					messageKey: MessageKey.fromBytes(new Uint8Array([1, 2, 3, 4, 5, 6])),
				},
			],
			{ network: EVMNetwork.LOCAL_HARDHAT },
		);

		await ylideMailer.queryFilter(ylideMailer.filters.MailPush(null, `0x${feedId}`)).then(console.log);
		await ylideMailer.queryFilter(ylideMailer.filters.MessageContent(null, owner.address)).then(console.log);
	});
});
