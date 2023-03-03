import { LogDescription } from '@ethersproject/abi';
import { YlideMailerV8 } from '@ylide/ethereum-contracts';
import { ethers } from 'ethers';

export const parseOutLogs = (contract: YlideMailerV8, rawLogs: ethers.providers.Log[]) => {
	const logs = rawLogs
		.map(l => {
			try {
				return {
					log: l,
					logDescription: contract.interface.parseLog(l),
				};
			} catch (err) {
				return {
					log: l,
					logDescription: null,
				};
			}
		})
		.filter(
			(l): l is { log: ethers.providers.Log; logDescription: ethers.utils.LogDescription } =>
				l.logDescription !== null,
		);

	const byName: Record<string, { log: ethers.providers.Log; logDescription: LogDescription }[]> = {};
	for (const l of logs) {
		if (!byName[l.logDescription.name]) {
			byName[l.logDescription.name] = [];
		}
		byName[l.logDescription.name].push(l);
	}

	return {
		logs,
		byName,
	};
};
