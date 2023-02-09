export interface IPeriod {
	start: number;
	end: number;
}

export const compressPeriods = (periods: IPeriod[]): IPeriod[] => {
	const result: IPeriod[] = [...periods];

	let i = 0;
	while (i < result.length - 1) {
		if (result[i].end >= result[i + 1].start) {
			result[i].end = result[i + 1].end;
			result.splice(i + 1, 1);
		} else {
			i++;
		}
	}

	return result;
};

export const resplitPeriods = (periods: IPeriod[], split: number): IPeriod[] => {
	const result: IPeriod[] = [];
	let currentPeriod: IPeriod | null = null;
	for (const period of periods) {
		if (!currentPeriod) {
			currentPeriod = { start: period.start, end: period.end };
			result.push(currentPeriod);
		} else {
			if (period.start > currentPeriod.end) {
				if (period.start - currentPeriod.start < split) {
					currentPeriod.end = period.start;
					if (period.end - currentPeriod.start <= split) {
						currentPeriod.end = period.end;
					} else {
						currentPeriod.end = currentPeriod.start + split;
						currentPeriod = { start: currentPeriod.end, end: period.end };
						result.push(currentPeriod);
					}
				} else {
					currentPeriod = { start: period.start, end: period.end };
					result.push(currentPeriod);
				}
			} else {
				if (period.end - currentPeriod.start <= split) {
					currentPeriod.end = period.end;
				} else {
					currentPeriod.end = currentPeriod.start + split;
					currentPeriod = { start: currentPeriod.end, end: period.end };
					result.push(currentPeriod);
				}
			}
		}
	}

	return result;
};
