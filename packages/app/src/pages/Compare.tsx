import { dayjs } from "@repo/dates";
import type { DbActivityPopulated, IDailyOverviewData } from "@repo/types";
import { cn } from "@repo/ui";
import { BarChart3, CalendarDays, Clock3, Gauge, Route } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bounce, toast } from "react-toastify";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { Box } from "../components/index.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { useWebCachedReadRefresh } from "../hooks/useWebCachedReadRefresh.js";
import {
	formatDistance,
	formatDuration,
	formatPace,
} from "../utils/formatters.js";
import { formLabelClass, inputBaseClass } from "../utils/style.js";

type IntervalUnit = "weeks" | "months" | "years";

type PeriodSnapshot = {
	startDate: string;
	endDate: string;
	data: IDailyOverviewData[];
	activities: DbActivityPopulated[];
};

type PeriodTotals = {
	distance: number;
	duration: number;
	activeDays: number;
	averagePace: number | null;
	maxDayDistance: number;
	maxActivityDistance: number;
};

type ChartRow = {
	label: string;
	leftDistance: number;
	rightDistance: number;
	leftDurationHours: number;
	rightDurationHours: number;
	leftCumulativeDistance: number;
	rightCumulativeDistance: number;
};

const INTERVAL_OPTIONS: Array<{ label: string; value: IntervalUnit }> = [
	{ label: "Weeks", value: "weeks" },
	{ label: "Months", value: "months" },
	{ label: "Years", value: "years" },
];
const PRIMARY_SERIES = "#0F766E";
const SECONDARY_SERIES = "#2563EB";
const WINDOW_STYLES = {
	left: {
		label: "Window A",
		light: {
			card: "border-teal-200 bg-teal-50/90",
			label: "text-teal-700",
			value: "text-teal-950",
			icon: "bg-teal-100 text-teal-700",
			accent: "text-teal-700",
			muted: "text-teal-600/80",
		},
		dark: {
			card: "border-teal-800/70 bg-teal-950/30",
			label: "text-teal-300",
			value: "text-teal-50",
			icon: "bg-teal-900/80 text-teal-200",
			accent: "text-teal-300",
			muted: "text-teal-200/80",
		},
	},
	right: {
		label: "Window B",
		light: {
			card: "border-blue-200 bg-blue-50/90",
			label: "text-blue-700",
			value: "text-blue-950",
			icon: "bg-blue-100 text-blue-700",
			accent: "text-blue-700",
			muted: "text-blue-600/80",
		},
		dark: {
			card: "border-blue-800/70 bg-blue-950/30",
			label: "text-blue-300",
			value: "text-blue-200",
			icon: "bg-blue-900/80 text-blue-200",
			accent: "text-blue-300",
			muted: "text-blue-200/80",
		},
	},
} as const;

const getDefaultCompareState = () => {
	const currentMonthStart = dayjs().startOf("month");
	return {
		leftStartDate: currentMonthStart.format("YYYY-MM-DD"),
		rightStartDate: currentMonthStart.subtract(1, "month").format("YYYY-MM-DD"),
		intervalCount: 1,
		intervalUnit: "months" as IntervalUnit,
	};
};

const buildPeriodBounds = (
	startDate: string,
	intervalCount: number,
	intervalUnit: IntervalUnit,
) => {
	const safeCount = Math.max(1, intervalCount);
	const start = dayjs(startDate).startOf("day");
	return {
		startDate: start.format("YYYY-MM-DD"),
		endDate: start
			.add(safeCount, intervalUnit)
			.subtract(1, "day")
			.format("YYYY-MM-DD"),
	};
};

const getPeriodLabel = (startDate: string, endDate: string) =>
	`${dayjs(startDate).format("MMM D, YYYY")} - ${dayjs(endDate).format("MMM D, YYYY")}`;

const aggregateTotals = (rows: IDailyOverviewData[]): PeriodTotals =>
	rows.reduce<PeriodTotals>(
		(acc, row) => ({
			distance: acc.distance + row.distance,
			duration: acc.duration + row.duration,
			activeDays: acc.activeDays + (row.count > 0 ? 1 : 0),
			averagePace: null,
			maxDayDistance: Math.max(acc.maxDayDistance, row.distance),
			maxActivityDistance: 0,
		}),
		{
			distance: 0,
			duration: 0,
			activeDays: 0,
			averagePace: null,
			maxDayDistance: 0,
			maxActivityDistance: 0,
		},
	);

const formatHours = (seconds: number) => Number((seconds / 3600).toFixed(2));

const formatChartHours = (value: number) => `${value.toFixed(1)}h`;

const formatMetricDistance = (meters: number) => formatDistance(meters);

const formatMetricDuration = (seconds: number) => {
	if (seconds <= 0) {
		return "0h 0' 0\"";
	}
	return formatDuration(seconds);
};

const formatMetricPace = (secondsPerKilometer: number | null) => {
	if (secondsPerKilometer === null || !Number.isFinite(secondsPerKilometer)) {
		return "-";
	}
	return formatPace(secondsPerKilometer, true);
};

const formatMetricCount = (value: number, singular: string, plural: string) =>
	`${value} ${value === 1 ? singular : plural}`;

const MetricCard = ({
	icon: Icon,
	label,
	leftValue,
	rightValue,
	isDarkMode,
}: {
	icon: typeof Route;
	label: string;
	leftValue: string;
	rightValue: string;
	isDarkMode: boolean;
}) => (
	<div
		className={cn(
			"rounded-3xl border p-4 shadow-sm",
			isDarkMode
				? "border-slate-700 bg-slate-900/70"
				: "border-slate-200 bg-white/90",
		)}
	>
		<div className="flex items-start justify-between gap-3">
			<div>
				<p
					className={cn(
						"text-xs font-semibold uppercase tracking-[0.18em]",
						isDarkMode ? "text-slate-400" : "text-slate-500",
					)}
				>
					{label}
				</p>
				<p
					className={cn(
						"mt-3 text-lg font-semibold",
						isDarkMode
							? WINDOW_STYLES.left.dark.accent
							: WINDOW_STYLES.left.light.accent,
					)}
				>
					{leftValue}
				</p>
				<p
					className={cn(
						"mt-1 text-sm",
						isDarkMode
							? WINDOW_STYLES.right.dark.accent
							: WINDOW_STYLES.right.light.accent,
					)}
				>
					{rightValue}
				</p>
			</div>
			<div
				className={cn(
					"rounded-2xl p-2",
					isDarkMode
						? "bg-slate-800 text-slate-200"
						: "bg-slate-100 text-slate-700",
				)}
			>
				<Icon className="size-4" />
			</div>
		</div>
	</div>
);

export function Compare() {
	const defaults = useMemo(getDefaultCompareState, []);
	const { client } = useDataClient();
	const { colors, isDarkMode } = useTheme();
	const [leftStartDate, setLeftStartDate] = useState(defaults.leftStartDate);
	const [rightStartDate, setRightStartDate] = useState(defaults.rightStartDate);
	const [intervalCount, setIntervalCount] = useState(defaults.intervalCount);
	const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>(
		defaults.intervalUnit,
	);
	const [leftPeriod, setLeftPeriod] = useState<PeriodSnapshot | null>(null);
	const [rightPeriod, setRightPeriod] = useState<PeriodSnapshot | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const leftBounds = useMemo(
		() => buildPeriodBounds(leftStartDate, intervalCount, intervalUnit),
		[leftStartDate, intervalCount, intervalUnit],
	);
	const rightBounds = useMemo(
		() => buildPeriodBounds(rightStartDate, intervalCount, intervalUnit),
		[rightStartDate, intervalCount, intervalUnit],
	);

	const loadCompareData = async ({
		showLoading = true,
		showErrors = true,
	}: {
		showLoading?: boolean;
		showErrors?: boolean;
	} = {}) => {
		if (!leftStartDate || !rightStartDate) {
			return;
		}

		if (showLoading) {
			setIsLoading(true);
		}

		try {
			const [
				leftResult,
				rightResult,
				leftActivitiesResult,
				rightActivitiesResult,
			] = await Promise.all([
				client.getDailyOverview(leftBounds),
				client.getDailyOverview(rightBounds),
				client.getActivities({
					startDate: leftBounds.startDate,
					endDate: leftBounds.endDate,
					limit: 2000,
				}),
				client.getActivities({
					startDate: rightBounds.startDate,
					endDate: rightBounds.endDate,
					limit: 2000,
				}),
			]);

			if (!leftResult.success) {
				throw new Error(leftResult.error);
			}
			if (!rightResult.success) {
				throw new Error(rightResult.error);
			}
			if (!leftActivitiesResult.success) {
				throw new Error(leftActivitiesResult.error);
			}
			if (!rightActivitiesResult.success) {
				throw new Error(rightActivitiesResult.error);
			}

			setLeftPeriod({
				...leftBounds,
				data: leftResult.data,
				activities: leftActivitiesResult.data.data,
			});
			setRightPeriod({
				...rightBounds,
				data: rightResult.data,
				activities: rightActivitiesResult.data.data,
			});
		} catch (error) {
			if (!showErrors) {
				return;
			}
			toast.error((error as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			if (showLoading) {
				setIsLoading(false);
			}
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: compare ranges drive reloads
	useEffect(() => {
		void loadCompareData();
	}, [
		leftBounds.startDate,
		leftBounds.endDate,
		rightBounds.startDate,
		rightBounds.endDate,
	]);

	useWebCachedReadRefresh(["getDailyOverview"], () =>
		loadCompareData({ showLoading: false, showErrors: false }),
	);

	const leftTotals = useMemo(() => {
		const base = aggregateTotals(leftPeriod?.data ?? []);
		return {
			...base,
			averagePace:
				base.distance > 0 ? base.duration / (base.distance / 1000) : null,
			maxActivityDistance: Math.max(
				0,
				...(leftPeriod?.activities ?? []).map((activity) => activity.distance),
			),
		};
	}, [leftPeriod?.activities, leftPeriod?.data]);
	const rightTotals = useMemo(() => {
		const base = aggregateTotals(rightPeriod?.data ?? []);
		return {
			...base,
			averagePace:
				base.distance > 0 ? base.duration / (base.distance / 1000) : null,
			maxActivityDistance: Math.max(
				0,
				...(rightPeriod?.activities ?? []).map((activity) => activity.distance),
			),
		};
	}, [rightPeriod?.activities, rightPeriod?.data]);

	const chartData = useMemo<ChartRow[]>(() => {
		const leftRows = leftPeriod?.data ?? [];
		const rightRows = rightPeriod?.data ?? [];
		const maxLength = Math.max(leftRows.length, rightRows.length);
		let leftRunning = 0;
		let rightRunning = 0;

		return Array.from({ length: maxLength }, (_, index) => {
			const leftRow = leftRows[index];
			const rightRow = rightRows[index];
			leftRunning += leftRow?.distance ?? 0;
			rightRunning += rightRow?.distance ?? 0;
			return {
				label: `${index + 1}`,
				leftDistance: Number(((leftRow?.distance ?? 0) / 1000).toFixed(2)),
				rightDistance: Number(((rightRow?.distance ?? 0) / 1000).toFixed(2)),
				leftDurationHours: formatHours(leftRow?.duration ?? 0),
				rightDurationHours: formatHours(rightRow?.duration ?? 0),
				leftCumulativeDistance: Number((leftRunning / 1000).toFixed(2)),
				rightCumulativeDistance: Number((rightRunning / 1000).toFixed(2)),
			};
		});
	}, [leftPeriod?.data, rightPeriod?.data]);

	const leftRangeLabel = leftPeriod
		? getPeriodLabel(leftPeriod.startDate, leftPeriod.endDate)
		: getPeriodLabel(leftBounds.startDate, leftBounds.endDate);
	const rightRangeLabel = rightPeriod
		? getPeriodLabel(rightPeriod.startDate, rightPeriod.endDate)
		: getPeriodLabel(rightBounds.startDate, rightBounds.endDate);

	return (
		<div className="space-y-4">
			<section
				className={cn(
					"overflow-hidden rounded-[2rem] border px-4 py-5 shadow-sm sm:px-6 sm:py-6",
					isDarkMode
						? "border-slate-700 bg-slate-900/70"
						: "border-slate-200 bg-white/90",
				)}
			>
				<div className="flex flex-col gap-5">
					<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px_140px]">
						<div className="space-y-2">
							<label
								className={cn(formLabelClass, colors.text)}
								htmlFor="compare-left-start"
							>
								Window A start date
							</label>
							<input
								id="compare-left-start"
								type="date"
								value={leftStartDate}
								onChange={(event) => setLeftStartDate(event.target.value)}
								className={cn(inputBaseClass, colors.input, "w-full")}
							/>
						</div>
						<div className="space-y-2">
							<label
								className={cn(formLabelClass, colors.text)}
								htmlFor="compare-right-start"
							>
								Window B start date
							</label>
							<input
								id="compare-right-start"
								type="date"
								value={rightStartDate}
								onChange={(event) => setRightStartDate(event.target.value)}
								className={cn(inputBaseClass, colors.input, "w-full")}
							/>
						</div>
						<div className="space-y-2">
							<label
								className={cn(formLabelClass, colors.text)}
								htmlFor="compare-interval-count"
							>
								Interval length
							</label>
							<input
								id="compare-interval-count"
								type="number"
								min={1}
								value={intervalCount}
								onChange={(event) =>
									setIntervalCount(
										Math.max(1, Number.parseInt(event.target.value || "1", 10)),
									)
								}
								className={cn(inputBaseClass, colors.input, "w-full")}
							/>
						</div>
						<div className="space-y-2">
							<label
								className={cn(formLabelClass, colors.text)}
								htmlFor="compare-interval-unit"
							>
								Interval
							</label>
							<select
								id="compare-interval-unit"
								value={intervalUnit}
								onChange={(event) =>
									setIntervalUnit(event.target.value as IntervalUnit)
								}
								className={cn(inputBaseClass, colors.input, "w-full")}
							>
								{INTERVAL_OPTIONS.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					</div>

					<div className="grid gap-3 md:grid-cols-2">
						<div
							className={cn(
								"rounded-3xl border p-4",
								isDarkMode
									? WINDOW_STYLES.left.dark.card
									: WINDOW_STYLES.left.light.card,
							)}
						>
							<p
								className={cn(
									"text-xs font-semibold uppercase tracking-[0.18em]",
									isDarkMode
										? WINDOW_STYLES.left.dark.label
										: WINDOW_STYLES.left.light.label,
								)}
							>
								Window A
							</p>
							<p
								className={cn(
									"mt-2 text-base font-semibold",
									isDarkMode
										? WINDOW_STYLES.left.dark.value
										: WINDOW_STYLES.left.light.value,
								)}
							>
								{leftRangeLabel}
							</p>
						</div>
						<div
							className={cn(
								"rounded-3xl border p-4",
								isDarkMode
									? WINDOW_STYLES.right.dark.card
									: WINDOW_STYLES.right.light.card,
							)}
						>
							<p
								className={cn(
									"text-xs font-semibold uppercase tracking-[0.18em]",
									isDarkMode
										? WINDOW_STYLES.right.dark.label
										: WINDOW_STYLES.right.light.label,
								)}
							>
								Window B
							</p>
							<p
								className={cn(
									"mt-2 text-base font-semibold",
									isDarkMode
										? WINDOW_STYLES.right.dark.value
										: WINDOW_STYLES.right.light.value,
								)}
							>
								{rightRangeLabel}
							</p>
						</div>
					</div>
				</div>
			</section>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				<MetricCard
					icon={Route}
					label="Distance"
					leftValue={formatMetricDistance(leftTotals.distance)}
					rightValue={formatMetricDistance(rightTotals.distance)}
					isDarkMode={isDarkMode}
				/>
				<MetricCard
					icon={Clock3}
					label="Duration"
					leftValue={formatMetricDuration(leftTotals.duration)}
					rightValue={formatMetricDuration(rightTotals.duration)}
					isDarkMode={isDarkMode}
				/>
				<MetricCard
					icon={BarChart3}
					label="Active days"
					leftValue={formatMetricCount(leftTotals.activeDays, "day", "days")}
					rightValue={formatMetricCount(rightTotals.activeDays, "day", "days")}
					isDarkMode={isDarkMode}
				/>
				<MetricCard
					icon={Gauge}
					label="Average pace"
					leftValue={formatMetricPace(leftTotals.averagePace)}
					rightValue={formatMetricPace(rightTotals.averagePace)}
					isDarkMode={isDarkMode}
				/>
				<MetricCard
					icon={CalendarDays}
					label="Max day distance"
					leftValue={formatMetricDistance(leftTotals.maxDayDistance)}
					rightValue={formatMetricDistance(rightTotals.maxDayDistance)}
					isDarkMode={isDarkMode}
				/>
				<MetricCard
					icon={Route}
					label="Max activity distance"
					leftValue={formatMetricDistance(leftTotals.maxActivityDistance)}
					rightValue={formatMetricDistance(rightTotals.maxActivityDistance)}
					isDarkMode={isDarkMode}
				/>
			</div>

			<Box classes="space-y-4 rounded-[2rem] p-5">
				<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
					<div>
						<h3 className="text-lg font-semibold">Daily distance</h3>
						<p className={cn("text-sm", colors.description)}>
							Each bar compares the same day offset inside both selected
							windows.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3 text-xs font-medium">
						<div className="flex items-center gap-2">
							<span
								className="size-2.5 rounded-full"
								style={{ backgroundColor: PRIMARY_SERIES }}
							/>
							Window A
						</div>
						<div className="flex items-center gap-2">
							<span
								className="size-2.5 rounded-full"
								style={{ backgroundColor: SECONDARY_SERIES }}
							/>
							Window B
						</div>
					</div>
				</div>
				<div className="h-72">
					{chartData.length === 0 ? (
						<div
							className={cn(
								"grid h-full place-items-center rounded-3xl border border-dashed text-sm",
								isDarkMode
									? "border-slate-700 text-slate-400"
									: "border-slate-200 text-slate-500",
							)}
						>
							No activity data found for either window.
						</div>
					) : (
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={chartData} barGap={4}>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke={isDarkMode ? "#334155" : "#E2E8F0"}
								/>
								<XAxis
									dataKey="label"
									stroke={isDarkMode ? "#94A3B8" : "#64748B"}
								/>
								<YAxis stroke={isDarkMode ? "#94A3B8" : "#64748B"} unit=" km" />
								<Tooltip
									contentStyle={{
										borderRadius: 16,
										borderColor: isDarkMode ? "#334155" : "#CBD5E1",
										backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
									}}
								/>
								<Legend />
								<Bar
									dataKey="leftDistance"
									name="Window A"
									fill={PRIMARY_SERIES}
									radius={[8, 8, 0, 0]}
								/>
								<Bar
									dataKey="rightDistance"
									name="Window B"
									fill={SECONDARY_SERIES}
									radius={[8, 8, 0, 0]}
								/>
							</BarChart>
						</ResponsiveContainer>
					)}
				</div>
			</Box>

			<div className="grid gap-4 xl:grid-cols-2">
				<Box classes="space-y-4 rounded-[2rem] p-5">
					<div>
						<h3 className="text-lg font-semibold">Daily duration</h3>
						<p className={cn("text-sm", colors.description)}>
							Hours logged per relative day across both periods.
						</p>
					</div>
					<div className="h-72">
						{chartData.length === 0 ? (
							<div
								className={cn(
									"grid h-full place-items-center rounded-3xl border border-dashed text-sm",
									isDarkMode
										? "border-slate-700 text-slate-400"
										: "border-slate-200 text-slate-500",
								)}
							>
								No duration data found for either window.
							</div>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={chartData} barGap={4}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={isDarkMode ? "#334155" : "#E2E8F0"}
									/>
									<XAxis
										dataKey="label"
										stroke={isDarkMode ? "#94A3B8" : "#64748B"}
									/>
									<YAxis
										stroke={isDarkMode ? "#94A3B8" : "#64748B"}
										tickFormatter={formatChartHours}
									/>
									<Tooltip
										formatter={(value) =>
											typeof value === "number"
												? `${value.toFixed(2)} h`
												: value
										}
										contentStyle={{
											borderRadius: 16,
											borderColor: isDarkMode ? "#334155" : "#CBD5E1",
											backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
										}}
									/>
									<Bar
										dataKey="leftDurationHours"
										name="Window A"
										fill={PRIMARY_SERIES}
										radius={[8, 8, 0, 0]}
									/>
									<Bar
										dataKey="rightDurationHours"
										name="Window B"
										fill={SECONDARY_SERIES}
										radius={[8, 8, 0, 0]}
									/>
								</BarChart>
							</ResponsiveContainer>
						)}
					</div>
				</Box>

				<Box classes="space-y-4 rounded-[2rem] p-5">
					<div>
						<h3 className="text-lg font-semibold">Cumulative distance</h3>
						<p className={cn("text-sm", colors.description)}>
							Progression across the window, useful for spotting pacing
							differences.
						</p>
					</div>
					<div className="h-72">
						{chartData.length === 0 ? (
							<div
								className={cn(
									"grid h-full place-items-center rounded-3xl border border-dashed text-sm",
									isDarkMode
										? "border-slate-700 text-slate-400"
										: "border-slate-200 text-slate-500",
								)}
							>
								No cumulative trend available for either window.
							</div>
						) : (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={chartData}>
									<CartesianGrid
										strokeDasharray="3 3"
										stroke={isDarkMode ? "#334155" : "#E2E8F0"}
									/>
									<XAxis
										dataKey="label"
										stroke={isDarkMode ? "#94A3B8" : "#64748B"}
									/>
									<YAxis
										stroke={isDarkMode ? "#94A3B8" : "#64748B"}
										unit=" km"
									/>
									<Tooltip
										contentStyle={{
											borderRadius: 16,
											borderColor: isDarkMode ? "#334155" : "#CBD5E1",
											backgroundColor: isDarkMode ? "#0F172A" : "#FFFFFF",
										}}
									/>
									<Legend />
									<Line
										type="monotone"
										dataKey="leftCumulativeDistance"
										name="Window A"
										stroke={PRIMARY_SERIES}
										strokeWidth={3}
										dot={false}
									/>
									<Line
										type="monotone"
										dataKey="rightCumulativeDistance"
										name="Window B"
										stroke={SECONDARY_SERIES}
										strokeWidth={3}
										dot={false}
									/>
								</LineChart>
							</ResponsiveContainer>
						)}
					</div>
				</Box>
			</div>
		</div>
	);
}
