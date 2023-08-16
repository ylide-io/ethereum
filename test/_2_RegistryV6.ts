/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable prefer-arrow/prefer-arrow-functions */
import type { Signer } from 'ethers';
import { describe, it, before } from 'mocha';
import type { YlideRegistryV6 } from '@ylide/ethereum-contracts';
import { YlideRegistryV6__factory } from '@ylide/ethereum-contracts';
import hre from 'hardhat';
import { SmartBuffer } from '@ylide/smart-buffer';
import nacl from 'tweetnacl';
import { EVMBlockchainReader } from '../src/controllers/helpers/EVMBlockchainReader';
import { EVMRegistryV6Wrapper } from '../src/contract-wrappers/EVMRegistryV6Wrapper';
import { PublicKey, PublicKeyType, YlideKeyVersion } from '@ylide/sdk';
import type { IEVMRegistryContractLink } from '../src';
import { EVMRegistryContractType } from '../src';
import { expect } from 'chai';
import { mine, time } from '@nomicfoundation/hardhat-network-helpers';
import { constructFaucetMsg } from '../src/misc/constructFaucetMsg';

describe('YlideRegistryV6', function () {
	it('Should deploy', async function () {
		const signer = await hre.ethers.getSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
		const registryFactory = new YlideRegistryV6__factory(signer);
		await registryFactory.deploy();
	});

	describe('EVMBlockchainReader', async function () {
		let ownerSigner: Signer;
		let userSigner: Signer;
		let historyUserSigner: Signer;
		let bonucerSigner: Signer;
		let newUserSigner: Signer;
		let referrerSigner: Signer;

		let readerForOwner: EVMBlockchainReader;
		let readerForUser: EVMBlockchainReader;
		let readerForHistoryUser: EVMBlockchainReader;
		let readerForBonucer: EVMBlockchainReader;
		let readerForNewUser: EVMBlockchainReader;
		let readerForReferrer: EVMBlockchainReader;

		before(async function () {
			await mine(202);

			ownerSigner = await hre.ethers.getSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
			userSigner = await hre.ethers.getSigner('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
			historyUserSigner = await hre.ethers.getSigner('0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc');
			bonucerSigner = await hre.ethers.getSigner('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
			newUserSigner = new hre.ethers.Wallet(nacl.randomBytes(32), hre.ethers.provider);
			referrerSigner = new hre.ethers.Wallet(nacl.randomBytes(32), hre.ethers.provider);

			readerForOwner = EVMBlockchainReader.createEVMBlockchainReader('evm', 'ETHEREUM', [
				{
					chainId: 31337,
					rpcUrlOrProvider: ownerSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForUser = EVMBlockchainReader.createEVMBlockchainReader('evm', 'ETHEREUM', [
				{
					chainId: 31337,
					rpcUrlOrProvider: userSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForHistoryUser = EVMBlockchainReader.createEVMBlockchainReader('evm', 'ETHEREUM', [
				{
					chainId: 31337,
					rpcUrlOrProvider: historyUserSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForBonucer = EVMBlockchainReader.createEVMBlockchainReader('evm', 'ETHEREUM', [
				{
					chainId: 31337,
					rpcUrlOrProvider: bonucerSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForNewUser = EVMBlockchainReader.createEVMBlockchainReader('evm', 'ETHEREUM', [
				{
					chainId: 31337,
					rpcUrlOrProvider: newUserSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForReferrer = EVMBlockchainReader.createEVMBlockchainReader('evm', 'ETHEREUM', [
				{
					chainId: 31337,
					rpcUrlOrProvider: referrerSigner.provider!,
					blockLimit: 100,
				},
			]);
		});
		describe('EVMRegistryV6Wrapper', async function () {
			let registryFactory: YlideRegistryV6__factory;
			let registry: YlideRegistryV6;
			let registryDesc: IEVMRegistryContractLink;

			beforeEach(async function () {
				registryFactory = new YlideRegistryV6__factory(ownerSigner);
				registry = await registryFactory.deploy();
				registryDesc = {
					id: 1,
					type: EVMRegistryContractType.EVMRegistryV6,
					verified: false,
					address: registry.address,
					creationBlock: 1,
				};
			});
			describe('Misceallenous', function () {
				it('Set & get owner', async function () {
					const ownerRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForOwner);

					const ownerBeforeTxToSet = await ownerRegistryV6Wrapper.getOwner(registryDesc);

					expect(ownerBeforeTxToSet, 'Beneficiary before tx to set must be zero-address').to.equal(
						await ownerSigner.getAddress(),
					);

					const txToSet = await ownerRegistryV6Wrapper.setOwner(
						registryDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						await userSigner.getAddress(),
					);

					const ownerAfterTxToSet = await ownerRegistryV6Wrapper.getOwner(registryDesc);

					expect(ownerAfterTxToSet, 'Owner after tx to set must be user address').to.equal(
						await userSigner.getAddress(),
					);
				});
				it('Set & get & remove bonucer', async function () {
					const ownerRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForOwner);

					const isBonucerBeforeTxToSet = await ownerRegistryV6Wrapper.getIsBonucer(
						registryDesc,
						await bonucerSigner.getAddress(),
					);

					expect(isBonucerBeforeTxToSet, 'Is bonucer before tx to set must be false').to.be.false;

					const txToSet = await ownerRegistryV6Wrapper.addBonucer(
						registryDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						await bonucerSigner.getAddress(),
					);
					const isBonucerAfterTxToSet = await ownerRegistryV6Wrapper.getIsBonucer(
						registryDesc,
						await bonucerSigner.getAddress(),
					);

					expect(isBonucerAfterTxToSet, 'Is bonucer after tx to set must be true').to.be.true;

					const txToRemove = await ownerRegistryV6Wrapper.removeBonucer(
						registryDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						await bonucerSigner.getAddress(),
					);

					const isBonucerAfterTxToRemove = await ownerRegistryV6Wrapper.getIsBonucer(
						registryDesc,
						await bonucerSigner.getAddress(),
					);

					expect(isBonucerAfterTxToRemove, 'Is bonucer after tx to remove must be false').to.be.false;
				});
				it('Set & get bonuces', async function () {
					const ownerRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForOwner);

					const bonusesBeforeTxToSet = await ownerRegistryV6Wrapper.getBonuces(registryDesc);

					expect(bonusesBeforeTxToSet.newcomer, 'Newcomer bonus before tx to set must be zero').to.equal(
						'0.0',
					);
					expect(bonusesBeforeTxToSet.referrer, 'Referrer bonus before tx to set must be zero').to.equal(
						'0.0',
					);

					const txToSet = await ownerRegistryV6Wrapper.setBonuses(
						registryDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						'100',
						'200',
					);

					const bonusesAfterTxToSet = await ownerRegistryV6Wrapper.getBonuces(registryDesc);

					expect(bonusesAfterTxToSet.newcomer, 'Newcomer bonus after tx to set must be 100').to.equal(
						'100.0',
					);
					expect(bonusesAfterTxToSet.referrer, 'Referrer bonus after tx to set must be 200').to.equal(
						'200.0',
					);

					const txToRemove = await ownerRegistryV6Wrapper.setBonuses(
						registryDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						'0',
						'0',
					);

					const bonusesAfterTxToRemove = await ownerRegistryV6Wrapper.getBonuces(registryDesc);

					expect(bonusesAfterTxToRemove.newcomer, 'Newcomer bonus after tx to remove must be zero').to.equal(
						'0.0',
					);
					expect(bonusesAfterTxToRemove.referrer, 'Referrer bonus after tx to remove must be zero').to.equal(
						'0.0',
					);
				});
			});
			describe('Keys management', function () {
				it('Attach & extract public key', async function () {
					const userRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForUser);

					const publicKeyBytes = nacl.randomBytes(32);
					const tx = await userRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						userSigner,
						await userSigner.getAddress(),
						new PublicKey(PublicKeyType.YLIDE, YlideKeyVersion.KEY_V2, publicKeyBytes),
						11,
					);
					const readKey = await userRegistryV6Wrapper.getPublicKeyByAddress(
						registryDesc,
						await userSigner.getAddress(),
					);

					expect(readKey, 'Read key must not be null').to.not.be.null;
					expect(readKey!.publicKey.keyVersion, 'Key versions mismatch').to.equal(YlideKeyVersion.KEY_V2);
					expect(readKey!.publicKey.keyBytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(readKey!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(readKey!.registrar, 'Registrar mismatch').to.equal(11);
				});
				it('Attach multiple keys & extract public key history', async function () {
					const historyUserRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForHistoryUser);

					const publicKeyBytes = nacl.randomBytes(32);

					const tx1 = await historyUserRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						historyUserSigner,
						await historyUserSigner.getAddress(),
						new PublicKey(PublicKeyType.YLIDE, YlideKeyVersion.KEY_V2, publicKeyBytes),
						101,
					);

					await mine(129);

					const tx2 = await historyUserRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						historyUserSigner,
						await historyUserSigner.getAddress(),
						new PublicKey(PublicKeyType.YLIDE, YlideKeyVersion.KEY_V2, publicKeyBytes),
						102,
					);

					await mine(129);

					const tx3 = await historyUserRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						historyUserSigner,
						await historyUserSigner.getAddress(),
						new PublicKey(PublicKeyType.YLIDE, YlideKeyVersion.KEY_V2, publicKeyBytes),
						103,
					);

					await mine(129);

					const tx4 = await historyUserRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						historyUserSigner,
						await historyUserSigner.getAddress(),
						new PublicKey(PublicKeyType.YLIDE, YlideKeyVersion.KEY_V2, publicKeyBytes),
						104,
					);

					await mine(129);

					const tx5 = await historyUserRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						historyUserSigner,
						await historyUserSigner.getAddress(),
						new PublicKey(PublicKeyType.YLIDE, YlideKeyVersion.KEY_V2, publicKeyBytes),
						105,
					);

					await mine(129);

					const keys = await historyUserRegistryV6Wrapper.getPublicKeysHistoryForAddress(
						registryDesc,
						await historyUserSigner.getAddress(),
					);

					expect(keys.length, 'Keys length mismatch').to.equal(5);

					expect(keys[0], 'Read key must not be null').to.not.be.null;
					expect(keys[0]!.publicKey.keyVersion, 'Key versions mismatch').to.equal(YlideKeyVersion.KEY_V2);
					expect(keys[0]!.publicKey.keyBytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(keys[0]!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(keys[0]!.registrar, 'Registrar mismatch').to.equal(105);

					expect(keys[1], 'Read key must not be null').to.not.be.null;
					expect(keys[1]!.publicKey.keyVersion, 'Key versions mismatch').to.equal(YlideKeyVersion.KEY_V2);
					expect(keys[1]!.publicKey.keyBytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(keys[1]!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(keys[1]!.registrar, 'Registrar mismatch').to.equal(104);

					expect(keys[2], 'Read key must not be null').to.not.be.null;
					expect(keys[2]!.publicKey.keyVersion, 'Key versions mismatch').to.equal(YlideKeyVersion.KEY_V2);
					expect(keys[2]!.publicKey.keyBytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(keys[2]!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(keys[2]!.registrar, 'Registrar mismatch').to.equal(103);

					expect(keys[3], 'Read key must not be null').to.not.be.null;
					expect(keys[3]!.publicKey.keyVersion, 'Key versions mismatch').to.equal(YlideKeyVersion.KEY_V2);
					expect(keys[3]!.publicKey.keyBytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(keys[3]!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(keys[3]!.registrar, 'Registrar mismatch').to.equal(102);

					expect(keys[4], 'Read key must not be null').to.not.be.null;
					expect(keys[4]!.publicKey.keyVersion, 'Key versions mismatch').to.equal(YlideKeyVersion.KEY_V2);
					expect(keys[4]!.publicKey.keyBytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(keys[4]!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(keys[4]!.registrar, 'Registrar mismatch').to.equal(101);
				});
				it('Attach & extract public key by admin (without bonuces)', async function () {
					const ownerRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForOwner);
					const bonucerRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForBonucer);
					const newUserRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForNewUser);

					const txToSetBonucer = await ownerRegistryV6Wrapper.addBonucer(
						registryDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						await bonucerSigner.getAddress(),
					);

					const publicKeyBytes = nacl.randomBytes(32);
					const now = await time.latest();
					const timeLock = now;
					await mine(1);
					const msg = constructFaucetMsg(publicKeyBytes, 17, 31337, timeLock);
					const signature = await newUserSigner.signMessage(msg);

					const r = signature.slice(0, 66);
					const s = '0x' + signature.slice(66, 130);
					const v = parseInt(signature.slice(130, 132), 16);

					const tx = await bonucerRegistryV6Wrapper.attachPublicKeyByAdmin(
						registryDesc,
						bonucerSigner,
						await bonucerSigner.getAddress(),
						{ v, r, s },
						await newUserSigner.getAddress(),
						publicKeyBytes,
						2,
						17,
						timeLock,
						'0x0000000000000000000000000000000000000000',
						false,
						'0',
					);

					const readKey = await newUserRegistryV6Wrapper.getPublicKeyByAddress(
						registryDesc,
						await newUserSigner.getAddress(),
					);

					expect(readKey, 'Read key must not be null').to.not.be.null;
					expect(readKey!.publicKey.keyVersion, 'Key versions mismatch').to.equal(YlideKeyVersion.KEY_V2);
					expect(readKey!.publicKey.keyBytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(readKey!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(readKey!.registrar, 'Registrar mismatch').to.equal(17);
				});
				it('Attach & extract public key by admin (with bonuces & referrer)', async function () {
					const bonucerRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForBonucer);
					const newUserRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForNewUser);
					const referrerRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForReferrer);
					const ownerRegistryV6Wrapper = new EVMRegistryV6Wrapper(readerForOwner);

					const txToSetBonucer = await ownerRegistryV6Wrapper.addBonucer(
						registryDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						await bonucerSigner.getAddress(),
					);
					const txToSetBonuses = await ownerRegistryV6Wrapper.setBonuses(
						registryDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						'100',
						'200',
					);

					const ref_publicKey = nacl.randomBytes(32);
					const now = await time.latest();
					const timeLock2 = now;
					await mine(1);
					const msg = constructFaucetMsg(ref_publicKey, 18, 31337, timeLock2);
					const ref_signature = await referrerSigner.signMessage(msg);

					const ref_r = ref_signature.slice(0, 66);
					const ref_s = '0x' + ref_signature.slice(66, 130);
					const ref_v = parseInt(ref_signature.slice(130, 132), 16);

					const ref_tx = await bonucerRegistryV6Wrapper.attachPublicKeyByAdmin(
						registryDesc,
						bonucerSigner,
						await bonucerSigner.getAddress(),
						{ v: ref_v, r: ref_r, s: ref_s },
						await referrerSigner.getAddress(),
						ref_publicKey,
						YlideKeyVersion.KEY_V2,
						18,
						timeLock2,
						'0x0000000000000000000000000000000000000000',
						false,
						'0',
					);

					const ref_readKey = await referrerRegistryV6Wrapper.getPublicKeyByAddress(
						registryDesc,
						await referrerSigner.getAddress(),
					);

					expect(ref_readKey, 'Read refKey must not be null').to.not.be.null;
					expect(ref_readKey!.publicKey.keyVersion, 'RefKey versions mismatch').to.equal(
						YlideKeyVersion.KEY_V2,
					);
					expect(ref_readKey!.publicKey.keyBytes.toString(), 'RefKey bytes mismatch').to.equal(
						ref_publicKey.toString(),
					);
					expect(ref_readKey!.publicKey.type, 'RefKey types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(ref_readKey!.registrar, 'RefRegistrar mismatch').to.equal(18);

					const publicKeyBytes = nacl.randomBytes(32);
					const now2 = await time.latest();
					const timeLock = now2;
					await mine(1);
					const msg2 = constructFaucetMsg(publicKeyBytes, 19, 31337, timeLock);
					const signature = await newUserSigner.signMessage(msg2);

					const r = signature.slice(0, 66);
					const s = '0x' + signature.slice(66, 130);
					const v = parseInt(signature.slice(130, 132), 16);

					const balanceBeforeTx = await readerForNewUser.getBalance(await newUserSigner.getAddress());

					expect(balanceBeforeTx.numeric, 'Balance before tx must be zero').to.equal(0);

					const tx = await bonucerRegistryV6Wrapper.attachPublicKeyByAdmin(
						registryDesc,
						bonucerSigner,
						await bonucerSigner.getAddress(),
						{ v, r, s },
						await newUserSigner.getAddress(),
						publicKeyBytes,
						YlideKeyVersion.KEY_V2,
						19,
						timeLock,
						await referrerSigner.getAddress(),
						true,
						hre.ethers.utils.parseEther('300').toString(),
					);

					const readKey = await newUserRegistryV6Wrapper.getPublicKeyByAddress(
						registryDesc,
						await newUserSigner.getAddress(),
					);

					expect(readKey, 'Read key must not be null').to.not.be.null;
					expect(readKey!.publicKey.keyVersion, 'Key versions mismatch').to.equal(YlideKeyVersion.KEY_V2);
					expect(readKey!.publicKey.keyBytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(readKey!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(readKey!.registrar, 'Registrar mismatch').to.equal(19);

					const balanceAfterTx = await readerForNewUser.getBalance(await newUserSigner.getAddress());
					const refBalanceAfterTx = await readerForNewUser.getBalance(await referrerSigner.getAddress());

					expect(balanceAfterTx.numeric, 'Balance after tx must be 100').to.equal(100);
					expect(refBalanceAfterTx.numeric, 'Referrer balance after tx must be 200').to.equal(200);
				});
			});
		});
	});
});
