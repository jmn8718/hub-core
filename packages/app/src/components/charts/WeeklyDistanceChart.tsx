import { dayjs } from "@repo/dates";
import type { IWeeklyOverviewData } from "@repo/types";
import { cn } from "@repo/ui";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bounce, toast } from "react-toastify";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	type TooltipProps,
	XAxis,
	YAxis,
} from "recharts";
import type {
	NameType,
	ValueType,
} from "recharts/types/component/DefaultTooltipContent.js";
import { useDataClient } from "../../contexts/DataClientContext.js";
import { useLoading } from "../../contexts/LoadingContext.js";
import { useTheme } from "../../contexts/ThemeContext.js";
import { useWebCachedReadRefresh } from "../../hooks/useWebCachedReadRefresh.js";
import { formatDistance } from "../../utils/formatters.js";
import { Box } from "../Box.js";
import { H2 } from "../H2.js";
import { Text } from "../Text.js";

type WeekRange = 8 | 12 | 16;

type WeeklyDistanceData = IWeeklyOverviewData & {
	index: number;
	label: string;
	monthLabel: string;
};

type WeeklyDistanceChartProps = {
	onLoadingChange?: (isLoading: boolean) => void;
	weekRange?: WeekRange;
	weeks?: IWeeklyOverviewData[];
	isLoading?: boolean;
	targetWeekStart?: string;
};

const CHART_THEME = {
	light: {
		accent: "#2563eb",
		axis: "#6b7280",
		grid: "rgba(107, 114, 128, 0.24)",
		cursor: "rgba(37, 99, 235, 0.28)",
		tooltip: "bg-white text-gray-900 border border-blue-100",
	},
	dark: {
		accent: "#60a5fa",
		axis: "#9ca3af",
		grid: "rgba(156, 163, 175, 0.2)",
		cursor: "rgba(96, 165, 250, 0.28)",
		tooltip: "border border-gray-700 bg-gray-900 text-white",
	},
} as const;

const formatWeekRange = (weekStart: string) => {
	const start = dayjs(weekStart);
	if (!start.isValid()) return weekStart;
	const end = start.add(6, "day");
	return `${start.format("MMM D")} - ${end.format("MMM D")}`;
};

const formatYAxisDistance = (meters: number) => {
	const kilometers = meters / 1000;
	return `${kilometers.toFixed(1)} km`;
};

const getTickValues = (values: number[]) => {
	const maxValue = Math.max(...values, 0);
	if (maxValue <= 0) return [0];
	return [0, maxValue / 2, maxValue];
};

const buildMonthLabel = (
	entry: IWeeklyOverviewData,
	index: number,
	source: IWeeklyOverviewData[],
) => {
	const current = dayjs(entry.weekStart);
	if (!current.isValid()) return "";
	if (index === 0) return current.format("MMM").toUpperCase();

	const previous = dayjs(source[index - 1]?.weekStart);
	if (!previous.isValid()) return current.format("MMM").toUpperCase();

	return current.month() !== previous.month()
		? current.format("MMM").toUpperCase()
		: "";
};

const normalizeChartData = (weeks: IWeeklyOverviewData[]) => {
	const sorted = [...weeks].sort(
		(a, b) => dayjs(a.weekStart).valueOf() - dayjs(b.weekStart).valueOf(),
	);
	return sorted.map((entry, index, source) => ({
		...entry,
		index,
		label: formatWeekRange(entry.weekStart),
		monthLabel: buildMonthLabel(entry, index, source),
	}));
};

const formatTargetWeekSummary = (value?: string) => {
	if (!value) {
		return "Current week";
	}
	return `Week of ${formatWeekRange(value)}`;
};

export const WeeklyDistanceChart: React.FC<WeeklyDistanceChartProps> = ({
	onLoadingChange,
	weekRange: providedWeekRange,
	weeks: providedWeeks,
	isLoading: providedIsLoading,
	targetWeekStart,
}) => {
	const { isDarkMode } = useTheme();
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const [fetchedData, setFetchedData] = useState<WeeklyDistanceData[]>([]);
	const [internalIsLoading, setInternalIsLoading] = useState(false);
	const palette = CHART_THEME[isDarkMode ? "dark" : "light"];
	const usesProvidedData = typeof providedWeeks !== "undefined";
	const selectedWeekRange = providedWeekRange ?? 8;

	const fetchData = useCallback(
		async (
			range: WeekRange,
			{
				showLoading = true,
				showErrors = true,
			}: {
				showLoading?: boolean;
				showErrors?: boolean;
			} = {},
		) => {
			if (showLoading && !onLoadingChange) {
				setLocalLoading(true);
			}
			if (showLoading) {
				setInternalIsLoading(true);
				onLoadingChange?.(true);
			}
			try {
				const result = await client.getWeeklyOverview({
					limit: range,
					targetWeekStart,
				});
				if (result.success) {
					setFetchedData(normalizeChartData(result.data));
				} else if (showErrors) {
					toast.error(result.error, {
						hideProgressBar: false,
						closeOnClick: false,
						transition: Bounce,
					});
				}
			} catch (err) {
				if (!showErrors) {
					return;
				}
				toast.error((err as Error).message, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			} finally {
				if (showLoading) {
					setTimeout(() => {
						if (!onLoadingChange) {
							setLocalLoading(false);
						}
						setInternalIsLoading(false);
						onLoadingChange?.(false);
					}, 500);
				}
			}
		},
		[client, onLoadingChange, setLocalLoading, targetWeekStart],
	);

	useEffect(() => {
		if (usesProvidedData) {
			return;
		}
		void fetchData(selectedWeekRange);
	}, [fetchData, selectedWeekRange, usesProvidedData]);

	useWebCachedReadRefresh(["getWeeklyOverview"], () => {
		if (usesProvidedData) {
			return;
		}
		return fetchData(selectedWeekRange, {
			showLoading: false,
			showErrors: false,
		});
	});

	const chartData = useMemo(
		() => (providedWeeks ? normalizeChartData(providedWeeks) : fetchedData),
		[fetchedData, providedWeeks],
	);
	const isLoading = providedIsLoading ?? internalIsLoading;
	const yTicks = useMemo(
		() => getTickValues(chartData.map((entry) => entry.distance)),
		[chartData],
	);

	const CustomTooltip = ({
		active,
		payload,
	}: TooltipProps<ValueType, NameType>) => {
		if (!active || !payload?.length) {
			return null;
		}

		const point = payload[0]?.payload as WeeklyDistanceData | undefined;
		if (!point) {
			return null;
		}

		return (
			<div className={cn("rounded-2xl px-3 py-2 shadow-lg", palette.tooltip)}>
				<p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
					Week total
				</p>
				<p className="mt-1 text-sm font-medium">
					{formatWeekRange(point.weekStart)}
				</p>
				<p className="mt-2 text-lg font-semibold">
					{formatDistance(point.distance)}
				</p>
			</div>
		);
	};

	return (
		<Box classes="min-h-fit">
			<div className="flex flex-col gap-5">
				<div className="space-y-1">
					<H2 text="Weekly Distance" />
					<Text
						className={isDarkMode ? "text-gray-400" : "text-gray-500"}
						text={`Past ${selectedWeekRange} weeks · ${formatTargetWeekSummary(targetWeekStart)}`}
					/>
				</div>

				{isLoading ? (
					<div
						className={cn(
							"h-[22rem] animate-pulse rounded-2xl",
							isDarkMode ? "bg-gray-800" : "bg-gray-100",
						)}
					/>
				) : chartData.length === 0 ? (
					<Text text="No weekly distance data available yet." />
				) : (
					<div className="h-[22rem]">
						<ResponsiveAreaChart
							data={chartData}
							isDarkMode={isDarkMode}
							palette={palette}
							yTicks={yTicks}
							tooltipContent={<CustomTooltip />}
						/>
					</div>
				)}
			</div>
		</Box>
	);
};

const ResponsiveAreaChart = ({
	data,
	isDarkMode,
	palette,
	yTicks,
	tooltipContent,
}: {
	data: WeeklyDistanceData[];
	isDarkMode: boolean;
	palette: (typeof CHART_THEME)["light"] | (typeof CHART_THEME)["dark"];
	yTicks: number[];
	tooltipContent: React.ReactElement;
}) => {
	return (
		<div className="h-full w-full">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart
					data={data}
					margin={{ top: 12, right: 10, bottom: 12, left: 0 }}
				>
					<defs>
						<linearGradient id="weeklyDistanceFill" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={palette.accent} stopOpacity={0.38} />
							<stop
								offset="100%"
								stopColor={palette.accent}
								stopOpacity={0.08}
							/>
						</linearGradient>
					</defs>
					<CartesianGrid
						stroke={palette.grid}
						strokeDasharray="0"
						vertical={false}
					/>
					<XAxis
						dataKey="monthLabel"
						axisLine={false}
						tickLine={false}
						interval={0}
						tickMargin={12}
						tick={{
							fill: palette.axis,
							fontSize: 12,
							fontWeight: 600,
						}}
					/>
					<YAxis
						yAxisId="right"
						orientation="right"
						axisLine={false}
						tickLine={false}
						width={72}
						ticks={yTicks}
						domain={[0, yTicks[yTicks.length - 1] ?? 0]}
						tickFormatter={formatYAxisDistance}
						tick={{
							fill: palette.axis,
							fontSize: 12,
						}}
					/>
					<Tooltip
						content={tooltipContent}
						cursor={{
							stroke: palette.cursor,
							strokeWidth: 2,
						}}
					/>
					<Area
						yAxisId="right"
						type="monotone"
						dataKey="distance"
						stroke={palette.accent}
						strokeWidth={3}
						fill="url(#weeklyDistanceFill)"
						activeDot={{
							r: 7,
							fill: palette.accent,
							stroke: isDarkMode ? "#111827" : "#fff7ed",
							strokeWidth: 4,
						}}
						dot={{
							r: 4.5,
							fill: isDarkMode ? "#111827" : "#fff7ed",
							stroke: palette.accent,
							strokeWidth: 3,
						}}
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	);
};
