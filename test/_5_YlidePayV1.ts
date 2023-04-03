import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

import {
	MockERC20,
	MockERC20__factory,
	MockERC721,
	MockERC721__factory,
	YlideMailerV9,
	YlideMailerV9__factory,
	YlidePayV1,
	YlidePayV1__factory,
} from '@ylide/ethereum-contracts';
import { Uint256 } from '@ylide/sdk';
import { expect } from 'chai';
import { BigNumber, providers } from 'ethers';
import { ethers, network } from 'hardhat';
import {
	AddMailRecipientsTypes,
	EVMMailerContractType,
	EVMYlidePayContractType,
	EthereumBlockchainReader,
	IEVMMailerContractLink,
	SendBulkMailTypes,
	bnToUint256,
} from '../src';
import { EthereumMailerV9Wrapper } from '../src/contract-wrappers/v9';

describe('YlidePayV1', () => {
	let owner: SignerWithAddress;
	let user1: SignerWithAddress;
	let user2: SignerWithAddress;
	let ylideMailer: YlideMailerV9;
	let ylidePay: YlidePayV1;
	let erc20: MockERC20;
	let erc721: MockERC721;
	let feedId: Uint256;
	const uniqueId = 123;
	const recipients = [1, 2].map(n => BigNumber.from(n)).map(bnToUint256);
	const keys = [new Uint8Array([1, 2, 3, 4, 5, 6]), new Uint8Array([6, 5, 4, 3, 2, 1])];
	const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

	const currentTimestamp = async () =>
		ethers.provider.getBlock(ethers.provider.getBlockNumber()).then(block => block.timestamp);

	let domain: {
		name: string;
		version: string;
		chainId: number;
		verifyingContract: string;
	};

	let firstBlockNumber: number;
	const partsCount = 4;
	const blockCountLock = 20;

	const getSendBulMailArgs = () => ({
		feedId,
		uniqueId,
		recipients,
		keys,
		content,
	});

	const getAddMailRecipientsArgs = () => ({
		feedId,
		uniqueId,
		recipients,
		keys,
		partsCount,
		blockCountLock,
		firstBlockNumber,
	});

	let readerForOwner: EthereumBlockchainReader;

	let mailerDesc: IEVMMailerContractLink;

	before(async () => {
		[owner, user1, user2] = await ethers.getSigners();

		ylideMailer = await new YlideMailerV9__factory(owner).deploy();
		ylidePay = await new YlidePayV1__factory(owner).deploy(ylideMailer.address);

		erc20 = await new MockERC20__factory(owner).deploy('Test', 'TST');
		erc721 = await new MockERC721__factory(owner).deploy('Test', 'TST');

		const tx = await ylideMailer.createMailingFeed('768768768768121341');
		const receipt = await tx.wait();
		feedId = bnToUint256(BigNumber.from(receipt.events?.[0].args?.[0] || 0));
		domain = {
			name: 'YlideMailerV9',
			version: '9',
			chainId: network.config.chainId || 0,
			verifyingContract: ylideMailer.address,
		};
		firstBlockNumber = await ethers.provider.getBlockNumber();

		readerForOwner = EthereumBlockchainReader.createEthereumBlockchainReader([
			{
				chainId: 31337,
				rpcUrlOrProvider: owner.provider || '',
				blockLimit: 100,
			},
		]);

		mailerDesc = {
			id: 1,
			type: EVMMailerContractType.EVMMailerV9,
			verified: false,
			address: ylideMailer.address,
			creationBlock: 1,
			pay: {
				id: 1,
				type: EVMYlidePayContractType.EVMYlidePayV1,
				verified: false,
				address: ylidePay.address,
				creationBlock: 2,
			},
		};
	});

	it('Send erc20 and erc721', async () => {
		const ownerMailerV9Wrapper = new EthereumMailerV9Wrapper(readerForOwner);

		await ownerMailerV9Wrapper.globals.setIsYlideTokenAttachment(
			mailerDesc,
			owner,
			owner.address,
			[ylidePay.address],
			[true],
		);

		const nonce1 = await ownerMailerV9Wrapper.mailing.getNonce(mailerDesc, user1.address);

		const deadline = await currentTimestamp().then(t => t + 1000);

		const sig1 = await user1._signTypedData(domain, SendBulkMailTypes, {
			feedId: BigNumber.from(`0x${feedId}`),
			uniqueId,
			nonce: nonce1,
			deadline,
			recipients: recipients.map(r => BigNumber.from(`0x${r}`)),
			keys: ethers.utils.concat(keys),
			content,
		});

		const sig2 = await ownerMailerV9Wrapper.mailing.signBulkMail(
			mailerDesc,
			user1 as unknown as providers.JsonRpcSigner,
			feedId,
			uniqueId,
			recipients,
			keys,
			content,
			deadline,
			nonce1.toNumber(),
			31337,
		);

		expect(sig1).equal(sig2);

		await erc20.connect(user1).mint(2000);

		await erc20.connect(user1).approve(ylidePay.address, 2000);

		expect(await erc20.balanceOf(user2.address)).equal(0);

		const { messages } = await ownerMailerV9Wrapper.mailing.sendBulkMail(
			mailerDesc,
			user1,
			user1.address,
			feedId,
			uniqueId,
			recipients,
			keys,
			content,
			BigNumber.from(0),
			{
				deadline,
				nonce: nonce1,
				signature: sig2,
				sender: user1.address,
			},
			{
				type: 0,
				args: [
					{ amountOrTokenId: 1000, token: erc20.address, recipient: user2.address, tokenType: 0 },
					{ amountOrTokenId: 1000, token: erc20.address, recipient: owner.address, tokenType: 0 },
				],
			},
		);

		for (const m of messages) {
			expect(m.$$meta.tokenAttachment).deep.equal([
				{
					amountOrTokenId: BigNumber.from(1000),
					recipient: user2.address,
					sender: user1.address,
					token: erc20.address,
					tokenType: 0,
				},
				{
					amountOrTokenId: BigNumber.from(1000),
					recipient: owner.address,
					sender: user1.address,
					token: erc20.address,
					tokenType: 0,
				},
			]);
		}

		expect(await erc20.balanceOf(user1.address)).equal(0);
		expect(await erc20.balanceOf(user2.address)).equal(1000);
		expect(await erc20.balanceOf(owner.address)).equal(1000);

		const nonce2 = await ownerMailerV9Wrapper.mailing.getNonce(mailerDesc, user1.address);

		const sig3 = await user1._signTypedData(domain, AddMailRecipientsTypes, {
			feedId: BigNumber.from(`0x${feedId}`),
			uniqueId,
			firstBlockNumber,
			nonce: nonce2,
			deadline,
			partsCount,
			blockCountLock,
			recipients: recipients.map(r => BigNumber.from(`0x${r}`)),
			keys: ethers.utils.concat(keys),
		});

		const sig4 = await ownerMailerV9Wrapper.mailing.signAddMailRecipients(
			mailerDesc,
			user1 as unknown as providers.JsonRpcSigner,
			feedId,
			uniqueId,
			firstBlockNumber,
			partsCount,
			blockCountLock,
			recipients,
			keys,
			deadline,
			nonce2,
			31337,
		);

		expect(sig3).equal(sig4);

		await erc721.connect(user1).mint(123);

		await erc721.connect(user1).approve(ylidePay.address, 123);

		expect(await erc721.balanceOf(user2.address)).equal(0);

		const { messages: messages2 } = await ownerMailerV9Wrapper.mailing.addMailRecipients(
			mailerDesc,
			user1,
			user1.address,
			feedId,
			uniqueId,
			firstBlockNumber,
			partsCount,
			blockCountLock,
			recipients,
			keys,
			BigNumber.from(0),
			{
				deadline,
				nonce: nonce2,
				signature: sig3,
				sender: user1.address,
			},
			{
				type: 0,
				args: [{ amountOrTokenId: 123, token: erc721.address, recipient: user2.address, tokenType: 1 }],
			},
		);

		expect(await erc721.balanceOf(user1.address)).equal(0);
		expect(await erc721.balanceOf(user2.address)).equal(1);
		expect(await erc721.ownerOf(123)).equal(user2.address);

		for (const m of messages2) {
			expect(m.$$meta.tokenAttachment).deep.equal([
				{
					amountOrTokenId: BigNumber.from(123),
					recipient: user2.address,
					sender: user1.address,
					token: erc721.address,
					tokenType: 1,
				},
			]);
		}
	});
});
