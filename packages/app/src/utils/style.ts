export const getDifferenceClassName = (
	diffRaw: number | null | undefined,
	goodWhenNegative: boolean,
) => {
	if (diffRaw === null || diffRaw === undefined || diffRaw === 0) {
		return "text-gray-400";
	}

	const isNegative = diffRaw < 0;
	if (goodWhenNegative) {
		return isNegative ? "text-emerald-500" : "text-rose-500";
	}

	return isNegative ? "text-rose-500" : "text-emerald-500";
};
