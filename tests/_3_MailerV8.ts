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
import { EthereumMailerV8Wrapper } from '../src/contract-wrappers/EthereumMailerV8Wrapper';
import { EVMMailerContractType, IEVMMailerContractLink, IEVMMessage } from '../src';
import { Uint256, YLIDE_MAIN_FEED_ID } from '@ylide/sdk';
import { decodeContentId } from '../src/misc/contentId';

describe('YlideMailerV8', function () {
	it('Should deploy', async function () {
		const signer = await hre.ethers.getSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
		const mailerFactory = new YlideMailerV8__factory(signer);
		await mailerFactory.deploy();
	});

	describe('EthereumBlockchainReader', async function () {
		let ownerSigner: Signer;
		let benificiarySigner: Signer;
		let userSigner: Signer;

		let readerForOwner: EthereumBlockchainReader;
		let readerForBenificiary: EthereumBlockchainReader;
		let readerForUser: EthereumBlockchainReader;

		before(async function () {
			ownerSigner = await hre.ethers.getSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
			benificiarySigner = await hre.ethers.getSigner('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
			userSigner = await hre.ethers.getSigner('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');

			readerForOwner = EthereumBlockchainReader.createEthereumBlockchainReader([
				{
					rpcUrlOrProvider: ownerSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForBenificiary = EthereumBlockchainReader.createEthereumBlockchainReader([
				{
					rpcUrlOrProvider: benificiarySigner.provider!,
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

					const ownerBeforeTxToSet = await ownerMailerV8Wrapper.getOwner(mailerDesc);

					expect(ownerBeforeTxToSet, 'Owner before tx to set must be zero-address').to.equal(
						await ownerSigner.getAddress(),
					);

					const txToSet = await ownerMailerV8Wrapper.setOwner(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						await userSigner.getAddress(),
					);

					const ownerAfterTxToSet = await ownerMailerV8Wrapper.getOwner(mailerDesc);

					expect(ownerAfterTxToSet, 'Owner after tx to set must be user address').to.equal(
						await userSigner.getAddress(),
					);
				});
				it('Set & get benificiary', async function () {
					const ownerMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForOwner);

					const benificiaryBeforeTxToSet = await ownerMailerV8Wrapper.getBenificiary(mailerDesc);

					expect(benificiaryBeforeTxToSet, 'Benificiary before tx to set must be owner address').to.equal(
						await ownerSigner.getAddress(),
					);

					const txToSet = await ownerMailerV8Wrapper.setBenificiary(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						await userSigner.getAddress(),
					);

					const benificiaryAfterTxToSet = await ownerMailerV8Wrapper.getBenificiary(mailerDesc);

					expect(benificiaryAfterTxToSet, 'Benificiary after tx to set must be user address').to.equal(
						await userSigner.getAddress(),
					);
				});
				it('Set & get fees', async function () {
					const ownerMailerV8Wrapper = new EthereumMailerV8Wrapper(readerForOwner);

					const feesBeforeTxToSet = await ownerMailerV8Wrapper.getFees(mailerDesc);
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
					const txToSet = await ownerMailerV8Wrapper.setFees(
						mailerDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						{
							contentPartFee: BigNumber.from(1),
							recipientFee: BigNumber.from(2),
							broadcastFee: BigNumber.from(3),
						},
					);
					const feesAfterTxToSet = await ownerMailerV8Wrapper.getFees(mailerDesc);
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

					const { tx, receipt, logs } = await userMailerV8Wrapper.sendSmallMail(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						YLIDE_MAIN_FEED_ID,
						uniqueId,
						recipientHex,
						key,
						content,
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

					const { tx, receipt, logs } = await userMailerV8Wrapper.sendBulkMail(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						YLIDE_MAIN_FEED_ID,
						uniqueId,
						[recipient1Hex, recipient2Hex],
						[key1, key2],
						content,
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
					} = await userMailerV8Wrapper.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						0,
						content1,
					);

					const {
						tx: tx2,
						receipt: receipt2,
						logs: logs2,
					} = await userMailerV8Wrapper.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						1,
						content2,
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
					} = await userMailerV8Wrapper.addMailRecipients(
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

					const { tx, receipt, logs } = await userMailerV8Wrapper.sendBroadcast(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						'0000000000000000000000000000000000000000000000000000000000000002' as Uint256,
						uniqueId,
						content,
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
					} = await userMailerV8Wrapper.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						0,
						content1,
					);

					const {
						tx: tx2,
						receipt: receipt2,
						logs: logs2,
					} = await userMailerV8Wrapper.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						1,
						content2,
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
					} = await userMailerV8Wrapper.sendBroadcastHeader(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						'0000000000000000000000000000000000000000000000000000000000000002' as Uint256,
						uniqueId,
						currentBlock,
						2,
						100,
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
							args: [d, s, a, YLIDE_MAIN_FEED_ID, uniqueId, recipientHex, key, content],
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
						args: [IEVMMailerContractLink, Signer, string, Uint256, number, Uint8Array];
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
						m.retrieveMailHistoryDesc(
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
						m.retrieveBroadcastHistoryDesc(
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
						await m.sendSmallMail(...event.args);
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
						args: [IEVMMailerContractLink, Signer, string, Uint256, number, Uint8Array];
						uniqueId: number;
						content: Uint8Array;
					}[],
				) => {
					if (skipBefore) {
						await mine(skipBefore);
					}
					for (const event of events) {
						await m.sendBroadcast(...event.args);
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
						await publishMails(userMailerV8Wrapper, 129, 0, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprMails('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);

						cmprMails('history4', slice4, history4);
					});

					it('Send & retrieve messages history 5 fromMessage includes, long period', async () => {
						await publishMails(userMailerV8Wrapper, 129, 101, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprMails('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);

						cmprMails('history4', slice4, history4);
					});

					it('Send & retrieve messages history 5 fromMessage includes, toMessage includes', async () => {
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
						await publishBroadcasts(userMailerV8Wrapper, 129, 0, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprBroadcasts('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);

						cmprBroadcasts('history4', slice4, history4);
					});

					it('Send & retrieve messages history 5 fromMessage includes, long period', async () => {
						await publishBroadcasts(userMailerV8Wrapper, 129, 101, 300, events);

						const slice2 = rEvents.slice(0, 15); // last 15 events
						const history2 = await getH(null, false, null, false, 15);

						cmprBroadcasts('history2', slice2, history2);

						const slice4 = rEvents.slice(14, 19);
						const history4 = await getH(history2.at(-1)!, true, null, false, 5);

						cmprBroadcasts('history4', slice4, history4);
					});

					it('Send & retrieve messages history 5 fromMessage includes, toMessage includes', async () => {
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

					const { tx, receipt, logs } = await userMailerV8Wrapper.sendSmallMail(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						YLIDE_MAIN_FEED_ID,
						uniqueId,
						recipientHex,
						key,
						content,
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

					const { tx, receipt, logs } = await userMailerV8Wrapper.sendBulkMail(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						YLIDE_MAIN_FEED_ID,
						uniqueId,
						[recipient1Hex, recipient2Hex],
						[key1, key2],
						content,
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
					} = await userMailerV8Wrapper.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						0,
						content1,
					);

					const {
						tx: tx2,
						receipt: receipt2,
						logs: logs2,
					} = await userMailerV8Wrapper.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						1,
						content2,
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
					} = await userMailerV8Wrapper.addMailRecipients(
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

					const { tx, receipt, logs } = await userMailerV8Wrapper.sendBroadcast(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						'0000000000000000000000000000000000000000000000000000000000000002' as Uint256,
						uniqueId,
						content,
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
					} = await userMailerV8Wrapper.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						0,
						content1,
					);

					const {
						tx: tx2,
						receipt: receipt2,
						logs: logs2,
					} = await userMailerV8Wrapper.sendMessageContentPart(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						uniqueId,
						currentBlock,
						100,
						2,
						1,
						content2,
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
					} = await userMailerV8Wrapper.sendBroadcastHeader(
						mailerDesc,
						userSigner,
						await userSigner.getAddress(),
						'0000000000000000000000000000000000000000000000000000000000000002' as Uint256,
						uniqueId,
						currentBlock,
						2,
						100,
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
