export const themeColors = {
	dark: {
		positive: "text-emerald-500",
		negative: "text-rose-500",
		neutral: "text-gray-400",
		text: "text-gray-300",
		description: "text-gray-400",
		surface: "bg-slate-900 text-slate-100",
		panel: "bg-slate-800 text-slate-100 border border-slate-700",
		panelHover: "hover:shadow-lg",
		border: "border-slate-700",
		input:
			"appearance-none bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400 [color-scheme:dark] focus:border-sky-500 focus:ring-sky-500",
		inputIcon: "text-slate-300",
		buttonPrimary:
			"border-sky-500 bg-sky-500 text-slate-950 hover:bg-sky-400 focus:ring-sky-400",
		buttonSecondary:
			"border-slate-600 text-slate-100 hover:bg-slate-700 focus:ring-sky-500",
		buttonSuccess:
			"border-emerald-600 text-emerald-100 hover:bg-emerald-950/40 focus:ring-emerald-500",
		buttonDanger:
			"border-rose-600 text-rose-100 hover:bg-rose-950/40 focus:ring-rose-500",
		buttonGhost:
			"border-slate-600 text-slate-200 hover:bg-slate-700 focus:ring-sky-500",
		iconButton:
			"text-slate-300 hover:text-white hover:bg-slate-700 focus:ring-sky-500",
		navSurface: "bg-slate-800 border-r border-slate-700",
		navHover: "hover:bg-slate-700",
		navActive: "bg-slate-700 text-sky-300",
		navIcon: "text-slate-400",
		tooltip: "bg-slate-700 text-slate-50 border border-slate-600",
		toggleTrack:
			"bg-slate-600 peer-checked:bg-sky-600 peer-focus:ring-sky-700 border border-slate-500",
		toggleThumb: "after:bg-white after:border after:border-slate-300",
		overlay: "bg-slate-950/60",
		overlayCard: "bg-slate-800 text-slate-100 border border-slate-700",
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
		surface: "bg-slate-50 text-slate-900",
		panel: "bg-white text-slate-800 border border-slate-200",
		panelHover: "hover:shadow-lg",
		border: "border-slate-200",
		input:
			"appearance-none bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 [color-scheme:light] focus:border-sky-600 focus:ring-sky-500",
		inputIcon: "text-slate-600",
		buttonPrimary:
			"border-slate-800 bg-slate-800 text-white hover:bg-slate-700 focus:ring-slate-400",
		buttonSecondary:
			"border-slate-300 text-slate-700 hover:bg-slate-100 focus:ring-sky-500",
		buttonSuccess:
			"border-emerald-600 text-emerald-700 hover:bg-emerald-50 focus:ring-emerald-500",
		buttonDanger:
			"border-rose-600 text-rose-700 hover:bg-rose-50 focus:ring-rose-500",
		buttonGhost:
			"border-slate-300 text-slate-700 hover:bg-slate-100 focus:ring-sky-500",
		iconButton:
			"text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-sky-500",
		navSurface: "bg-white border-r border-slate-200",
		navHover: "hover:bg-slate-100",
		navActive: "bg-slate-200 text-slate-900",
		navIcon: "text-slate-600",
		tooltip: "bg-slate-800 text-slate-50 border border-slate-700",
		toggleTrack:
			"bg-slate-200 peer-checked:bg-sky-600 peer-focus:ring-sky-300 border border-slate-300",
		toggleThumb: "after:bg-white after:border after:border-slate-300",
		overlay: "bg-slate-950/45",
		overlayCard: "bg-white text-slate-900 border border-slate-200",
		providers: {
			COROS: "bg-blue-100 text-blue-800",
			GARMIN: "bg-orange-100 text-orange-800",
			STRAVA: "bg-red-100 text-red-800",
		},
	},
};

export type ThemeColors = typeof themeColors.dark;

export const inputBaseClass =
	"rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2";

export const formLabelClass = "text-sm font-medium";

export const pillButtonBaseClass =
	"rounded-full border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

export const actionButtonBaseClass =
	"rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

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
