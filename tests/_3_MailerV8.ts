/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable @typescript-eslint/prefer-for-of */
import { expect } from 'chai';
import { BigNumber, Signer } from 'ethers';
import hre from 'hardhat';
import { describe, it, before } from 'mocha';
import { mine } from '@nomicfoundation/hardhat-network-helpers';
import { YlideMailerV8, YlideMailerV8__factory } from '@ylide/ethereum-contracts';
import { EthereumBlockchainReader } from '../src/controllers/helpers/EthereumBlockchainReader';
import { EthereumMailerV8Wrapper } from '../src/contract-wrappers/v8/EthereumMailerV8Wrapper';
import { EVMMailerContractType, IEVMMailerContractLink, IEVMMessage } from '../src';
import { Uint256, YLIDE_MAIN_FEED_ID } from '@ylide/sdk';
import { decodeContentId } from '../src/misc/contentId';

describe('YlideMailerV8', function () {
	this.timeout('2000s');
	it('Should deploy', async function () {
		const signer = await hre.ethers.getSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
		const mailerFactory = new YlideMailerV8__factory(signer);
		await mailerFactory.deploy();
	});

	describe('EthereumBlockchainReader', async function () {
		let ownerSigner: Signer;
		let beneficiarySigner: Signer;
		let userSigner: Signer;

		let readerForOwner: EthereumBlockchainReader;
		let readerForBeneficiary: EthereumBlockchainReader;
		let readerForUser: EthereumBlockchainReader;

		before(async function () {
			ownerSigner = await hre.ethers.getSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
			beneficiarySigner = await hre.ethers.getSigner('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
			userSigner = await hre.ethers.getSigner('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');

			readerForOwner = EthereumBlockchainReader.createEthereumBlockchainReader([
				{
					rpcUrlOrProvider: ownerSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForBeneficiary = EthereumBlockchainReader.createEthereumBlockchainReader([
				{
					rpcUrlOrProvider: beneficiarySigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForUser = EthereumBlockchainReader.createEthereumBlockchainReader([
				{
					rpcUrlOrProvider: userSigner.provider!,
					blockLimit: 100,
				},
			]);
		});
		describe('EthereumMailerV8Wrapper', async function () {
			let mailerFactory;
			let mailer: YlideMailerV8;
			let mailerDesc: IEVMMailerContractLink;

			beforeEach(async function () {
				mailerFactory = new YlideMailerV8__factory(ownerSigner);
				mailer = await mailerFactory.deploy();
				mailerDesc = {
					id: 1,
					type: EVMMailerContractType.EVMMailerV8,
					verified: false,
					address: mailer.address,
					creationBlock: 1,
				};
			});
			describe('Misceallenous', function () {
				it('Set & get owner', async function () {
					const ownerMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForOwner);

					const ownerBeforeTxToSet = await ownerMailerV8Wrapper.globals.getOwner(mailerDesc);

					expect(ownerBeforeTxToSet, 'Owner before tx to set must be zero-address').to.equal(
						await ownerSigner.getAddress(),
					);

					const txToSet = await ownerMailerV8Wrapper.globals.setOwner(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						await userSigner.getAddress(),
					);

					const ownerAfterTxToSet = await ownerMailerV8Wrapper.globals.getOwner(mailerDesc);

					expect(ownerAfterTxToSet, 'Owner after tx to set must be user address').to.equal(
						await userSigner.getAddress(),
					);
				});
				it('Set & get beneficiary', async function () {
					const ownerMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForOwner);

					const beneficiaryBeforeTxToSet = await ownerMailerV8Wrapper.globals.getBeneficiary(mailerDesc);

					expect(beneficiaryBeforeTxToSet, 'Beneficiary before tx to set must be owner address').to.equal(
						await ownerSigner.getAddress(),
					);

					const txToSet = await ownerMailerV8Wrapper.globals.setBeneficiary(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						await userSigner.getAddress(),
					);

					const beneficiaryAfterTxToSet = await ownerMailerV8Wrapper.globals.getBeneficiary(mailerDesc);

					expect(beneficiaryAfterTxToSet, 'Beneficiary after tx to set must be user address').to.equal(
						await userSigner.getAddress(),
					);
				});
				it('Set & get fees', async function () {
					const ownerMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForOwner);

					const feesBeforeTxToSet = await ownerMailerV8Wrapper.globals.getFees(mailerDesc);
					expect(
						feesBeforeTxToSet.contentPartFee.toNumber(),
						'Content part fee before tx to set must be zero',
					).to.equal(0);
					expect(
						feesBeforeTxToSet.recipientFee.toNumber(),
						'Recipient fee before tx to set must be zero',
					).to.equal(0);
					expect(
						feesBeforeTxToSet.broadcastFee.toNumber(),
						'Broadcast fee before tx to set must be zero',
					).to.equal(0);
					const txToSet = await ownerMailerV8Wrapper.globals.setFees(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						{
							contentPartFee: BigNumber.from(1),
							recipientFee: BigNumber.from(2),
							broadcastFee: BigNumber.from(3),
						},
					);
					const feesAfterTxToSet = await ownerMailerV8Wrapper.globals.getFees(mailerDesc);
					expect(
						feesAfterTxToSet.contentPartFee.toNumber(),
						'Content part fee after tx to set must be 1',
					).to.equal(1);
					expect(
						feesAfterTxToSet.recipientFee.toNumber(),
						'Recipient fee after tx to set must be 2',
					).to.equal(2);
					expect(
						feesAfterTxToSet.broadcastFee.toNumber(),
						'Broadcast fee after tx to set must be 3',
					).to.equal(3);
				});
				it('Set & get prices', async function () {
					const ownerMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForOwner);

					const pricesBeforeTxToSet = await ownerMailerV8Wrapper.globals.getPrices(mailerDesc);

					expect(
						pricesBeforeTxToSet.broadcastFeedCreationPrice,
						'Broadcast feed creation price before tx to set must be zero',
					).to.equal('0');
					expect(
						pricesBeforeTxToSet.mailingFeedCreationPrice,
						'Mailing feed creation price before tx to set must be zero',
					).to.equal('0');

					const txToSet = await ownerMailerV8Wrapper.globals.setPrices(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						{
							broadcastFeedCreationPrice: '1',
							mailingFeedCreationPrice: '2',
						},
					);

					const pricesAfterTxToSet = await ownerMailerV8Wrapper.globals.getPrices(mailerDesc);

					expect(
						pricesAfterTxToSet.broadcastFeedCreationPrice,
						'Broadcast feed creation price after tx to set must be 1',
					).to.equal('1');
					expect(
						pricesAfterTxToSet.mailingFeedCreationPrice,
						'Mailing feed creation price after tx to set must be 2',
					).to.equal('2');
				});
			});
			describe('Feed management', function () {
				it('Create & manage mailing feed', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const { feedId } = await userMailerV8Wrapper.mailing.createMailingFeed(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						BigNumber.from(0),
					);

					expect(feedId).not.to.be.null;

					const feed = await userMailerV8Wrapper.mailing.getMailingFeedParams(mailerDesc, feedId!);

					expect(feed.owner, 'Feed owner must be user address').to.equal(await userSigner.getAddress());
					expect(feed.recipientFee.toNumber(), 'Feed recipient fee must be zero').to.equal(0);
					expect(feed.beneficiary, 'Feed beneficiary must be user address').to.equal(
						await userSigner.getAddress(),
					);

					await userMailerV8Wrapper.mailing.setMailingFeedOwner(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						feedId!,
						await ownerSigner.getAddress(),
					);

					const feed2 = await userMailerV8Wrapper.mailing.getMailingFeedParams(mailerDesc, feedId!);

					expect(feed2.owner, 'Feed owner must be owner address').to.equal(await ownerSigner.getAddress());

					await userMailerV8Wrapper.mailing.setMailingFeedFees(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						feedId!,
						{
							recipientFee: BigNumber.from(1),
						},
					);

					const feed3 = await userMailerV8Wrapper.mailing.getMailingFeedParams(mailerDesc, feedId!);

					expect(feed3.recipientFee.toNumber(), 'Feed recipient fee must be 1').to.equal(1);

					await userMailerV8Wrapper.mailing.setMailingFeedBeneficiary(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						feedId!,
						await beneficiarySigner.getAddress(),
					);

					const feed4 = await userMailerV8Wrapper.mailing.getMailingFeedParams(mailerDesc, feedId!);

					expect(feed4.beneficiary, 'Feed beneficiary must be beneficiary address').to.equal(
						await beneficiarySigner.getAddress(),
					);
				});
				it('Create & send and receive messages in mailing feed', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);
					const ownerMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForOwner);

					const { feedId } = await userMailerV8Wrapper.mailing.createMailingFeed(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						BigNumber.from(0),
					);

					const uniqueId = 123;
					const recipientHex = '1234567890123456789012345678901234567890123456789012345678901234' as Uint256;
					const key = new Uint8Array([1, 2, 3, 4, 5, 6]);
					const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

					await mine(129);

					const { tx, receipt, logs } = await userMailerV8Wrapper.mailing.sendSmallMail(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						feedId!,
						uniqueId,
						recipientHex,
						key,
						content,
						BigNumber.from(0),
					);

					expect(receipt, 'Receipt must be present').to.not.be.undefined;

					const mailPush = logs.find(log => log.name === 'MailPush');
					const messageContent = logs.find(log => log.name === 'MessageContent');

					expect(mailPush, 'MailPush event must be present').to.not.be.undefined;
					expect(mailPush!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						mailPush!.args.recipient.toHexString(),
						'Recipient must be 0x1234567890123456789012345678901234567890123456789012345678901234',
					).to.equal('0x1234567890123456789012345678901234567890123456789012345678901234');
					expect(mailPush!.args.key, 'Key must be 0x010203040506').to.equal('0x010203040506');
					expect(
						mailPush!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					const contentId = decodeContentId(mailPush!.args.contentId.toHexString());
					expect(contentId.version, 'Version must be 8').to.equal(8);
					expect(contentId.partsCount, 'Parts count must be 1').to.equal(1);
					expect(contentId.blockCountLock, 'Block count lock must be 0').to.equal(0);

					expect(messageContent, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent!.args.parts, 'Parts must be 1').to.equal(1);
					expect(messageContent!.args.partIdx, 'partIdx must be 0').to.equal(0);

					// retrieve:

					const msgs = await userMailerV8Wrapper.mailing.retrieveMailHistoryDesc(
						mailerDesc,
						feedId!,
						'1234567890123456789012345678901234567890123456789012345678901234' as Uint256,
						null,
						false,
						null,
						false,
						10,
					);

					expect(msgs.length, 'Messages count must be 1').to.equal(1);
					expect(msgs[0].feedId, 'Feed id must be new feedId').to.equal(feedId);
					expect(msgs[0].key.join(','), 'Key must be 1,2,3,4,5,6').to.equal('1,2,3,4,5,6');
				});
				it('Create & manage broadcast feed', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const { feedId: feedId1 } = await userMailerV8Wrapper.broadcast.createBroadcastFeed(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						true,
						BigNumber.from(0),
					);

					expect(feedId1).not.to.be.null;

					const feed1 = await userMailerV8Wrapper.broadcast.getBroadcastFeedParams(mailerDesc, feedId1!);
					const isUserWriter = await userMailerV8Wrapper.broadcast.isBroadcastFeedWriter(
						mailerDesc,
						feedId1!,
						await userSigner.getAddress(),
					);
					const isOwnerWriter = await userMailerV8Wrapper.broadcast.isBroadcastFeedWriter(
						mailerDesc,
						feedId1!,
						await ownerSigner.getAddress(),
					);

					expect(feed1.owner, 'Feed owner must be user address').to.equal(await userSigner.getAddress());
					expect(feed1.isPublic, 'Feed isPublic must be true').to.be.true;
					expect(isUserWriter, 'User must be writer').to.be.true;
					expect(isOwnerWriter, 'Owner must not be writer').to.be.false;

					await userMailerV8Wrapper.broadcast.addBroadcastFeedWriter(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						feedId1!,
						await ownerSigner.getAddress(),
					);

					const isOwnerWriterAfterAdd = await userMailerV8Wrapper.broadcast.isBroadcastFeedWriter(
						mailerDesc,
						feedId1!,
						await ownerSigner.getAddress(),
					);

					expect(isOwnerWriterAfterAdd, 'Owner must be writer').to.be.true;

					await userMailerV8Wrapper.broadcast.removeBroadcastFeedWriter(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						feedId1!,
						await userSigner.getAddress(),
					);

					const isUserWriterAfterRemove = await userMailerV8Wrapper.broadcast.isBroadcastFeedWriter(
						mailerDesc,
						feedId1!,
						await userSigner.getAddress(),
					);

					expect(isUserWriterAfterRemove, 'User must not be writer').to.be.false;

					await userMailerV8Wrapper.broadcast.setBroadcastFeedPublicity(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						feedId1!,
						false,
					);

					const feed1AfterChange = await userMailerV8Wrapper.broadcast.getBroadcastFeedParams(
						mailerDesc,
						feedId1!,
					);

					expect(feed1AfterChange.isPublic, 'Feed isPublic must be false').to.be.false;

					await userMailerV8Wrapper.broadcast.setBroadcastFeedOwner(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						feedId1!,
						await ownerSigner.getAddress(),
					);

					const feed1AfterTransfer = await userMailerV8Wrapper.broadcast.getBroadcastFeedParams(
						mailerDesc,
						feedId1!,
					);

					expect(feed1AfterTransfer.owner, 'Feed owner must be owner address').to.equal(
						await ownerSigner.getAddress(),
					);
				});
				it('Create & send and receive broadcast', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);
					const ownerMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForOwner);

					const { feedId: feedId1 } = await userMailerV8Wrapper.broadcast.createBroadcastFeed(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						true,
						BigNumber.from(0),
					);

					expect(feedId1).not.to.be.null;

					const uniqueId = 123;
					const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

					await mine(129);

					const { tx, receipt, logs } = await userMailerV8Wrapper.broadcast.sendBroadcast(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						feedId1!,
						uniqueId,
						content,
						BigNumber.from(0),
					);

					expect(receipt, 'Receipt must be present').to.not.be.undefined;
					expect(receipt.status, 'Receipt status must be 1').to.equal(1);

					const broadcastPush = logs.find(log => log.name === 'BroadcastPush');
					const messageContent = logs.find(log => log.name === 'MessageContent');

					expect(broadcastPush, 'BroadcastPush event must be present').to.not.be.undefined;
					expect(broadcastPush!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						broadcastPush!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					const contentId = decodeContentId(broadcastPush!.args.contentId.toHexString());
					expect(contentId.version, 'Version must be 8').to.equal(8);
					expect(contentId.partsCount, 'Parts count must be 1').to.equal(1);
					expect(contentId.blockCountLock, 'Block count lock must be 0').to.equal(0);

					expect(messageContent, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent!.args.parts, 'Parts must be 1').to.equal(1);
					expect(messageContent!.args.partIdx, 'partIdx must be 0').to.equal(0);

					const msgs = await userMailerV8Wrapper.broadcast.retrieveBroadcastHistoryDesc(
						mailerDesc,
						feedId1!,
						null,
						false,
						null,
						false,
						10,
					);

					expect(msgs.length, 'Messages count must be 1').to.equal(1);
					expect(msgs[0].senderAddress, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(msgs[0].isBroadcast, 'isBroadcast must be true').to.be.true;

					const retrievedContent = await userMailerV8Wrapper.content.retrieveMessageContent(
						mailerDesc,
						msgs[0],
					);

					expect(retrievedContent).not.to.be.null;
					if (retrievedContent === null) {
						return;
					}
					expect(retrievedContent.corrupted, 'Content must not be corrupted').to.be.false;
					if (retrievedContent.corrupted) {
						return;
					}

					expect(retrievedContent.content.join(','), 'Content must be 8,7,8,7,8,7').to.equal('8,7,8,7,8,7');

					await userMailerV8Wrapper.broadcast.setBroadcastFeedPublicity(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						feedId1!,
						false,
					);

					let wasError = false;

					try {
						const {
							tx: tx2,
							receipt: receipt2,
							logs: logs2,
						} = await userMailerV8Wrapper.broadcast.sendBroadcast(
							mailerDesc,
							ownerSigner,
							await ownerSigner.getAddress(),
							feedId1!,
							uniqueId + 1,
							content,
							BigNumber.from(0),
						);
					} catch (err: any) {
						wasError = true;
						expect(err, 'Error must be present').to.not.be.undefined;
						expect(err.reason, 'Error reason must be correct').to.equal(
							"VM Exception while processing transaction: reverted with reason string 'You are not allowed to write to this feed'",
						);
					}

					expect(wasError, 'Error must be thrown').to.be.true;

					await userMailerV8Wrapper.broadcast.addBroadcastFeedWriter(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						feedId1!,
						await ownerSigner.getAddress(),
					);

					const {
						tx: tx3,
						receipt: receipt3,
						logs: logs3,
					} = await userMailerV8Wrapper.broadcast.sendBroadcast(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						feedId1!,
						uniqueId + 1,
						content,
						BigNumber.from(0),
					);

					expect(receipt3, 'Receipt must be present').to.not.be.undefined;
					expect(receipt3.status, 'Receipt status must be 1').to.equal(1);
				});
				it('Create priced feeds', async function () {
					const ownerMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForOwner);

					const txToSet = await ownerMailerV8Wrapper.globals.setPrices(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						{
							broadcastFeedCreationPrice: '10',
							mailingFeedCreationPrice: '20',
						},
					);

					let wasError1 = false;

					try {
						await ownerMailerV8Wrapper.broadcast.createBroadcastFeed(
							mailerDesc,
							ownerSigner,
							await ownerSigner.getAddress(),
							true,
							BigNumber.from(0),
						);
					} catch (err: any) {
						wasError1 = true;
						expect(err, 'Error must be present').to.not.be.undefined;
						expect(err.reason, 'Error reason must be correct').to.equal(
							'Transaction reverted without a reason string',
						);
					}

					expect(wasError1, 'Error must be thrown').to.be.true;

					let wasError2 = false;

					try {
						await ownerMailerV8Wrapper.broadcast.createBroadcastFeed(
							mailerDesc,
							ownerSigner,
							await ownerSigner.getAddress(),
							true,
							BigNumber.from(5),
						);
					} catch (err: any) {
						wasError2 = true;
						expect(err, 'Error must be present').to.not.be.undefined;
						expect(err.reason, 'Error reason must be correct').to.equal(
							'Transaction reverted without a reason string',
						);
					}

					expect(wasError2, 'Error must be thrown').to.be.true;

					await ownerMailerV8Wrapper.broadcast.createBroadcastFeed(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						true,
						BigNumber.from(10),
					);

					// TODO: mailing

					let wasError4 = false;

					try {
						await ownerMailerV8Wrapper.mailing.createMailingFeed(
							mailerDesc,
							ownerSigner,
							await ownerSigner.getAddress(),
							BigNumber.from(0),
						);
					} catch (err: any) {
						wasError4 = true;
						expect(err, 'Error must be present').to.not.be.undefined;
						expect(err.reason, 'Error reason must be correct').to.equal(
							'Transaction reverted without a reason string',
						);
					}

					expect(wasError4, 'Error must be thrown').to.be.true;

					let wasError5 = false;

					try {
						await ownerMailerV8Wrapper.mailing.createMailingFeed(
							mailerDesc,
							ownerSigner,
							await ownerSigner.getAddress(),
							BigNumber.from(15),
						);
					} catch (err: any) {
						wasError5 = true;
						expect(err, 'Error must be present').to.not.be.undefined;
						expect(err.reason, 'Error reason must be correct').to.equal(
							'Transaction reverted without a reason string',
						);
					}

					expect(wasError5, 'Error must be thrown').to.be.true;

					await ownerMailerV8Wrapper.mailing.createMailingFeed(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						BigNumber.from(20),
					);
				});
			});
			describe('Sending messages', function () {
				// sendSmallMail
				// sendBulkMail
				// addMailRecipients
				// sendBroadcast
				// sendBroadcastHeader
				// sendMessageContentPart
				it('Send small mail', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const uniqueId = 123;
					const recipientHex = '1234567890123456789012345678901234567890123456789012345678901234' as Uint256;
					const key = new Uint8Array([1, 2, 3, 4, 5, 6]);
					const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

					const { tx, receipt, logs } = await userMailerV8Wrapper.mailing.sendSmallMail(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						YLIDE_MAIN_FEED_ID,
						uniqueId,
						recipientHex,
						key,
						content,
						BigNumber.from(0),
					);

					expect(receipt, 'Receipt must be present').to.not.be.undefined;

					const mailPush = logs.find(log => log.name === 'MailPush');
					const messageContent = logs.find(log => log.name === 'MessageContent');

					expect(mailPush, 'MailPush event must be present').to.not.be.undefined;
					expect(mailPush!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						mailPush!.args.recipient.toHexString(),
						'Recipient must be 0x1234567890123456789012345678901234567890123456789012345678901234',
					).to.equal('0x1234567890123456789012345678901234567890123456789012345678901234');
					expect(mailPush!.args.key, 'Key must be 0x010203040506').to.equal('0x010203040506');
					expect(
						mailPush!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					const contentId = decodeContentId(mailPush!.args.contentId.toHexString());
					expect(contentId.version, 'Version must be 8').to.equal(8);
					expect(contentId.partsCount, 'Parts count must be 1').to.equal(1);
					expect(contentId.blockCountLock, 'Block count lock must be 0').to.equal(0);

					expect(messageContent, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent!.args.parts, 'Parts must be 1').to.equal(1);
					expect(messageContent!.args.partIdx, 'partIdx must be 0').to.equal(0);
				});
				it('Send bulk mail', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const uniqueId = 123;
					const recipient1Hex = '1234567890123456789012345678901234567890123456789012345678901234' as Uint256;
					const recipient2Hex = '9842759812837345701098213740237489321758326574629847290175438783' as Uint256;
					const key1 = new Uint8Array([1, 2, 3, 4, 5, 6]);
					const key2 = new Uint8Array([6, 5, 4, 3, 2, 1]);
					const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

					const { tx, receipt, logs } = await userMailerV8Wrapper.mailing.sendBulkMail(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						YLIDE_MAIN_FEED_ID,
						uniqueId,
						[recipient1Hex, recipient2Hex],
						[key1, key2],
						content,
						BigNumber.from(0),
					);

					expect(receipt, 'Receipt must be present').to.not.be.undefined;

					const mailPush1 = logs.find(log => log.name === 'MailPush');
					const mailPush2 = logs.find((log, _idx) => log.name === 'MailPush' && log !== mailPush1);
					const messageContent = logs.find(log => log.name === 'MessageContent');

					expect(mailPush1, 'MailPush event must be present').to.not.be.undefined;
					expect(mailPush1!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						mailPush1!.args.recipient.toHexString(),
						'Recipient must be 0x1234567890123456789012345678901234567890123456789012345678901234',
					).to.equal('0x1234567890123456789012345678901234567890123456789012345678901234');
					expect(mailPush1!.args.key, 'Key must be 0x010203040506').to.equal('0x010203040506');
					expect(
						mailPush1!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					expect(mailPush2, 'MailPush event must be present').to.not.be.undefined;
					expect(mailPush2!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						mailPush2!.args.recipient.toHexString(),
						'Recipient must be 0x9842759812837345701098213740237489321758326574629847290175438783',
					).to.equal('0x9842759812837345701098213740237489321758326574629847290175438783');
					expect(mailPush2!.args.key, 'Key must be 0x060504030201').to.equal('0x060504030201');
					expect(
						mailPush2!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					const contentId1 = decodeContentId(mailPush1!.args.contentId.toHexString());
					expect(contentId1.version, 'Version must be 8').to.equal(8);
					expect(contentId1.partsCount, 'Parts count must be 1').to.equal(1);
					expect(contentId1.blockCountLock, 'Block count lock must be 0').to.equal(0);

					const contentId2 = decodeContentId(mailPush2!.args.contentId.toHexString());
					expect(contentId2.version, 'Version must be 8').to.equal(8);
					expect(contentId2.partsCount, 'Parts count must be 1').to.equal(1);
					expect(contentId2.blockCountLock, 'Block count lock must be 0').to.equal(0);

					expect(messageContent, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent!.args.parts, 'Parts must be 1').to.equal(1);
					expect(messageContent!.args.partIdx, 'partIdx must be 0').to.equal(0);
				});
				it('Send multipart mail', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const uniqueId = 123;
					const recipient1Hex = '1234567890123456789012345678901234567890123456789012345678901234' as Uint256;
					const recipient2Hex = '9842759812837345701098213740237489321758326574629847290175438783' as Uint256;
					const key1 = new Uint8Array([1, 2, 3, 4, 5, 6]);
					const key2 = new Uint8Array([6, 5, 4, 3, 2, 1]);
					const content1 = new Uint8Array([8, 7, 8, 7, 8, 7]);
					const content2 = new Uint8Array([5, 6, 5, 6, 5, 6]);

					const currentBlock = await userSigner.provider!.getBlockNumber();

					const {
						tx: tx1,
						receipt: receipt1,
						logs: logs1,
					} = await userMailerV8Wrapper.content.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						0,
						content1,
						BigNumber.from(0),
					);

					const {
						tx: tx2,
						receipt: receipt2,
						logs: logs2,
					} = await userMailerV8Wrapper.content.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						1,
						content2,
						BigNumber.from(0),
					);

					expect(receipt1, 'Receipt must be present').to.not.be.undefined;

					const messageContent1 = logs1.find(log => log.name === 'MessageContent');

					expect(messageContent1, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent1!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent1!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent1!.args.parts, 'Parts must be 2').to.equal(2);
					expect(messageContent1!.args.partIdx, 'partIdx must be 0').to.equal(0);

					expect(receipt2, 'Receipt must be present').to.not.be.undefined;

					const messageContent2 = logs2.find(log => log.name === 'MessageContent');

					expect(messageContent2, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent2!.args.content, 'Content must be 0x050605060506').to.equal('0x050605060506');
					expect(messageContent2!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent2!.args.parts, 'Parts must be 2').to.equal(2);
					expect(messageContent2!.args.partIdx, 'partIdx must be 1').to.equal(1);

					const {
						tx: tx3,
						receipt: receipt3,
						logs: logs3,
					} = await userMailerV8Wrapper.mailing.addMailRecipients(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						YLIDE_MAIN_FEED_ID,
						uniqueId,
						currentBlock,
						2,
						100,
						[recipient1Hex, recipient2Hex],
						[key1, key2],
						BigNumber.from(0),
					);

					expect(receipt3, 'Receipt must be present').to.not.be.undefined;

					const mailPush1 = logs3.find(log => log.name === 'MailPush');
					const mailPush2 = logs3.find(log => log.name === 'MailPush' && log !== mailPush1);

					expect(mailPush1, 'MailPush event must be present').to.not.be.undefined;
					expect(mailPush1!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						mailPush1!.args.recipient.toHexString(),
						'Recipient must be 0x1234567890123456789012345678901234567890123456789012345678901234',
					).to.equal('0x1234567890123456789012345678901234567890123456789012345678901234');
					expect(mailPush1!.args.key, 'Key must be 0x010203040506').to.equal('0x010203040506');
					expect(
						mailPush1!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					expect(mailPush2, 'MailPush event must be present').to.not.be.undefined;
					expect(mailPush2!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						mailPush2!.args.recipient.toHexString(),
						'Recipient must be 0x9842759812837345701098213740237489321758326574629847290175438783',
					).to.equal('0x9842759812837345701098213740237489321758326574629847290175438783');
					expect(mailPush2!.args.key, 'Key must be 0x060504030201').to.equal('0x060504030201');
					expect(
						mailPush2!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					const contentId1 = decodeContentId(mailPush1!.args.contentId.toHexString());
					expect(contentId1.version, 'Version must be 8').to.equal(8);
					expect(contentId1.partsCount, 'Parts count must be 2').to.equal(2);
					expect(contentId1.blockCountLock, 'Block count lock must be 100').to.equal(100);

					const contentId2 = decodeContentId(mailPush2!.args.contentId.toHexString());
					expect(contentId2.version, 'Version must be 8').to.equal(8);
					expect(contentId2.partsCount, 'Parts count must be 2').to.equal(2);
					expect(contentId2.blockCountLock, 'Block count lock must be 100').to.equal(100);
				});
				it('Send broadcast', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const uniqueId = 123;
					const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

					const { tx, receipt, logs } = await userMailerV8Wrapper.broadcast.sendBroadcast(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						'0000000000000000000000000000000000000000000000000000000000000002' as Uint256,
						uniqueId,
						content,
						BigNumber.from(0),
					);

					expect(receipt, 'Receipt must be present').to.not.be.undefined;

					const broadcastPush = logs.find(log => log.name === 'BroadcastPush');
					const messageContent = logs.find(log => log.name === 'MessageContent');

					expect(broadcastPush, 'BroadcastPush event must be present').to.not.be.undefined;
					expect(broadcastPush!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						broadcastPush!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					const contentId = decodeContentId(broadcastPush!.args.contentId.toHexString());
					expect(contentId.version, 'Version must be 8').to.equal(8);
					expect(contentId.partsCount, 'Parts count must be 1').to.equal(1);
					expect(contentId.blockCountLock, 'Block count lock must be 0').to.equal(0);

					expect(messageContent, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent!.args.parts, 'Parts must be 1').to.equal(1);
					expect(messageContent!.args.partIdx, 'partIdx must be 0').to.equal(0);
				});
				it('Send multipart broadcast', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const uniqueId = 123;
					const content1 = new Uint8Array([8, 7, 8, 7, 8, 7]);
					const content2 = new Uint8Array([5, 6, 5, 6, 5, 6]);

					const currentBlock = await userSigner.provider!.getBlockNumber();

					const {
						tx: tx1,
						receipt: receipt1,
						logs: logs1,
					} = await userMailerV8Wrapper.content.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						0,
						content1,
						BigNumber.from(0),
					);

					const {
						tx: tx2,
						receipt: receipt2,
						logs: logs2,
					} = await userMailerV8Wrapper.content.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						1,
						content2,
						BigNumber.from(0),
					);

					expect(receipt1, 'Receipt must be present').to.not.be.undefined;

					const messageContent1 = logs1.find(log => log.name === 'MessageContent');

					expect(messageContent1, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent1!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent1!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent1!.args.parts, 'Parts must be 2').to.equal(2);
					expect(messageContent1!.args.partIdx, 'partIdx must be 0').to.equal(0);

					expect(receipt2, 'Receipt must be present').to.not.be.undefined;

					const messageContent2 = logs2.find(log => log.name === 'MessageContent');

					expect(messageContent2, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent2!.args.content, 'Content must be 0x050605060506').to.equal('0x050605060506');
					expect(messageContent2!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent2!.args.parts, 'Parts must be 2').to.equal(2);
					expect(messageContent2!.args.partIdx, 'partIdx must be 1').to.equal(1);

					const {
						tx: tx3,
						receipt: receipt3,
						logs: logs3,
					} = await userMailerV8Wrapper.broadcast.sendBroadcastHeader(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						'0000000000000000000000000000000000000000000000000000000000000002' as Uint256,
						uniqueId,
						currentBlock,
						2,
						100,
						BigNumber.from(0),
					);

					expect(receipt3, 'Receipt must be present').to.not.be.undefined;

					const broadcastPush1 = logs3.find(log => log.name === 'BroadcastPush');

					expect(broadcastPush1, 'BroadcastPush event must be present').to.not.be.undefined;
					expect(broadcastPush1!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						broadcastPush1!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					const contentId1 = decodeContentId(broadcastPush1!.args.contentId.toHexString());
					expect(contentId1.version, 'Version must be 8').to.equal(8);
					expect(contentId1.partsCount, 'Parts count must be 2').to.equal(2);
					expect(contentId1.blockCountLock, 'Block count lock must be 100').to.equal(100);
				});
			});
			describe('Reading history', async () => {
				const generateSmallMailEvents = async (
					d: IEVMMailerContractLink,
					s: Signer,
					recipientHex: Uint256,
					count: number,
				) => {
					const events: {
						args: [
							IEVMMailerContractLink,
							Signer,
							string,
							Uint256,
							number,
							Uint256,
							Uint8Array,
							Uint8Array,
							BigNumber,
						];
						uniqueId: number;
						recipientHex: Uint256;
						key: Uint8Array;
						content: Uint8Array;
					}[] = [];
					const a = await s.getAddress();
					for (let i = 0; i < count; i++) {
						const uniqueId = 123 + i;
						const key = new Uint8Array([2, 7, 2, 7, 2, 7, i]);
						const content = new Uint8Array([1, 3, 1, 3, 1, 3, i]);
						events.push({
							args: [
								d,
								s,
								a,
								YLIDE_MAIN_FEED_ID,
								uniqueId,
								recipientHex,
								key,
								content,
								BigNumber.from(0),
							],
							uniqueId,
							recipientHex,
							key,
							content,
						});
					}
					return events;
				};

				const generateSmallBroadcastEvents = async (d: IEVMMailerContractLink, s: Signer, count: number) => {
					const events: {
						args: [IEVMMailerContractLink, Signer, string, Uint256, number, Uint8Array, BigNumber];
						uniqueId: number;
						content: Uint8Array;
					}[] = [];
					const a = await s.getAddress();
					for (let i = 0; i < count; i++) {
						const uniqueId = 123 + i;
						const content = new Uint8Array([1, 3, 1, 3, 1, 3, i]);
						events.push({
							args: [
								d,
								s,
								a,
								'0000000000000000000000000000000000000000000000000000000000000002' as Uint256,
								uniqueId,
								content,
								BigNumber.from(0),
							],
							uniqueId,
							content,
						});
					}
					return events;
				};

				const getMailHFactory =
					(r: Uint256, m: EthereumMailerV8Wrapper) =>
					(
						fromMessage: IEVMMessage | null,
						includeFromMessage: boolean,
						toMessage: IEVMMessage | null,
						includeToMessage: boolean,
						limit: number,
					) =>
						m.mailing.retrieveMailHistoryDesc(
							mailerDesc,
							YLIDE_MAIN_FEED_ID,
							r,
							fromMessage,
							includeFromMessage,
							toMessage,
							includeToMessage,
							limit,
						);

				const getBroadcastHFactory =
					(m: EthereumMailerV8Wrapper) =>
					(
						fromMessage: IEVMMessage | null,
						includeFromMessage: boolean,
						toMessage: IEVMMessage | null,
						includeToMessage: boolean,
						limit: number,
					) =>
						m.broadcast.retrieveBroadcastHistoryDesc(
							mailerDesc,
							'0000000000000000000000000000000000000000000000000000000000000002' as Uint256,
							fromMessage,
							includeFromMessage,
							toMessage,
							includeToMessage,
							limit,
						);

				const cmprMails = (
					msg: string,
					a: { uniqueId: number; recipientHex: Uint256; key: Uint8Array; content: Uint8Array }[],
					b: IEVMMessage[],
				) => {
					expect(a.length, `${msg}, Arrays must have same length`).to.equal(b.length);
					for (let i = 0; i < a.length; i++) {
						expect(a[i].recipientHex, `${msg}, recipientHex must be equal`).to.equal(b[i].recipientAddress);
						expect(a[i].key, `${msg}, key ${i} must be equal`).to.deep.equal(b[i].key);
						// expect(a[i].content, 'content must be equal').to.deep.equal(b[i].content);
					}
				};

				const cmprBroadcasts = (
					msg: string,
					a: { uniqueId: number; content: Uint8Array }[],
					b: IEVMMessage[],
				) => {
					expect(a.length, `${msg}, Arrays must have same length`).to.equal(b.length);
					for (let i = 0; i < a.length; i++) {
						// expect(a[i].recipientHex, `${msg}, recipientHex must be equal`).to.equal(b[i].recipientAddress);
						// expect(a[i].key, `${msg}, key must be equal`).to.deep.equal(b[i].key);
						// expect(a[i].content, 'content must be equal').to.deep.equal(b[i].content);
					}
				};

				const publishMails = async (
					m: EthereumMailerV8Wrapper,
					skipBefore: number,
					skipBetween: number,
					skipAfter: number,
					events: {
						args: [
							IEVMMailerContractLink,
							Signer,
							string,
							Uint256,
							number,
							Uint256,
							Uint8Array,
							Uint8Array,
							BigNumber,
						];
						uniqueId: number;
						recipientHex: Uint256;
						key: Uint8Array;
						content: Uint8Array;
					}[],
				) => {
					if (skipBefore) {
						await mine(skipBefore);
					}
					for (const event of events) {
						await m.mailing.sendSmallMail(...event.args);
						if (skipBetween) {
							await mine(skipBetween);
						}
					}
					if (skipAfter) {
						await mine(skipAfter);
					}
				};

				const publishBroadcasts = async (
					m: EthereumMailerV8Wrapper,
					skipBefore: number,
					skipBetween: number,
					skipAfter: number,
					events: {
						args: [IEVMMailerContractLink, Signer, string, Uint256, number, Uint8Array, BigNumber];
						uniqueId: number;
						content: Uint8Array;
					}[],
				) => {
					if (skipBefore) {
						await mine(skipBefore);
					}
					for (const event of events) {
						await m.broadcast.sendBroadcast(...event.args);
						if (skipBetween) {
							await mine(skipBetween);
						}
					}
					if (skipAfter) {
						await mine(skipAfter);
					}
				};

				describe('Send & retrieve mails history', async () => {
					let userMailerV8Wrapper: any;
					let recipientHex: any;
					let getH: ReturnType<typeof getMailHFactory>;
					let events: Awaited<ReturnType<typeof generateSmallMailEvents>>;
					let rEvents: any;

					this.beforeEach(async () => {
						userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);
						recipientHex = '0000000000000000000000000000000000000000000000000000000000000123' as Uint256;
						getH = getMailHFactory(recipientHex, userMailerV8Wrapper);
						events = await generateSmallMailEvents(mailerDesc, userSigner, recipientHex, 50);
						rEvents = events.slice().reverse();
					});

					it('Send & retrieve messages history 20', async function () {
						this.timeout('2000s');
						await publishMails(userMailerV8Wrapper, 129, 0, 300, events);

						const slice1 = rEvents.slice(0, 20); // last 20 events
						const history1 = await getH(null, false, null, false, 20);

						cmprMails('history1', slice1, history1);
					});

					it('Send & retrieve messages history 20, long period', async function () {
						this.timeout('2000s');
						await publishMails(userMailerV8Wrapper, 129, 101, 300, events);

						const slice1 = rEvents.slice(0, 20); // last 20 events
						const history1 = await getH(null, false, null, false, 20);

						cmprMails('history1', slice1, history1);
					});

					it('Send & retrieve messages history 15', async function () {
						this.timeout('2000s');
						await publishMails(userMailerV8Wrapper, 129, 0, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprMails('history2', slice2, history2);
					});

					it('Send & retrieve messages history 15, long period', async function () {
						this.timeout('2000s');
						await publishMails(userMailerV8Wrapper, 129, 101, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprMails('history2', slice2, history2);
					});

					it('Send & retrieve messages history 5 fromMessage', async function () {
						this.timeout('2000s');
						await publishMails(userMailerV8Wrapper, 129, 0, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprMails('history2', slice2, history2);

						const slice3 = rEvents.slice(15, 20);
						const history3 = await getH(history2.at(-1)!, false, null, false, 5);

						cmprMails('history3', slice3, history3);
					});

					it('Send & retrieve messages history 5 fromMessage, long period', async function () {
						this.timeout('2000s');
						await publishMails(userMailerV8Wrapper, 129, 101, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprMails('history2', slice2, history2);

						const slice3 = rEvents.slice(15, 20);
						const history3 = await getH(history2.at(-1)!, false, null, false, 5);

						cmprMails('history3', slice3, history3);
					});

					it('Send & retrieve messages history 5 fromMessage includes', async () => {
						this.timeout('2000s');
						await publishMails(userMailerV8Wrapper, 129, 0, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprMails('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);

						cmprMails('history4', slice4, history4);
					});

					it('Send & retrieve messages history 5 fromMessage includes, long period', async () => {
						this.timeout('2000s');
						await publishMails(userMailerV8Wrapper, 129, 101, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprMails('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);

						cmprMails('history4', slice4, history4);
					});

					it('Send & retrieve messages history 5 fromMessage includes, toMessage includes', async () => {
						this.timeout('2000s');
						await publishMails(userMailerV8Wrapper, 129, 0, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprMails('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);

						cmprMails('history4', slice4, history4);

						const slice5 = rEvents.slice(14, 17);
						const history5 = await getH(history2.at(-1)!, true, history4[2], true, 5);

						cmprMails('history5', slice5, history5);
					});

					it('Send & retrieve messages history 5 fromMessage includes, toMessage includes, long period', async () => {
						this.timeout('2000s');
						await publishMails(userMailerV8Wrapper, 129, 101, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);
						cmprMails('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);
						cmprMails('history4', slice4, history4);

						const slice5 = rEvents.slice(14, 17);
						const history5 = await getH(history2.at(-1)!, true, history4[2], true, 5);

						cmprMails('history5', slice5, history5);
					});
				});

				describe('Send & retrieve broadcasts history', async () => {
					let userMailerV8Wrapper: any;
					let sender: any;
					let getH: ReturnType<typeof getBroadcastHFactory>;
					let events: Awaited<ReturnType<typeof generateSmallBroadcastEvents>>;
					let rEvents: any;

					this.beforeEach(async () => {
						userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);
						sender = await userSigner.getAddress();
						getH = getBroadcastHFactory(userMailerV8Wrapper);
						events = await generateSmallBroadcastEvents(mailerDesc, userSigner, 50);
						rEvents = events.slice().reverse();
					});

					it('Send & retrieve messages history 20', async function () {
						this.timeout('2000s');
						await publishBroadcasts(userMailerV8Wrapper, 129, 0, 300, events);

						const slice1 = rEvents.slice(0, 20); // last 20 events
						const history1 = await getH(null, false, null, false, 20);

						cmprBroadcasts('history1', slice1, history1);
					});

					it('Send & retrieve messages history 20, long period', async function () {
						this.timeout('2000s');
						await publishBroadcasts(userMailerV8Wrapper, 129, 101, 300, events);

						const slice1 = rEvents.slice(0, 20); // last 20 events
						const history1 = await getH(null, false, null, false, 20);

						cmprBroadcasts('history1', slice1, history1);
					});

					it('Send & retrieve messages history 15', async function () {
						this.timeout('2000s');
						await publishBroadcasts(userMailerV8Wrapper, 129, 0, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprBroadcasts('history2', slice2, history2);
					});

					it('Send & retrieve messages history 15, long period', async function () {
						this.timeout('2000s');
						await publishBroadcasts(userMailerV8Wrapper, 129, 101, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprBroadcasts('history2', slice2, history2);
					});

					it('Send & retrieve messages history 5 fromMessage', async function () {
						this.timeout('2000s');
						await publishBroadcasts(userMailerV8Wrapper, 129, 0, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprBroadcasts('history2', slice2, history2);

						const slice3 = rEvents.slice(15, 20);
						const history3 = await getH(history2.at(-1)!, false, null, false, 5);

						cmprBroadcasts('history3', slice3, history3);
					});

					it('Send & retrieve messages history 5 fromMessage, long period', async function () {
						this.timeout('2000s');
						await publishBroadcasts(userMailerV8Wrapper, 129, 101, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprBroadcasts('history2', slice2, history2);

						const slice3 = rEvents.slice(15, 20);
						const history3 = await getH(history2.at(-1)!, false, null, false, 5);

						cmprBroadcasts('history3', slice3, history3);
					});

					it('Send & retrieve messages history 5 fromMessage includes', async () => {
						this.timeout('2000s');
						await publishBroadcasts(userMailerV8Wrapper, 129, 0, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprBroadcasts('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);

						cmprBroadcasts('history4', slice4, history4);
					});

					it('Send & retrieve messages history 5 fromMessage includes, long period', async () => {
						this.timeout('2000s');
						await publishBroadcasts(userMailerV8Wrapper, 129, 101, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprBroadcasts('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);

						cmprBroadcasts('history4', slice4, history4);
					});

					it('Send & retrieve messages history 5 fromMessage includes, toMessage includes', async () => {
						this.timeout('2000s');
						await publishBroadcasts(userMailerV8Wrapper, 129, 0, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprBroadcasts('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);

						cmprBroadcasts('history4', slice4, history4);

						const slice5 = rEvents.slice(14, 17);
						const history5 = await getH(history2.at(-1)!, true, history4[2], true, 5);

						cmprBroadcasts('history5', slice5, history5);
					});

					it('Send & retrieve messages history 5 fromMessage includes, toMessage includes, long period', async () => {
						this.timeout('2000s');
						await publishBroadcasts(userMailerV8Wrapper, 129, 101, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);
						cmprBroadcasts('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);
						cmprBroadcasts('history4', slice4, history4);

						const slice5 = rEvents.slice(14, 17);
						const history5 = await getH(history2.at(-1)!, true, history4[2], true, 5);

						cmprBroadcasts('history5', slice5, history5);
					});
				});
			});
			describe('Reading content', async () => {
				it('Send small mail', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const uniqueId = 123;
					const recipientHex = '1234567890123456789012345678901234567890123456789012345678901234' as Uint256;
					const key = new Uint8Array([1, 2, 3, 4, 5, 6]);
					const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

					const { tx, receipt, logs } = await userMailerV8Wrapper.mailing.sendSmallMail(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						YLIDE_MAIN_FEED_ID,
						uniqueId,
						recipientHex,
						key,
						content,
						BigNumber.from(0),
					);

					expect(receipt, 'Receipt must be present').to.not.be.undefined;

					const mailPush = logs.find(log => log.name === 'MailPush')!;
					const messageContent = logs.find(log => log.name === 'MessageContent');

					// userMailerV8Wrapper.

					const contentId = decodeContentId(mailPush.args.contentId.toHexString());
					expect(contentId.version, 'Version must be 8').to.equal(8);
					expect(contentId.partsCount, 'Parts count must be 1').to.equal(1);
					expect(contentId.blockCountLock, 'Block count lock must be 0').to.equal(0);

					expect(messageContent, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent!.args.parts, 'Parts must be 1').to.equal(1);
					expect(messageContent!.args.partIdx, 'partIdx must be 0').to.equal(0);
				});
				it('Send bulk mail', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const uniqueId = 123;
					const recipient1Hex = '1234567890123456789012345678901234567890123456789012345678901234' as Uint256;
					const recipient2Hex = '9842759812837345701098213740237489321758326574629847290175438783' as Uint256;
					const key1 = new Uint8Array([1, 2, 3, 4, 5, 6]);
					const key2 = new Uint8Array([6, 5, 4, 3, 2, 1]);
					const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

					const { tx, receipt, logs } = await userMailerV8Wrapper.mailing.sendBulkMail(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						YLIDE_MAIN_FEED_ID,
						uniqueId,
						[recipient1Hex, recipient2Hex],
						[key1, key2],
						content,
						BigNumber.from(0),
					);

					expect(receipt, 'Receipt must be present').to.not.be.undefined;

					const mailPush1 = logs.find(log => log.name === 'MailPush');
					const mailPush2 = logs.find((log, _idx) => log.name === 'MailPush' && log !== mailPush1);
					const messageContent = logs.find(log => log.name === 'MessageContent');

					expect(mailPush1, 'MailPush event must be present').to.not.be.undefined;
					expect(mailPush1!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						mailPush1!.args.recipient.toHexString(),
						'Recipient must be 0x1234567890123456789012345678901234567890123456789012345678901234',
					).to.equal('0x1234567890123456789012345678901234567890123456789012345678901234');
					expect(mailPush1!.args.key, 'Key must be 0x010203040506').to.equal('0x010203040506');
					expect(
						mailPush1!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					expect(mailPush2, 'MailPush event must be present').to.not.be.undefined;
					expect(mailPush2!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						mailPush2!.args.recipient.toHexString(),
						'Recipient must be 0x9842759812837345701098213740237489321758326574629847290175438783',
					).to.equal('0x9842759812837345701098213740237489321758326574629847290175438783');
					expect(mailPush2!.args.key, 'Key must be 0x060504030201').to.equal('0x060504030201');
					expect(
						mailPush2!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					const contentId1 = decodeContentId(mailPush1!.args.contentId.toHexString());
					expect(contentId1.version, 'Version must be 8').to.equal(8);
					expect(contentId1.partsCount, 'Parts count must be 1').to.equal(1);
					expect(contentId1.blockCountLock, 'Block count lock must be 0').to.equal(0);

					const contentId2 = decodeContentId(mailPush2!.args.contentId.toHexString());
					expect(contentId2.version, 'Version must be 8').to.equal(8);
					expect(contentId2.partsCount, 'Parts count must be 1').to.equal(1);
					expect(contentId2.blockCountLock, 'Block count lock must be 0').to.equal(0);

					expect(messageContent, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent!.args.parts, 'Parts must be 1').to.equal(1);
					expect(messageContent!.args.partIdx, 'partIdx must be 0').to.equal(0);
				});
				it('Send multipart mail', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const uniqueId = 123;
					const recipient1Hex = '1234567890123456789012345678901234567890123456789012345678901234' as Uint256;
					const recipient2Hex = '9842759812837345701098213740237489321758326574629847290175438783' as Uint256;
					const key1 = new Uint8Array([1, 2, 3, 4, 5, 6]);
					const key2 = new Uint8Array([6, 5, 4, 3, 2, 1]);
					const content1 = new Uint8Array([8, 7, 8, 7, 8, 7]);
					const content2 = new Uint8Array([5, 6, 5, 6, 5, 6]);

					const currentBlock = await userSigner.provider!.getBlockNumber();

					const {
						tx: tx1,
						receipt: receipt1,
						logs: logs1,
					} = await userMailerV8Wrapper.content.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						0,
						content1,
						BigNumber.from(0),
					);

					const {
						tx: tx2,
						receipt: receipt2,
						logs: logs2,
					} = await userMailerV8Wrapper.content.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						1,
						content2,
						BigNumber.from(0),
					);

					expect(receipt1, 'Receipt must be present').to.not.be.undefined;

					const messageContent1 = logs1.find(log => log.name === 'MessageContent');

					expect(messageContent1, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent1!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent1!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent1!.args.parts, 'Parts must be 2').to.equal(2);
					expect(messageContent1!.args.partIdx, 'partIdx must be 0').to.equal(0);

					expect(receipt2, 'Receipt must be present').to.not.be.undefined;

					const messageContent2 = logs2.find(log => log.name === 'MessageContent');

					expect(messageContent2, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent2!.args.content, 'Content must be 0x050605060506').to.equal('0x050605060506');
					expect(messageContent2!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent2!.args.parts, 'Parts must be 2').to.equal(2);
					expect(messageContent2!.args.partIdx, 'partIdx must be 1').to.equal(1);

					const {
						tx: tx3,
						receipt: receipt3,
						logs: logs3,
					} = await userMailerV8Wrapper.mailing.addMailRecipients(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						YLIDE_MAIN_FEED_ID,
						uniqueId,
						currentBlock,
						2,
						100,
						[recipient1Hex, recipient2Hex],
						[key1, key2],
						BigNumber.from(0),
					);

					expect(receipt3, 'Receipt must be present').to.not.be.undefined;

					const mailPush1 = logs3.find(log => log.name === 'MailPush');
					const mailPush2 = logs3.find(log => log.name === 'MailPush' && log !== mailPush1);

					expect(mailPush1, 'MailPush event must be present').to.not.be.undefined;
					expect(mailPush1!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						mailPush1!.args.recipient.toHexString(),
						'Recipient must be 0x1234567890123456789012345678901234567890123456789012345678901234',
					).to.equal('0x1234567890123456789012345678901234567890123456789012345678901234');
					expect(mailPush1!.args.key, 'Key must be 0x010203040506').to.equal('0x010203040506');
					expect(
						mailPush1!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					expect(mailPush2, 'MailPush event must be present').to.not.be.undefined;
					expect(mailPush2!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						mailPush2!.args.recipient.toHexString(),
						'Recipient must be 0x9842759812837345701098213740237489321758326574629847290175438783',
					).to.equal('0x9842759812837345701098213740237489321758326574629847290175438783');
					expect(mailPush2!.args.key, 'Key must be 0x060504030201').to.equal('0x060504030201');
					expect(
						mailPush2!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					const contentId1 = decodeContentId(mailPush1!.args.contentId.toHexString());
					expect(contentId1.version, 'Version must be 8').to.equal(8);
					expect(contentId1.partsCount, 'Parts count must be 2').to.equal(2);
					expect(contentId1.blockCountLock, 'Block count lock must be 100').to.equal(100);

					const contentId2 = decodeContentId(mailPush2!.args.contentId.toHexString());
					expect(contentId2.version, 'Version must be 8').to.equal(8);
					expect(contentId2.partsCount, 'Parts count must be 2').to.equal(2);
					expect(contentId2.blockCountLock, 'Block count lock must be 100').to.equal(100);
				});
				it('Send broadcast', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const uniqueId = 123;
					const content = new Uint8Array([8, 7, 8, 7, 8, 7]);

					const { tx, receipt, logs } = await userMailerV8Wrapper.broadcast.sendBroadcast(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						'0000000000000000000000000000000000000000000000000000000000000002' as Uint256,
						uniqueId,
						content,
						BigNumber.from(0),
					);

					expect(receipt, 'Receipt must be present').to.not.be.undefined;

					const broadcastPush = logs.find(log => log.name === 'BroadcastPush');
					const messageContent = logs.find(log => log.name === 'MessageContent');

					expect(broadcastPush, 'BroadcastPush event must be present').to.not.be.undefined;
					expect(broadcastPush!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						broadcastPush!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					const contentId = decodeContentId(broadcastPush!.args.contentId.toHexString());
					expect(contentId.version, 'Version must be 8').to.equal(8);
					expect(contentId.partsCount, 'Parts count must be 1').to.equal(1);
					expect(contentId.blockCountLock, 'Block count lock must be 0').to.equal(0);

					expect(messageContent, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent!.args.parts, 'Parts must be 1').to.equal(1);
					expect(messageContent!.args.partIdx, 'partIdx must be 0').to.equal(0);
				});
				it('Send multipart broadcast', async function () {
					const userMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForUser);

					const uniqueId = 123;
					const content1 = new Uint8Array([8, 7, 8, 7, 8, 7]);
					const content2 = new Uint8Array([5, 6, 5, 6, 5, 6]);

					const currentBlock = await userSigner.provider!.getBlockNumber();

					const {
						tx: tx1,
						receipt: receipt1,
						logs: logs1,
					} = await userMailerV8Wrapper.content.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						0,
						content1,
						BigNumber.from(0),
					);

					const {
						tx: tx2,
						receipt: receipt2,
						logs: logs2,
					} = await userMailerV8Wrapper.content.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						1,
						content2,
						BigNumber.from(0),
					);

					expect(receipt1, 'Receipt must be present').to.not.be.undefined;

					const messageContent1 = logs1.find(log => log.name === 'MessageContent');

					expect(messageContent1, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent1!.args.content, 'Content must be 0x080708070807').to.equal('0x080708070807');
					expect(messageContent1!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent1!.args.parts, 'Parts must be 2').to.equal(2);
					expect(messageContent1!.args.partIdx, 'partIdx must be 0').to.equal(0);

					expect(receipt2, 'Receipt must be present').to.not.be.undefined;

					const messageContent2 = logs2.find(log => log.name === 'MessageContent');

					expect(messageContent2, 'MessageContent event must be present').to.not.be.undefined;
					expect(messageContent2!.args.content, 'Content must be 0x050605060506').to.equal('0x050605060506');
					expect(messageContent2!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(messageContent2!.args.parts, 'Parts must be 2').to.equal(2);
					expect(messageContent2!.args.partIdx, 'partIdx must be 1').to.equal(1);

					const {
						tx: tx3,
						receipt: receipt3,
						logs: logs3,
					} = await userMailerV8Wrapper.broadcast.sendBroadcastHeader(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						'0000000000000000000000000000000000000000000000000000000000000002' as Uint256,
						uniqueId,
						currentBlock,
						2,
						100,
						BigNumber.from(0),
					);

					expect(receipt3, 'Receipt must be present').to.not.be.undefined;

					const broadcastPush1 = logs3.find(log => log.name === 'BroadcastPush');

					expect(broadcastPush1, 'BroadcastPush event must be present').to.not.be.undefined;
					expect(broadcastPush1!.args.sender, 'Sender must be user address').to.equal(
						await userSigner.getAddress(),
					);
					expect(
						broadcastPush1!.args.previousFeedEventsIndex.toNumber(),
						'previousFeedEventsIndex must be 0',
					).to.equal(0);

					const contentId1 = decodeContentId(broadcastPush1!.args.contentId.toHexString());
					expect(contentId1.version, 'Version must be 8').to.equal(8);
					expect(contentId1.partsCount, 'Parts count must be 2').to.equal(2);
					expect(contentId1.blockCountLock, 'Block count lock must be 100').to.equal(100);
				});
			});
		});
	});
});
