import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';

const config: HardhatUserConfig = {
	solidity: '0.8.17',
	mocha: {
		timeout: 15000,
	},
};

export default config;
