const themeColors = {
	dark: {
		positive: "text-emerald-500",
		negative: "text-rose-500",
		neutral: "text-gray-400",
	},
	light: {
		positive: "text-emerald-600",
		negative: "text-rose-600",
		neutral: "text-gray-500",
	},
};

export const getVarianceClass = (
	variance: number | null | undefined,
	goodWhenNegative: boolean,
	isDarkMode: boolean,
) => {
	const colors = isDarkMode ? themeColors.dark : themeColors.light;
	if (variance === null || variance === undefined || variance === 0) {
		return colors.neutral;
	}

	const isNegative = variance < 0;
	if (goodWhenNegative) {
		return isNegative ? colors.positive : colors.negative;
	}

	return isNegative ? colors.negative : colors.positive;
};
