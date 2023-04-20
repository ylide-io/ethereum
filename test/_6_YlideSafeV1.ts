import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { MockSafe, MockSafe__factory } from '@ylide/ethereum-contracts';
import { MessageKey, Uint256 } from '@ylide/sdk';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { describe } from 'mocha';
import {
	ContractType,
	EVMContracts,
	EVMMailerContractType,
	EVMNetwork,
	EVMRegistryContractType,
	EVMYlideSafeContractType,
	EthereumBlockchainController,
	EthereumBlockchainReader,
	EthereumRegistryV6Wrapper,
	bnToUint256,
} from '../src';
import { EthereumSafeV1Wrapper } from '../src/contract-wrappers/EthereumSafeV1Wrapper.ts';
import { EthereumMailerV9Wrapper } from '../src/contract-wrappers/v9';
import { currentTimestamp, getBlockchainController, getEvmContractsTest, getWalletController } from './test-utils';

describe('YlideSafeV1', () => {
	let feedId: Uint256;
	let owner: SignerWithAddress;
	let user1: SignerWithAddress;
	let user2: SignerWithAddress;
	let mockSafe1: MockSafe;
	let mockSafe2: MockSafe;
	let evmContractsTest: EVMContracts;
	let mailerAddress: string;
	let safeAddress: string;
	let registryAddress: string;

	let blockchainController: EthereumBlockchainController;

	it('Deploy and config', async () => {
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

		mailerAddress = await EthereumMailerV9Wrapper.deploy(owner, owner.address);
		safeAddress = await EthereumSafeV1Wrapper.deploy(owner, owner.address);
		registryAddress = await EthereumRegistryV6Wrapper.deploy(owner, owner.address);

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
		await mockSafe1.setOwners([owner.address], [true]);
		await mockSafe2.setOwners([user2.address], [true]);
		blockchainController = getBlockchainController(ethers.provider, evmContractsTest);
		expect(await blockchainController.isSafeOwner(mockSafe1.address, owner.address)).equal(true);
		expect(await blockchainController.isSafeOwner(mockSafe1.address, user2.address)).equal(false);
		expect(await blockchainController.isSafeOwner(mockSafe2.address, owner.address)).equal(false);
		expect(await blockchainController.isSafeOwner(mockSafe2.address, user2.address)).equal(true);
		expect(await blockchainController.getSafeOwners(mockSafe1.address)).deep.equal([owner.address]);
		expect(await blockchainController.getSafeOwners(mockSafe2.address)).deep.equal([user2.address]);

		expect(blockchainController.getMailerSupplementSupport()).deep.equal([ContractType.SAFE]);
		expect(blockchainController.isSupplementSupported(ContractType.PAY)).equal(false);
		expect(blockchainController.isSupplementSupported(ContractType.SAFE)).equal(true);
	});

	it('sendBulkMail with Safe', async () => {
		const walletController = await getWalletController(owner, ethers.provider, evmContractsTest);

		const deadline = await currentTimestamp().then(t => t + 1000);

		const safeSender = mockSafe1.address;
		const safeRecipients = [mockSafe2.address, ethers.constants.AddressZero];
		const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

		const { pushes } = await walletController.sendMail(
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
					messageKey: MessageKey.fromBytes(new Uint8Array([2, 2, 3, 4, 5, 6])),
				},
				{
					address: bnToUint256(BigNumber.from(user1.address)),
					messageKey: MessageKey.fromBytes(new Uint8Array([2, 2, 3, 4, 5, 7])),
				},
			],
			{
				network: EVMNetwork.LOCAL_HARDHAT,
				supplement: {
					deadline,
					kind: ContractType.SAFE,
					data: {
						safeSender,
						safeRecipients,
					},
				},
			},
		);
		for (const { push } of pushes) {
			expect(push.$$meta.supplement.contractAddress).equal(safeAddress);
			expect(push.$$meta.supplement.contractType).equal(ContractType.SAFE);
		}
		const msgId = pushes[0].push.msgId;
		const message = await blockchainController.getMessageByMsgId(msgId);
		expect(message).not.equal(null);
		if (message) {
			const result = await blockchainController.getSafeMails(message);
			expect(result).not.equal(null);
			if (result) {
				expect(result.length).equal(1);
				expect(message.$$meta.contentId).equal(result[0].contentId);
				expect(result[0].safeSender).equal(safeSender);
				expect(result[0].safeRecipients).deep.equal(safeRecipients);
			}
		}
	});

	it('addMailRecipients with Safe (two MessageContents and one MailPush)', async () => {
		const walletController = await getWalletController(owner, ethers.provider, evmContractsTest);

		const deadline = await currentTimestamp().then(t => t + 1000);

		const safeSender = mockSafe1.address;
		const safeRecipients = [mockSafe2.address, ethers.constants.AddressZero];

		const content = new Uint8Array(32);

		const { pushes } = await walletController.sendMail(
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
					messageKey: MessageKey.fromBytes(new Uint8Array([2, 2, 3, 4, 5, 6])),
				},
				{
					address: bnToUint256(BigNumber.from(user1.address)),
					messageKey: MessageKey.fromBytes(new Uint8Array([2, 2, 3, 4, 5, 7])),
				},
			],
			{
				network: EVMNetwork.LOCAL_HARDHAT,
				supplement: {
					deadline,
					kind: ContractType.SAFE,
					data: {
						safeSender,
						safeRecipients,
					},
				},
			},
		);
		for (const { push } of pushes) {
			expect(push.$$meta.supplement.contractAddress).equal(safeAddress);
			expect(push.$$meta.supplement.contractType).equal(ContractType.SAFE);
		}
		const msgId = pushes[0].push.msgId;
		const message = await blockchainController.getMessageByMsgId(msgId);
		expect(message).not.equal(null);
		if (message) {
			const result = await blockchainController.getSafeMails(message);
			expect(result).not.equal(null);
			if (result) {
				expect(result.length).equal(1);
				expect(message.$$meta.contentId).equal(result[0].contentId);
				expect(result[0].safeSender).equal(safeSender);
				expect(result[0].safeRecipients).deep.equal(safeRecipients);
			}
		}
	});

	it('addMailRecipients with Safe (two MessageContents and two MailPushes)', async () => {
		const walletController = await getWalletController(owner, ethers.provider, evmContractsTest);

		const deadline = await currentTimestamp().then(t => t + 1000);

		const safeSender = mockSafe1.address;
		const safeRecipients = new Array(220).fill(ethers.constants.AddressZero);

		const content = new Uint8Array(32);

		const { pushes } = await walletController.sendMail(
			{
				blockchain: 'hardhat',
				address: owner.address.toLowerCase(),
				publicKey: null,
			},
			feedId,
			content,
			new Array(220).fill({
				address: bnToUint256(BigNumber.from(ethers.Wallet.createRandom().address)),
				messageKey: MessageKey.fromBytes(new Uint8Array([2, 2, 3, 4, 5, 6])),
			}),
			{
				network: EVMNetwork.LOCAL_HARDHAT,
				supplement: {
					deadline,
					kind: ContractType.SAFE,
					data: {
						safeSender,
						safeRecipients,
					},
				},
			},
		);
		for (const { push } of pushes) {
			expect(push.$$meta.supplement.contractAddress).equal(safeAddress);
			expect(push.$$meta.supplement.contractType).equal(ContractType.SAFE);
		}
		const msgId = pushes[0].push.msgId;
		const message = await blockchainController.getMessageByMsgId(msgId);
		expect(message).not.equal(null);
		if (message) {
			const result = await blockchainController.getSafeMails(message);
			expect(result).not.equal(null);
			if (result) {
				expect(result.length).equal(2);
				expect(message.$$meta.contentId).equal(result[0].contentId);
				expect(message.$$meta.contentId).equal(result[1].contentId);
				expect(result[0].safeSender).equal(safeSender);
				expect(result[0].safeRecipients.length).deep.equal(210);
				expect(result[1].safeSender).equal(safeSender);
				expect(result[1].safeRecipients.length).deep.equal(10);
			}
		}
	});
});
