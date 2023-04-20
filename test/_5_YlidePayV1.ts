import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import { MockERC20__factory, MockERC721__factory } from '@ylide/ethereum-contracts';
import { MessageKey, Uint256 } from '@ylide/sdk';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import crypto from 'crypto';
import {
	ContractType,
	EVMContracts,
	EVMMailerContractType,
	EVMNetwork,
	EVMRegistryContractType,
	EVMYlidePayContractType,
	EthereumBlockchainController,
	EthereumBlockchainReader,
	EthereumRegistryV6Wrapper,
	bnToUint256,
} from '../src';
import { EthereumPayV1Wrapper } from '../src/contract-wrappers/EthereumPayV1Wrapper';
import { EthereumMailerV9Wrapper } from '../src/contract-wrappers/v9';
import { currentTimestamp, getBlockchainController, getEvmContractsTest, getWalletController } from './test-utils';

describe('YlidePayV1', () => {
	let feedId: Uint256;
	let owner: SignerWithAddress;
	let user1: SignerWithAddress;
	let user2: SignerWithAddress;
	let evmContractsTest: EVMContracts;
	let mailerAddress: string;
	let payAddress: string;
	let registryAddress: string;

	let blockchainController: EthereumBlockchainController;

	it('Deploy and config', async () => {
		[owner, user1, user2] = await ethers.getSigners();
		const readerForOwner = EthereumBlockchainReader.createEthereumBlockchainReader([
			{
				chainId: 31337,
				rpcUrlOrProvider: owner.provider || '',
				blockLimit: 100,
			},
		]);
		const payWrapper = new EthereumPayV1Wrapper(readerForOwner);
		const mailerWrapper = new EthereumMailerV9Wrapper(readerForOwner);

		mailerAddress = await EthereumMailerV9Wrapper.deploy(owner, owner.address);
		payAddress = await EthereumPayV1Wrapper.deploy(owner, owner.address);
		registryAddress = await EthereumRegistryV6Wrapper.deploy(owner, owner.address);

		evmContractsTest = getEvmContractsTest({
			mailer: {
				address: mailerAddress,
				type: EVMMailerContractType.EVMMailerV9,
			},
			payer: { address: payAddress, type: EVMYlidePayContractType.EVMYlidePayV1 },
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

		const pay = evmContractsTest[EVMNetwork.LOCAL_HARDHAT].payContracts[0];
		await payWrapper.setYlideMailer(pay, owner, mailerAddress);
		expect(await payWrapper.getYlideMailer(pay)).to.equal(mailerAddress);
		const mailer = evmContractsTest[EVMNetwork.LOCAL_HARDHAT].mailerContracts[0];
		await mailerWrapper.globals.setIsYlide(
			evmContractsTest[EVMNetwork.LOCAL_HARDHAT].mailerContracts[0],
			owner,
			[payAddress],
			[true],
		);
		expect(await mailerWrapper.globals.isYlide(mailer, payAddress));
		blockchainController = getBlockchainController(ethers.provider, evmContractsTest);

		expect(blockchainController.getMailerSupplementSupport()).deep.equal([ContractType.PAY]);
		expect(blockchainController.isSupplementSupported(ContractType.PAY)).equal(true);
		expect(blockchainController.isSupplementSupported(ContractType.SAFE)).equal(false);
	});

	it('Send ERC20 bulkMail', async () => {
		const erc20 = await new MockERC20__factory(owner).deploy('Test', 'TST');
		await erc20.connect(owner).mint(2000);

		await erc20.connect(owner).approve(payAddress, 2000);

		expect(await erc20.balanceOf(user1.address)).equal(0);
		expect(await erc20.balanceOf(user2.address)).equal(0);

		const walletController = await getWalletController(owner, ethers.provider, evmContractsTest);

		const deadline = await currentTimestamp().then(t => t + 1000);

		const content = new Uint8Array([1, 2, 3, 4, 5, 6]);

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
					kind: ContractType.PAY,
					data: [
						{ amountOrTokenId: 1500, token: erc20.address, recipient: user2.address, tokenType: 0 },
						{ amountOrTokenId: 500, token: erc20.address, recipient: user1.address, tokenType: 0 },
					],
				},
			},
		);
		for (const [index, { push }] of pushes.entries()) {
			expect(push.$$meta.supplement.contractAddress).equal(payAddress);
			expect(push.$$meta.supplement.contractType).equal(ContractType.PAY);
			const msgId = push.msgId;
			const message = await blockchainController.getMessageByMsgId(msgId);
			expect(message).not.equal(null);
			if (message) {
				const result = await blockchainController.getTokenAttachments(message);
				expect(result).not.equal(null);
				if (result) {
					expect(result.kind).equal(ContractType.PAY);
					expect(result.attachments.length).equal(1);
					if (index === 0) {
						expect(result.attachments[0]).deep.equal({
							contentId: message.$$meta.contentId,
							amountOrTokenId: 1500n,
							recipient: user2.address,
							sender: owner.address,
							token: erc20.address,
							tokenType: 0,
						});
					} else {
						expect(result.attachments[0]).deep.equal({
							contentId: message.$$meta.contentId,
							amountOrTokenId: 500n,
							recipient: user1.address,
							sender: owner.address,
							token: erc20.address,
							tokenType: 0,
						});
					}
				}
			}
		}
		expect(await erc20.balanceOf(owner.address)).equal(0);
		expect(await erc20.balanceOf(user2.address)).equal(1500);
		expect(await erc20.balanceOf(user1.address)).equal(500);
	});

	it('Send ERC721 bulkMail', async () => {
		const erc721 = await new MockERC721__factory(owner).deploy('Test', 'TST');

		await erc721.connect(owner).mint(123);

		await erc721.connect(owner).approve(payAddress, 123);

		expect(await erc721.balanceOf(user1.address)).equal(0);

		const walletController = await getWalletController(owner, ethers.provider, evmContractsTest);

		const deadline = await currentTimestamp().then(t => t + 1000);

		const content = new Uint8Array([1, 2, 3, 4, 5, 6]);

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
					address: bnToUint256(BigNumber.from(user1.address)),
					messageKey: MessageKey.fromBytes(new Uint8Array([2, 2, 3, 4, 5, 7])),
				},
			],
			{
				network: EVMNetwork.LOCAL_HARDHAT,
				supplement: {
					deadline,
					kind: ContractType.PAY,
					data: [{ amountOrTokenId: 123, token: erc721.address, recipient: user1.address, tokenType: 1 }],
				},
			},
		);
		expect(pushes.length).equal(1);
		const push = pushes[0].push;
		expect(push.$$meta.supplement.contractAddress).equal(payAddress);
		expect(push.$$meta.supplement.contractType).equal(ContractType.PAY);
		const msgId = push.msgId;
		const message = await blockchainController.getMessageByMsgId(msgId);
		expect(message).not.equal(null);
		if (message) {
			const result = await blockchainController.getTokenAttachments(message);
			expect(result).not.equal(null);
			if (result) {
				expect(result.kind).equal(ContractType.PAY);
				expect(result.attachments.length).equal(1);
				expect(result.attachments[0]).deep.equal({
					contentId: message.$$meta.contentId,
					amountOrTokenId: 123n,
					recipient: user1.address,
					sender: owner.address,
					token: erc721.address,
					tokenType: 1,
				});
			}
		}

		expect(await erc721.balanceOf(owner.address)).equal(0);
		expect(await erc721.balanceOf(user1.address)).equal(1);
		expect(await erc721.ownerOf(123)).equal(user1.address);
	});

	it('Send ERC20 addMailRecipients', async () => {
		const erc20 = await new MockERC20__factory(owner).deploy('Test', 'TST');
		await erc20.connect(owner).mint(2000);

		await erc20.connect(owner).approve(payAddress, 2000);

		expect(await erc20.balanceOf(user1.address)).equal(0);
		expect(await erc20.balanceOf(user2.address)).equal(0);

		const walletController = await getWalletController(owner, ethers.provider, evmContractsTest);

		const deadline = await currentTimestamp().then(t => t + 1000);

		const content = crypto.getRandomValues(new Uint8Array(32));

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
					kind: ContractType.PAY,
					data: [
						{ amountOrTokenId: 1500, token: erc20.address, recipient: user2.address, tokenType: 0 },
						{ amountOrTokenId: 500, token: erc20.address, recipient: user1.address, tokenType: 0 },
					],
				},
			},
		);
		for (const [index, { push }] of pushes.entries()) {
			expect(push.$$meta.supplement.contractAddress).equal(payAddress);
			expect(push.$$meta.supplement.contractType).equal(ContractType.PAY);
			const msgId = push.msgId;
			const message = await blockchainController.getMessageByMsgId(msgId);
			expect(message).not.equal(null);
			if (message) {
				const result = await blockchainController.getTokenAttachments(message);
				expect(result).not.equal(null);
				if (result) {
					expect(result.kind).equal(ContractType.PAY);
					expect(result.attachments.length).equal(1);
					if (index === 0) {
						expect(result.attachments[0]).deep.equal({
							contentId: message.$$meta.contentId,
							amountOrTokenId: 1500n,
							recipient: user2.address,
							sender: owner.address,
							token: erc20.address,
							tokenType: 0,
						});
					} else {
						expect(result.attachments[0]).deep.equal({
							contentId: message.$$meta.contentId,
							amountOrTokenId: 500n,
							recipient: user1.address,
							sender: owner.address,
							token: erc20.address,
							tokenType: 0,
						});
					}
				}
			}
		}
		expect(await erc20.balanceOf(owner.address)).equal(0);
		expect(await erc20.balanceOf(user2.address)).equal(1500);
		expect(await erc20.balanceOf(user1.address)).equal(500);
	});

	it('Send ERC721 addMailRecipients', async () => {
		const erc721 = await new MockERC721__factory(owner).deploy('Test', 'TST');

		await erc721.connect(owner).mint(123);

		await erc721.connect(owner).approve(payAddress, 123);

		expect(await erc721.balanceOf(user1.address)).equal(0);

		const walletController = await getWalletController(owner, ethers.provider, evmContractsTest);

		const deadline = await currentTimestamp().then(t => t + 1000);

		const content = crypto.getRandomValues(new Uint8Array(32));

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
					address: bnToUint256(BigNumber.from(user1.address)),
					messageKey: MessageKey.fromBytes(new Uint8Array([2, 2, 3, 4, 5, 7])),
				},
			],
			{
				network: EVMNetwork.LOCAL_HARDHAT,
				supplement: {
					deadline,
					kind: ContractType.PAY,
					data: [{ amountOrTokenId: 123, token: erc721.address, recipient: user1.address, tokenType: 1 }],
				},
			},
		);
		expect(pushes.length).equal(1);
		const push = pushes[0].push;
		expect(push.$$meta.supplement.contractAddress).equal(payAddress);
		expect(push.$$meta.supplement.contractType).equal(ContractType.PAY);
		const msgId = push.msgId;
		const message = await blockchainController.getMessageByMsgId(msgId);
		expect(message).not.equal(null);
		if (message) {
			const result = await blockchainController.getTokenAttachments(message);
			expect(result).not.equal(null);
			if (result) {
				expect(result.kind).equal(ContractType.PAY);
				expect(result.attachments.length).equal(1);
				expect(result.attachments[0]).deep.equal({
					contentId: message.$$meta.contentId,
					amountOrTokenId: 123n,
					recipient: user1.address,
					sender: owner.address,
					token: erc721.address,
					tokenType: 1,
				});
			}
		}

		expect(await erc721.balanceOf(owner.address)).equal(0);
		expect(await erc721.balanceOf(user1.address)).equal(1);
		expect(await erc721.ownerOf(123)).equal(user1.address);
	});
});
