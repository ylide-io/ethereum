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
import { Uint256, YlideCore } from '@ylide/sdk';
import { expect } from 'chai';
import { BigNumber, providers } from 'ethers';
import { ethers, network } from 'hardhat';
import {
	ContractType,
	EVMMailerContractType,
	EVMYlidePayContractType,
	EthereumBlockchainReader,
	IEVMMailerContractLink,
	IEVMYlidePayContractLink,
	bnToUint256,
	hexPrefix,
} from '../src';
import { EthereumPayV1Wrapper } from '../src/contract-wrappers/EthereumPayV1Wrapper';
import { EthereumMailerV9Wrapper } from '../src/contract-wrappers/v9';
import { currentTimestamp } from './test-utils';

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
	const keys = [new Uint8Array([1, 2, 3, 4, 5, 6]), new Uint8Array([6, 5, 4, 3, 2, 1])];
	const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

	let domain: {
		name: string;
		version: string;
		chainId: number;
		verifyingContract: string;
	};

	let firstBlockNumber: number;
	const partsCount = 4;
	const blockCountLock = 20;

	let readerForOwner: EthereumBlockchainReader;

	let mailerDesc: IEVMMailerContractLink;

	let payDesc: IEVMYlidePayContractLink;

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

		payDesc = {
			id: 1,
			type: EVMYlidePayContractType.EVMYlidePayV1,
			verified: false,
			address: ylidePay.address,
			creationBlock: 2,
		};

		mailerDesc = {
			id: 1,
			type: EVMMailerContractType.EVMMailerV9,
			verified: false,
			address: ylideMailer.address,
			creationBlock: 1,
			pay: payDesc,
		};
	});

	it('Send erc20 and erc721', async () => {
		const mailerWrapper = new EthereumMailerV9Wrapper(readerForOwner);
		const payWrapper = new EthereumPayV1Wrapper(readerForOwner);

		await mailerWrapper.globals.setIsYlide(mailerDesc, owner, [ylidePay.address], [true]);

		const nonce1 = await mailerWrapper.mailing.getNonce(mailerDesc, user1.address);

		const deadline = await currentTimestamp().then(t => t + 1000);

		const sig1 = await user1._signTypedData(domain, mailerWrapper.mailing.SendBulkMailTypes, {
			feedId: hexPrefix(feedId),
			uniqueId,
			nonce: nonce1,
			deadline,
			recipients: [
				...[user2.address, owner.address].map(r => BigNumber.from(r)),
				BigNumber.from(`0x${YlideCore.getSentAddress(bnToUint256(BigNumber.from(user1.address)))}`),
			],
			keys: ethers.utils.concat([...keys, new Uint8Array(1)]),
			content,
			contractAddress: ylidePay.address,
			contractType: ContractType.PAY,
		});

		const { signature: sig2 } = await mailerWrapper.mailing.signBulkMail(
			{
				mailer: mailerDesc,
				signer: user1 as unknown as providers.JsonRpcSigner,
				deadline,
				nonce: nonce1,
				chainId: 31337,
			},
			{
				feedId: hexPrefix(feedId),
				uniqueId,
				recipients: [
					...[user2.address, owner.address].map(r => bnToUint256(BigNumber.from(r))),
					YlideCore.getSentAddress(bnToUint256(BigNumber.from(user1.address))),
				].map(hexPrefix),
				keys: [...keys, new Uint8Array(1)],
				content,
			},
			{ contractAddress: ylidePay.address, contractType: ContractType.PAY },
		);

		expect(sig1).equal(sig2);

		await erc20.connect(user1).mint(2000);

		await erc20.connect(user1).approve(ylidePay.address, 2000);

		expect(await erc20.balanceOf(user2.address)).equal(0);

		const { messages } = await payWrapper.sendBulkMailWithToken(
			{ mailer: mailerDesc, signer: user1, value: BigNumber.from(0) },
			{
				feedId: hexPrefix(feedId),
				uniqueId,
				recipients: [
					...[user2.address, owner.address].map(r => bnToUint256(BigNumber.from(r))),
					YlideCore.getSentAddress(bnToUint256(BigNumber.from(user1.address))),
				].map(hexPrefix),
				keys: [...keys, new Uint8Array(1)],
				content,
			},
			{
				deadline,
				nonce: nonce1,
				signature: sig2,
				sender: user1.address,
			},
			mailerWrapper,
			payDesc,
			[
				{ amountOrTokenId: 1000, token: erc20.address, recipient: user2.address, tokenType: 0 },
				{ amountOrTokenId: 1000, token: erc20.address, recipient: owner.address, tokenType: 0 },
			],
		);

		for (const m of messages) {
			const attachments = await payWrapper.getTokenAttachments(
				{
					id: 1,
					address: ylidePay.address,
					verified: false,
					type: EVMYlidePayContractType.EVMYlidePayV1,
					creationBlock: 2,
				},
				m,
			);
			if (m.recipientAddress === YlideCore.getSentAddress(bnToUint256(BigNumber.from(user1.address)))) {
				expect(attachments.length).equal(2);
			} else {
				expect(attachments.length).equal(1);
			}
			attachments.forEach(a => expect(a.sender).equal(user1.address));
		}

		expect(await erc20.balanceOf(user1.address)).equal(0);
		expect(await erc20.balanceOf(user2.address)).equal(1000);
		expect(await erc20.balanceOf(owner.address)).equal(1000);

		const nonce2 = await mailerWrapper.mailing.getNonce(mailerDesc, user1.address);

		const sig3 = await user1._signTypedData(domain, mailerWrapper.mailing.AddMailRecipientsTypes, {
			feedId: hexPrefix(feedId),
			uniqueId,
			firstBlockNumber,
			nonce: nonce2,
			deadline,
			partsCount,
			blockCountLock,
			recipients: [
				BigNumber.from(user2.address),
				BigNumber.from(`0x${YlideCore.getSentAddress(bnToUint256(BigNumber.from(user1.address)))}`),
			],
			keys: ethers.utils.concat(keys),
			contractAddress: ylidePay.address,
			contractType: ContractType.PAY,
		});

		const { signature: sig4 } = await mailerWrapper.mailing.signAddMailRecipients(
			{
				mailer: mailerDesc,
				signer: user1 as unknown as providers.JsonRpcSigner,
				deadline,
				nonce: nonce2,
				chainId: 31337,
			},
			{
				feedId: hexPrefix(feedId),
				uniqueId,
				firstBlockNumber,
				partsCount,
				blockCountLock,
				recipients: [
					bnToUint256(BigNumber.from(user2.address)),
					YlideCore.getSentAddress(bnToUint256(BigNumber.from(user1.address))),
				].map(hexPrefix),
				keys,
			},
			{ contractAddress: ylidePay.address, contractType: ContractType.PAY },
		);

		expect(sig3).equal(sig4);

		await erc721.connect(user1).mint(123);

		await erc721.connect(user1).approve(ylidePay.address, 123);

		expect(await erc721.balanceOf(user2.address)).equal(0);

		await payWrapper.addMailRecipientsWithToken(
			{ mailer: mailerDesc, signer: user1, value: BigNumber.from(0) },
			{
				feedId: hexPrefix(feedId),
				uniqueId,
				recipients: [
					bnToUint256(BigNumber.from(user2.address)),
					YlideCore.getSentAddress(bnToUint256(BigNumber.from(user1.address))),
				].map(hexPrefix),
				keys,
				firstBlockNumber,
				partsCount,
				blockCountLock,
			},
			{
				deadline,
				nonce: nonce2,
				signature: sig3,
				sender: user1.address,
			},
			mailerWrapper,
			payDesc,
			[{ amountOrTokenId: 123, token: erc721.address, recipient: user2.address, tokenType: 1 }],
		);

		expect(await erc721.balanceOf(user1.address)).equal(0);
		expect(await erc721.balanceOf(user2.address)).equal(1);
		expect(await erc721.ownerOf(123)).equal(user2.address);
	});
});
