import { Signer } from 'ethers';
import { describe, it, before } from 'mocha';
import { YlideRegistryV6, YlideRegistryV6__factory } from '@ylide/ethereum-contracts';
import hre from 'hardhat';
import SmartBuffer from '@ylide/smart-buffer';
import nacl from 'tweetnacl';
import { EthereumBlockchainReader } from '../src/controllers/helpers/EthereumBlockchainReader';
import { EthereumRegistryV6Wrapper } from '../src/contract-wrappers/EthereumRegistryV6Wrapper';
import { PublicKey, PublicKeyType, YlidePublicKeyVersion } from '@ylide/sdk';
import { EVMRegistryContractType, IEVMRegistryContractLink } from '../src';
import { expect } from 'chai';
import { mine } from '@nomicfoundation/hardhat-network-helpers';

describe('YlideRegistryV6', function () {
	it('Should deploy', async function () {
		const signer = await hre.ethers.getSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
		const registryFactory = new YlideRegistryV6__factory(signer);
		await registryFactory.deploy();
	});

	describe('EthereumBlockchainReader', async function () {
		let ownerSigner: Signer;
		let userSigner: Signer;
		let historyUserSigner: Signer;
		let bonucerSigner: Signer;
		let newUserSigner: Signer;
		let referrerSigner: Signer;

		let readerForOwner: EthereumBlockchainReader;
		let readerForUser: EthereumBlockchainReader;
		let readerForHistoryUser: EthereumBlockchainReader;
		let readerForBonucer: EthereumBlockchainReader;
		let readerForNewUser: EthereumBlockchainReader;
		let readerForReferrer: EthereumBlockchainReader;

		before(async function () {
			await mine(202);

			ownerSigner = await hre.ethers.getSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
			userSigner = await hre.ethers.getSigner('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
			historyUserSigner = await hre.ethers.getSigner('0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc');
			bonucerSigner = await hre.ethers.getSigner('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
			newUserSigner = new hre.ethers.Wallet(nacl.randomBytes(32), hre.ethers.provider);
			referrerSigner = new hre.ethers.Wallet(nacl.randomBytes(32), hre.ethers.provider);

			readerForOwner = EthereumBlockchainReader.createEthereumBlockchainReader([
				{
					rpcUrlOrProvider: ownerSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForUser = EthereumBlockchainReader.createEthereumBlockchainReader([
				{
					rpcUrlOrProvider: userSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForHistoryUser = EthereumBlockchainReader.createEthereumBlockchainReader([
				{
					rpcUrlOrProvider: historyUserSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForBonucer = EthereumBlockchainReader.createEthereumBlockchainReader([
				{
					rpcUrlOrProvider: bonucerSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForNewUser = EthereumBlockchainReader.createEthereumBlockchainReader([
				{
					rpcUrlOrProvider: newUserSigner.provider!,
					blockLimit: 100,
				},
			]);
			readerForReferrer = EthereumBlockchainReader.createEthereumBlockchainReader([
				{
					rpcUrlOrProvider: referrerSigner.provider!,
					blockLimit: 100,
				},
			]);
		});
		describe('EthereumRegistryV6Wrapper', async function () {
			let registryFactory: YlideRegistryV6__factory;
			let registry: YlideRegistryV6;
			let registryDesc: IEVMRegistryContractLink;

			beforeEach(async function () {
				registryFactory = new YlideRegistryV6__factory(ownerSigner);
				registry = await registryFactory.deploy();
				registryDesc = {
					id: 1,
					type: EVMRegistryContractType.YlideRegistryV6,
					verified: false,
					address: registry.address,
					creationBlock: 1,
				};
			});
			describe('Misceallenous', function () {
				it('Set & get owner', async function () {
					const ownerRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForOwner);

					const ownerBeforeTxToSet = await ownerRegistryV6Wrapper.getOwner(registryDesc);

					expect(ownerBeforeTxToSet, 'Benificiary before tx to set must be zero-address').to.equal(
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
					const ownerRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForOwner);

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
					const ownerRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForOwner);

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
					const userRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForUser);

					const publicKeyBytes = nacl.randomBytes(32);
					const tx = await userRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						userSigner,
						await userSigner.getAddress(),
						{
							publicKey: PublicKey.fromBytes(PublicKeyType.YLIDE, publicKeyBytes),
							keyVersion: YlidePublicKeyVersion.KEY_V2,
							timestamp: 1,
							registrar: 11,
						},
					);
					const readKey = await userRegistryV6Wrapper.getPublicKeyByAddress(
						registryDesc,
						await userSigner.getAddress(),
					);

					expect(readKey, 'Read key must not be null').to.not.be.null;
					expect(readKey!.keyVersion, 'Key versions mismatch').to.equal(YlidePublicKeyVersion.KEY_V2);
					expect(readKey!.publicKey.bytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(readKey!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(readKey!.registrar, 'Registrar mismatch').to.equal(11);
				});
				it('Attach multiple keys & extract public key history', async function () {
					const historyUserRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForHistoryUser);

					const publicKeyBytes = nacl.randomBytes(32);

					const tx1 = await historyUserRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						historyUserSigner,
						await historyUserSigner.getAddress(),
						{
							publicKey: PublicKey.fromBytes(PublicKeyType.YLIDE, publicKeyBytes),
							keyVersion: YlidePublicKeyVersion.KEY_V2,
							timestamp: 1,
							registrar: 101,
						},
					);

					await mine(129);

					const tx2 = await historyUserRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						historyUserSigner,
						await historyUserSigner.getAddress(),
						{
							publicKey: PublicKey.fromBytes(PublicKeyType.YLIDE, publicKeyBytes),
							keyVersion: YlidePublicKeyVersion.KEY_V2,
							timestamp: 1,
							registrar: 102,
						},
					);

					await mine(129);

					const tx3 = await historyUserRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						historyUserSigner,
						await historyUserSigner.getAddress(),
						{
							publicKey: PublicKey.fromBytes(PublicKeyType.YLIDE, publicKeyBytes),
							keyVersion: YlidePublicKeyVersion.KEY_V2,
							timestamp: 1,
							registrar: 103,
						},
					);

					await mine(129);

					const tx4 = await historyUserRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						historyUserSigner,
						await historyUserSigner.getAddress(),
						{
							publicKey: PublicKey.fromBytes(PublicKeyType.YLIDE, publicKeyBytes),
							keyVersion: YlidePublicKeyVersion.KEY_V2,
							timestamp: 1,
							registrar: 104,
						},
					);

					await mine(129);

					const tx5 = await historyUserRegistryV6Wrapper.attachPublicKey(
						registryDesc,
						historyUserSigner,
						await historyUserSigner.getAddress(),
						{
							publicKey: PublicKey.fromBytes(PublicKeyType.YLIDE, publicKeyBytes),
							keyVersion: YlidePublicKeyVersion.KEY_V2,
							timestamp: 1,
							registrar: 105,
						},
					);

					await mine(129);

					const keys = await historyUserRegistryV6Wrapper.getPublicKeysHistoryForAddress(
						registryDesc,
						await historyUserSigner.getAddress(),
					);

					expect(keys.length, 'Keys length mismatch').to.equal(5);

					expect(keys[0], 'Read key must not be null').to.not.be.null;
					expect(keys[0]!.keyVersion, 'Key versions mismatch').to.equal(YlidePublicKeyVersion.KEY_V2);
					expect(keys[0]!.publicKey.bytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(keys[0]!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(keys[0]!.registrar, 'Registrar mismatch').to.equal(105);

					expect(keys[1], 'Read key must not be null').to.not.be.null;
					expect(keys[1]!.keyVersion, 'Key versions mismatch').to.equal(YlidePublicKeyVersion.KEY_V2);
					expect(keys[1]!.publicKey.bytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(keys[1]!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(keys[1]!.registrar, 'Registrar mismatch').to.equal(104);

					expect(keys[2], 'Read key must not be null').to.not.be.null;
					expect(keys[2]!.keyVersion, 'Key versions mismatch').to.equal(YlidePublicKeyVersion.KEY_V2);
					expect(keys[2]!.publicKey.bytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(keys[2]!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(keys[2]!.registrar, 'Registrar mismatch').to.equal(103);

					expect(keys[3], 'Read key must not be null').to.not.be.null;
					expect(keys[3]!.keyVersion, 'Key versions mismatch').to.equal(YlidePublicKeyVersion.KEY_V2);
					expect(keys[3]!.publicKey.bytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(keys[3]!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(keys[3]!.registrar, 'Registrar mismatch').to.equal(102);

					expect(keys[4], 'Read key must not be null').to.not.be.null;
					expect(keys[4]!.keyVersion, 'Key versions mismatch').to.equal(YlidePublicKeyVersion.KEY_V2);
					expect(keys[4]!.publicKey.bytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(keys[4]!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(keys[4]!.registrar, 'Registrar mismatch').to.equal(101);
				});
				it('Attach & extract public key by admin (without bonuces)', async function () {
					const ownerRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForOwner);
					const bonucerRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForBonucer);
					const newUserRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForNewUser);

					const txToSetBonucer = await ownerRegistryV6Wrapper.addBonucer(
						registryDesc,
						ownerSigner,
						await ownerSigner.getAddress(),
						await bonucerSigner.getAddress(),
					);

					const publicKeyBytes = nacl.randomBytes(32);
					const publicKeyHex = new SmartBuffer(publicKeyBytes).toHexString();
					const signature = await newUserSigner.signMessage(publicKeyHex);

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
						'0x0000000000000000000000000000000000000000',
						false,
						'0',
					);

					const readKey = await newUserRegistryV6Wrapper.getPublicKeyByAddress(
						registryDesc,
						await newUserSigner.getAddress(),
					);

					expect(readKey, 'Read key must not be null').to.not.be.null;
					expect(readKey!.keyVersion, 'Key versions mismatch').to.equal(YlidePublicKeyVersion.KEY_V2);
					expect(readKey!.publicKey.bytes.toString(), 'Key bytes mismatch').to.equal(
						publicKeyBytes.toString(),
					);
					expect(readKey!.publicKey.type, 'Key types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(readKey!.registrar, 'Registrar mismatch').to.equal(17);
				});
				it('Attach & extract public key by admin (with bonuces & referrer)', async function () {
					const bonucerRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForBonucer);
					const newUserRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForNewUser);
					const referrerRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForReferrer);
					const ownerRegistryV6Wrapper = new EthereumRegistryV6Wrapper(readerForOwner);

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
					const ref_publicKeyHex = new SmartBuffer(ref_publicKey).toHexString();
					const ref_signature = await referrerSigner.signMessage(ref_publicKeyHex);

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
						YlidePublicKeyVersion.KEY_V2,
						18,
						'0x0000000000000000000000000000000000000000',
						false,
						'0',
					);

					const ref_readKey = await referrerRegistryV6Wrapper.getPublicKeyByAddress(
						registryDesc,
						await referrerSigner.getAddress(),
					);

					expect(ref_readKey, 'Read refKey must not be null').to.not.be.null;
					expect(ref_readKey!.keyVersion, 'RefKey versions mismatch').to.equal(YlidePublicKeyVersion.KEY_V2);
					expect(ref_readKey!.publicKey.bytes.toString(), 'RefKey bytes mismatch').to.equal(
						ref_publicKey.toString(),
					);
					expect(ref_readKey!.publicKey.type, 'RefKey types mismatch').to.equal(PublicKeyType.YLIDE);
					expect(ref_readKey!.registrar, 'RefRegistrar mismatch').to.equal(18);

					const publicKeyBytes = nacl.randomBytes(32);
					const publicKeyHex = new SmartBuffer(publicKeyBytes).toHexString();
					const signature = await newUserSigner.signMessage(publicKeyHex);

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
						YlidePublicKeyVersion.KEY_V2,
						19,
						await referrerSigner.getAddress(),
						true,
						hre.ethers.utils.parseEther('300').toString(),
					);

					const readKey = await newUserRegistryV6Wrapper.getPublicKeyByAddress(
						registryDesc,
						await newUserSigner.getAddress(),
					);

					expect(readKey, 'Read key must not be null').to.not.be.null;
					expect(readKey!.keyVersion, 'Key versions mismatch').to.equal(YlidePublicKeyVersion.KEY_V2);
					expect(readKey!.publicKey.bytes.toString(), 'Key bytes mismatch').to.equal(
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
