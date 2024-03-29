import type { ethers } from 'ethers';
import { BigNumber } from 'ethers';
import type { IEVMMailerContractLink } from '../../misc/types';
import type { EVMMailerV9Wrapper } from './EVMMailerV9Wrapper';

export class EVMMailerV9WrapperGlobals {
	constructor(public readonly wrapper: EVMMailerV9Wrapper) {
		//
	}

	async getOwner(mailer: IEVMMailerContractLink): Promise<string> {
		return await this.wrapper.cache.contractOperation(mailer, async contract => {
			return await contract.owner();
		});
	}

	async setOwner(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		owner: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.transferOwnership(owner, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async getExtraTreasury(mailer: IEVMMailerContractLink): Promise<string> {
		return await this.wrapper.cache.contractOperation(mailer, async contract => {
			return await contract.extraTreasury();
		});
	}

	async setExtraTreasury(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		newExtraTreasury: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.setExtraTreasury(newExtraTreasury, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async getBeneficiary(mailer: IEVMMailerContractLink): Promise<string> {
		return await this.wrapper.cache.contractOperation(mailer, async contract => {
			return await contract.beneficiary();
		});
	}

	async setBeneficiary(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		beneficiary: string,
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.setBeneficiary(beneficiary, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async getFees(
		mailer: IEVMMailerContractLink,
	): Promise<{ contentPartFee: BigNumber; recipientFee: BigNumber; broadcastFee: BigNumber }> {
		return await this.wrapper.cache.contractOperation(mailer, async contract => {
			const [contentPartFee] = await contract.functions.contentPartFee();
			const [recipientFee] = await contract.functions.recipientFee();
			const [broadcastFee] = await contract.functions.broadcastFee();

			return {
				contentPartFee,
				recipientFee,
				broadcastFee,
			};
		});
	}

	async setFees(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		fees: { contentPartFee: BigNumber; recipientFee: BigNumber; broadcastFee: BigNumber },
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.setFees(fees.contentPartFee, fees.recipientFee, fees.broadcastFee, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async getPrices(
		mailer: IEVMMailerContractLink,
	): Promise<{ broadcastFeedCreationPrice: string; mailingFeedCreationPrice: string }> {
		return await this.wrapper.cache.contractOperation(mailer, async contract => {
			const [broadcastFeedCreationPrice] = await contract.functions.broadcastFeedCreationPrice();
			const [mailingFeedCreationPrice] = await contract.functions.mailingFeedCreationPrice();

			return {
				broadcastFeedCreationPrice: broadcastFeedCreationPrice.toString(),
				mailingFeedCreationPrice: mailingFeedCreationPrice.toString(),
			};
		});
	}

	async setPrices(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		prices: { broadcastFeedCreationPrice: string; mailingFeedCreationPrice: string },
	): Promise<{ tx: ethers.ContractTransaction; receipt: ethers.ContractReceipt }> {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.setPrices(
			BigNumber.from(prices.broadcastFeedCreationPrice),
			BigNumber.from(prices.mailingFeedCreationPrice),
			{ from },
		);
		const receipt = await tx.wait();
		return { tx, receipt };
	}

	async getTerminationBlock(mailer: IEVMMailerContractLink): Promise<number> {
		return await this.wrapper.cache.contractOperation(mailer, async (contract, provider) => {
			const terminationBlock = await contract.terminationBlock();
			return terminationBlock.toNumber();
		});
	}

	async isYlide(mailer: IEVMMailerContractLink, contractAddresses: string): Promise<boolean> {
		return await this.wrapper.cache.contractOperation(mailer, async (contract, provider) => {
			return contract.isYlide(contractAddresses);
		});
	}

	async setIsYlide(
		mailer: IEVMMailerContractLink,
		signer: ethers.Signer,
		from: string,
		contractAddresses: string[],
		isSet: boolean[],
	) {
		const contract = this.wrapper.cache.getContract(mailer.address, signer);
		const tx = await contract.setIsYlide(contractAddresses, isSet, { from });
		const receipt = await tx.wait();
		return { tx, receipt };
	}
}
