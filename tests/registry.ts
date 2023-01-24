import { Signer } from 'ethers';
import { describe, it, before } from 'mocha';
import { YlideRegistryV5, YlideRegistryV5__factory } from '@ylide/ethereum-contracts';
import hre from 'hardhat';
import SmartBuffer from '@ylide/smart-buffer';
import nacl from 'tweetnacl';
import { EthereumBlockchainReader } from '../src/controllers/blockchain-helpers/EthereumBlockchainReader';
import { EthereumRegistryV5Wrapper } from '../src/controllers/blockchain-helpers/EthereumRegistryV5Wrapper';
import { EthereumMailerV8Reader } from '../src/controllers/blockchain-helpers/EthereumMailerV8Reader';
import { ExternalYlidePublicKey, PublicKey, PublicKeyType } from '@ylide/sdk';
import { IEthereumContractDescriptor } from '../src';
import { expect } from 'chai';

describe('YlideRegistry', function () {
	it('Should deploy', async function () {
		const signer = await hre.ethers.getSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
		const registryFactory = new YlideRegistryV5__factory(signer);
		const registry = await registryFactory.deploy('0x0000000000000000000000000000000000000000');
	});

	describe('EthereumBlockchainReader', async function () {
		let ownerSigner: Signer;
		let userSigner: Signer;
		let bonucerSigner: Signer;
		let newUserSigner: Signer;
		let referrerSigner: Signer;

		let readerForOwner: EthereumBlockchainReader;
		let readerForUser: EthereumBlockchainReader;
		let readerForBonucer: EthereumBlockchainReader;
		let readerForNewUser: EthereumBlockchainReader;
		let readerForReferrer: EthereumBlockchainReader;

		// let mailerV8Reader: EthereumMailerV8Reader;
		// let privateKey: Uint8Array;
		// let publicKey: Uint8Array;
		// privateKey = nacl.randomBytes(32);
		// publicKey = nacl.box.keyPair.fromSecretKey(privateKey).publicKey;

		before(async function () {
			ownerSigner = await hre.ethers.getSigner('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
			userSigner = await hre.ethers.getSigner('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
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
		describe('EthereumRegistryV5Wrapper', async function () {
			let registryFactory;
			let registry: YlideRegistryV5;
			let registryDesc: IEthereumContractDescriptor;
			let privateKey: Uint8Array;
			let publicKey: ExternalYlidePublicKey;

			beforeEach(async function () {
				registryFactory = new YlideRegistryV5__factory(ownerSigner);
				registry = await registryFactory.deploy('0x0000000000000000000000000000000000000000');
				registryDesc = {
					address: registry.address,
					creationBlock: 1,
				};

				privateKey = nacl.randomBytes(32);
				const publicKeyBytes = nacl.box.keyPair.fromSecretKey(privateKey).publicKey;
				publicKey = {
					publicKey: PublicKey.fromBytes(PublicKeyType.YLIDE, publicKeyBytes),
					keyVersion: 2,
					timestamp: 1,
				};
			});
			it('Attach & extract public key', async function () {
				const userRegistryV5Wrapper = new EthereumRegistryV5Wrapper(readerForUser);

				const tx = await userRegistryV5Wrapper.attachPublicKey(registryDesc, userSigner, publicKey);
				const readKey = await userRegistryV5Wrapper.getPublicKeyByAddress(
					registryDesc,
					await userSigner.getAddress(),
				);

				expect(readKey, 'Read key must not be null').to.not.be.null;
				expect(readKey!.keyVersion, 'Key versions mismatch').to.equal(publicKey.keyVersion);
				expect(readKey!.publicKey.bytes.toString(), 'Key bytes mismatch').to.equal(
					publicKey.publicKey.bytes.toString(),
				);
				expect(readKey!.publicKey.type, 'Key types mismatch').to.equal(publicKey.publicKey.type);
			});
			it('Set & get & remove bonucer', async function () {
				const ownerRegistryV5Wrapper = new EthereumRegistryV5Wrapper(readerForOwner);

				const isBonucerBeforeTxToSet = await ownerRegistryV5Wrapper.getIsBonucer(
					registryDesc,
					await bonucerSigner.getAddress(),
				);

				expect(isBonucerBeforeTxToSet, 'Is bonucer before tx to set must be false').to.be.false;

				const txToSet = await ownerRegistryV5Wrapper.addBonucer(
					registryDesc,
					ownerSigner,
					await bonucerSigner.getAddress(),
				);
				const isBonucerAfterTxToSet = await ownerRegistryV5Wrapper.getIsBonucer(
					registryDesc,
					await bonucerSigner.getAddress(),
				);

				expect(isBonucerAfterTxToSet, 'Is bonucer after tx to set must be true').to.be.true;

				const txToRemove = await ownerRegistryV5Wrapper.removeBonucer(
					registryDesc,
					ownerSigner,
					await bonucerSigner.getAddress(),
				);

				const isBonucerAfterTxToRemove = await ownerRegistryV5Wrapper.getIsBonucer(
					registryDesc,
					await bonucerSigner.getAddress(),
				);

				expect(isBonucerAfterTxToRemove, 'Is bonucer after tx to remove must be false').to.be.false;
			});
			it('Set & get bonuces', async function () {
				const ownerRegistryV5Wrapper = new EthereumRegistryV5Wrapper(readerForOwner);

				const bonusesBeforeTxToSet = await ownerRegistryV5Wrapper.getBonuces(registryDesc);

				expect(bonusesBeforeTxToSet.newcomer, 'Newcomer bonus before tx to set must be zero').to.equal(0);
				expect(bonusesBeforeTxToSet.referrer, 'Referrer bonus before tx to set must be zero').to.equal(0);

				const txToSet = await ownerRegistryV5Wrapper.setBonuces(registryDesc, ownerSigner, 100, 200);

				const bonusesAfterTxToSet = await ownerRegistryV5Wrapper.getBonuces(registryDesc);

				expect(bonusesAfterTxToSet.newcomer, 'Newcomer bonus after tx to set must be 100').to.equal(100);
				expect(bonusesAfterTxToSet.referrer, 'Referrer bonus after tx to set must be 200').to.equal(200);

				const txToRemove = await ownerRegistryV5Wrapper.setBonuces(registryDesc, ownerSigner, 0, 0);

				const bonusesAfterTxToRemove = await ownerRegistryV5Wrapper.getBonuces(registryDesc);

				expect(bonusesAfterTxToRemove.newcomer, 'Newcomer bonus after tx to remove must be zero').to.equal(0);
				expect(bonusesAfterTxToRemove.referrer, 'Referrer bonus after tx to remove must be zero').to.equal(0);
			});
			it('Attach & extract public key by admin (without bonuces)', async function () {
				const ownerRegistryV5Wrapper = new EthereumRegistryV5Wrapper(readerForOwner);
				const bonucerRegistryV5Wrapper = new EthereumRegistryV5Wrapper(readerForBonucer);
				const newUserRegistryV5Wrapper = new EthereumRegistryV5Wrapper(readerForNewUser);

				const txToSetBonucer = await ownerRegistryV5Wrapper.addBonucer(
					registryDesc,
					ownerSigner,
					await bonucerSigner.getAddress(),
				);

				const publicKeyHex = new SmartBuffer(publicKey.publicKey.bytes).toHexString();
				const signature = await newUserSigner.signMessage(publicKeyHex);

				const r = signature.slice(0, 66);
				const s = '0x' + signature.slice(66, 130);
				const v = parseInt(signature.slice(130, 132), 16);

				const tx = await bonucerRegistryV5Wrapper.attachPublicKeyByAdmin(
					registryDesc,
					bonucerSigner,
					{ v, r, s },
					await newUserSigner.getAddress(),
					publicKey.publicKey.bytes,
					2,
					'0x0000000000000000000000000000000000000000',
					false,
					'0',
				);

				const readKey = await newUserRegistryV5Wrapper.getPublicKeyByAddress(
					registryDesc,
					await newUserSigner.getAddress(),
				);

				expect(readKey, 'Read key must not be null').to.not.be.null;
				expect(readKey!.keyVersion, 'Key versions mismatch').to.equal(publicKey.keyVersion);
				expect(readKey!.publicKey.bytes.toString(), 'Key bytes mismatch').to.equal(
					publicKey.publicKey.bytes.toString(),
				);
				expect(readKey!.publicKey.type, 'Key types mismatch').to.equal(publicKey.publicKey.type);
			});

			it('Attach & extract public key by admin (with bonuces & referrer)', async function () {
				const bonucerRegistryV5Wrapper = new EthereumRegistryV5Wrapper(readerForBonucer);
				const newUserRegistryV5Wrapper = new EthereumRegistryV5Wrapper(readerForNewUser);
				const referrerRegistryV5Wrapper = new EthereumRegistryV5Wrapper(readerForReferrer);
				const ownerRegistryV5Wrapper = new EthereumRegistryV5Wrapper(readerForOwner);

				const txToSetBonucer = await ownerRegistryV5Wrapper.addBonucer(
					registryDesc,
					ownerSigner,
					await bonucerSigner.getAddress(),
				);
				const txToSetBonuces = await ownerRegistryV5Wrapper.setBonuces(registryDesc, ownerSigner, 100, 200);

				const ref_publicKey = nacl.randomBytes(32);
				const ref_publicKeyHex = new SmartBuffer(ref_publicKey).toHexString();
				const ref_signature = await referrerSigner.signMessage(ref_publicKeyHex);

				const ref_r = ref_signature.slice(0, 66);
				const ref_s = '0x' + ref_signature.slice(66, 130);
				const ref_v = parseInt(ref_signature.slice(130, 132), 16);

				const ref_tx = await bonucerRegistryV5Wrapper.attachPublicKeyByAdmin(
					registryDesc,
					bonucerSigner,
					{ v: ref_v, r: ref_r, s: ref_s },
					await referrerSigner.getAddress(),
					ref_publicKey,
					2,
					'0x0000000000000000000000000000000000000000',
					false,
					'0',
				);

				const ref_readKey = await referrerRegistryV5Wrapper.getPublicKeyByAddress(
					registryDesc,
					await referrerSigner.getAddress(),
				);

				expect(ref_readKey, 'Read refKey must not be null').to.not.be.null;
				expect(ref_readKey!.keyVersion, 'RefKey versions mismatch').to.equal(2);
				expect(ref_readKey!.publicKey.bytes.toString(), 'RefKey bytes mismatch').to.equal(
					ref_publicKey.toString(),
				);
				expect(ref_readKey!.publicKey.type, 'RefKey types mismatch').to.equal(PublicKeyType.YLIDE);

				const publicKeyHex = new SmartBuffer(publicKey.publicKey.bytes).toHexString();
				const signature = await newUserSigner.signMessage(publicKeyHex);

				const r = signature.slice(0, 66);
				const s = '0x' + signature.slice(66, 130);
				const v = parseInt(signature.slice(130, 132), 16);

				const balanceBeforeTx = await readerForNewUser.getBalance(await newUserSigner.getAddress());

				expect(balanceBeforeTx.number, 'Balance before tx must be zero').to.equal(0);

				const tx = await bonucerRegistryV5Wrapper.attachPublicKeyByAdmin(
					registryDesc,
					bonucerSigner,
					{ v, r, s },
					await newUserSigner.getAddress(),
					publicKey.publicKey.bytes,
					2,
					await referrerSigner.getAddress(),
					true,
					hre.ethers.utils.parseEther('300').toString(),
				);

				const readKey = await newUserRegistryV5Wrapper.getPublicKeyByAddress(
					registryDesc,
					await newUserSigner.getAddress(),
				);

				expect(readKey, 'Read key must not be null').to.not.be.null;
				expect(readKey!.keyVersion, 'Key versions mismatch').to.equal(publicKey.keyVersion);
				expect(readKey!.publicKey.bytes.toString(), 'Key bytes mismatch').to.equal(
					publicKey.publicKey.bytes.toString(),
				);
				expect(readKey!.publicKey.type, 'Key types mismatch').to.equal(publicKey.publicKey.type);

				const balanceAfterTx = await readerForNewUser.getBalance(await newUserSigner.getAddress());
				const refBalanceAfterTx = await readerForNewUser.getBalance(await referrerSigner.getAddress());

				expect(balanceAfterTx.number, 'Balance after tx must be 100').to.equal(100);
				expect(refBalanceAfterTx.number, 'Referrer balance after tx must be 200').to.equal(200);
			});
		});
	});
});
