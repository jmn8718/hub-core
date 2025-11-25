export const themeColors = {
	dark: {
		positive: "text-emerald-500",
		negative: "text-rose-500",
		neutral: "text-gray-400",
		text: "text-gray-300",
		description: "text-gray-400",
		providers: {
			COROS: "bg-blue-100 text-blue-800",
			GARMIN: "bg-orange-100 text-orange-800",
			STRAVA: "bg-red-100 text-red-800",
		},
	},
	light: {
		positive: "text-emerald-600",
		negative: "text-rose-600",
		neutral: "text-gray-500",
		text: "text-gray-700",
		description: "text-gray-500",
		providers: {
			COROS: "bg-blue-100 text-blue-800",
			GARMIN: "bg-orange-100 text-orange-800",
			STRAVA: "bg-red-100 text-red-800",
		},
	},
};

export type ThemeColors = typeof themeColors.dark;

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
