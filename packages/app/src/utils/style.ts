export const getDifferenceClassName = (
	diffRaw: number | null | undefined,
	goodWhenNegative: boolean,
) => {
	if (diffRaw === null || diffRaw === undefined || diffRaw === 0) {
		return "text-gray-400";
	}

	const isNegative = diffRaw < 0;
	if (goodWhenNegative) {
		return isNegative ? "text-green-500" : "text-red-500";
	}

	return isNegative ? "text-red-500" : "text-green-500";
};
