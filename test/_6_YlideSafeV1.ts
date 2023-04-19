import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
	MockSafe,
	MockSafe__factory,
	YlideMailerV9,
	YlideMailerV9__factory,
	YlideRegistryV6,
	YlideRegistryV6__factory,
	YlideSafeV1,
	YlideSafeV1__factory,
} from '@ylide/ethereum-contracts';
import { Uint256 } from '@ylide/sdk';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { before, describe } from 'mocha';
import {
	ContractType,
	EVMContracts,
	EVMMailerContractType,
	EVMNetwork,
	EVMRegistryContractType,
	EVMYlideSafeContractType,
	EthereumBlockchainReader,
	EthereumRegistryV6Wrapper,
	bnToUint256,
} from '../src';

import { currentTimestamp, getBlockchainController, getEvmContractsTest, getWalletController } from './test-utils';
import { EthereumSafeV1Wrapper } from '../src/contract-wrappers/EthereumSafeV1Wrapper.ts';
import { EthereumMailerV9Wrapper } from '../src/contract-wrappers/v9';
import { expect } from 'chai';

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

describe('YlideSafeV1', () => {
	let feedId: Uint256;
	let owner: SignerWithAddress;
	let user1: SignerWithAddress;
	let user2: SignerWithAddress;
	let mockSafe1: MockSafe;
	let mockSafe2: MockSafe;
	let evmContractsTest: EVMContracts;

	const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

	before(async () => {
		[owner, user1, user2] = await ethers.getSigners();
		mockSafe1 = await new MockSafe__factory(owner).deploy();
		mockSafe2 = await new MockSafe__factory(owner).deploy();

		const readerForOwner = EthereumBlockchainReader.createEthereumBlockchainReader([
			{
				chainId: 31337,
				rpcUrlOrProvider: owner.provider || '',
				blockLimit: 100,
			},
		]);
		const safeWrapper = new EthereumSafeV1Wrapper(readerForOwner);
		const mailerWrapper = new EthereumMailerV9Wrapper(readerForOwner);

		const mailerAddress = await EthereumMailerV9Wrapper.deploy(owner, owner.address);
		const safeAddress = await EthereumSafeV1Wrapper.deploy(owner, owner.address);
		const registryAddress = await EthereumRegistryV6Wrapper.deploy(owner, owner.address);

		evmContractsTest = getEvmContractsTest({
			mailer: {
				address: mailerAddress,
				type: EVMMailerContractType.EVMMailerV9,
			},
			safe: { address: safeAddress, type: EVMYlideSafeContractType.EVMYlideSafeV1 },
			registry: { address: registryAddress, type: EVMRegistryContractType.EVMRegistryV6 },
		});

		await ethers.provider.send('hardhat_mine', ['0x81']);

		const result = await mailerWrapper.mailing.createMailingFeed(
			evmContractsTest[EVMNetwork.LOCAL_HARDHAT].mailerContracts[0],
			owner,
			bnToUint256(BigNumber.from(1221365)),
			BigNumber.from(0),
		);
		feedId = result.feedId || bnToUint256(BigNumber.from(0));

		const safe = evmContractsTest[EVMNetwork.LOCAL_HARDHAT].safeContracts[0];
		await safeWrapper.setYlideMailer(
			evmContractsTest[EVMNetwork.LOCAL_HARDHAT].safeContracts[0],
			owner,
			mailerAddress,
		);
		expect(await safeWrapper.getYlideMailer(safe)).to.equal(mailerAddress);
		const mailer = evmContractsTest[EVMNetwork.LOCAL_HARDHAT].mailerContracts[0];
		await mailerWrapper.globals.setIsYlide(
			evmContractsTest[EVMNetwork.LOCAL_HARDHAT].mailerContracts[0],
			owner,
			[safeAddress],
			[true],
		);
		expect(await mailerWrapper.globals.isYlide(mailer, safeAddress));
	});

	it('sendBulkMail', async () => {
		await mockSafe1.setOwners([owner.address], [true]);
		await mockSafe2.setOwners([user2.address], [true]);
		const walletController = await getWalletController(owner, ethers.provider, evmContractsTest);

		const deadline = await currentTimestamp().then(t => t + 1000);

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
				{
					address: bnToUint256(BigNumber.from(user1.address)),
					messageKey: MessageKey.fromBytes(new Uint8Array([1, 2, 3, 4, 5, 7])),
				},
			],
			{
				network: EVMNetwork.LOCAL_HARDHAT,
				supplement: {
					deadline,
					kind: ContractType.SAFE,
					data: {
						safeSender: mockSafe1.address,
						safeRecipients: [user2.address, ethers.constants.AddressZero],
					},
				},
			},
		);
	});
});
