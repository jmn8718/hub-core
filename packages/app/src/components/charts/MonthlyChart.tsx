import { cn } from "@repo/ui";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
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

type MonthlyData = {
	month: string;
	count: number;
	distance: number;
};

const MONTHLY_CHART_THEME = {
	light: {
		accent: "#2563eb",
		area: "rgba(37, 99, 235, 0.22)",
		axis: "#6b7280",
		grid: "rgba(107, 114, 128, 0.24)",
		cursor: "rgba(37, 99, 235, 0.28)",
		tooltip: "bg-white text-gray-900 border border-blue-100",
	},
	dark: {
		accent: "#60a5fa",
		area: "rgba(96, 165, 250, 0.24)",
		axis: "#9ca3af",
		grid: "rgba(156, 163, 175, 0.2)",
		cursor: "rgba(96, 165, 250, 0.28)",
		tooltip: "border border-gray-700 bg-gray-900 text-white",
	},
} as const;

type MonthlyActivityChartProps = {
	onLoadingChange?: (isLoading: boolean) => void;
};

export const MonthlyActivityChart: React.FC<MonthlyActivityChartProps> = ({
	onLoadingChange,
}) => {
	const { isDarkMode } = useTheme();
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const [data, setData] = useState<MonthlyData[]>([]);
	const palette = MONTHLY_CHART_THEME[isDarkMode ? "dark" : "light"];

	const fetchData = useCallback(
		async ({
			showLoading = true,
			showErrors = true,
		}: {
			showLoading?: boolean;
			showErrors?: boolean;
		} = {}) => {
			if (showLoading && !onLoadingChange) {
				setLocalLoading(true);
			}
			if (showLoading) {
				onLoadingChange?.(true);
			}
			try {
				const result = await client.getDataOverview({ limit: 12 });
				if (result.success) {
					setData(result.data.reverse());
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
						onLoadingChange?.(false);
					}, 500);
				}
			}
		},
		[client, onLoadingChange, setLocalLoading],
	);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useWebCachedReadRefresh(["getDataOverview"], () =>
		fetchData({ showLoading: false, showErrors: false }),
	);

	const CustomTooltip = ({
		active,
		payload,
		label,
	}: TooltipProps<ValueType, NameType>) => {
		if (!active || !payload?.length) {
			return null;
		}

		return (
			<div className={cn("rounded-2xl px-3 py-2 shadow-lg", palette.tooltip)}>
				<p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
					Month total
				</p>
				<p className="mt-1 text-sm font-medium">{label}</p>
				<p className="mt-2 text-lg font-semibold">
					{formatDistance(Number(payload[0]?.value ?? 0))}
				</p>
			</div>
		);
	};

	return (
		<Box classes="h-96 min-h-fit">
			<H2 text="Monthly Distance" />
			{data.length > 0 ? (
				<ResponsiveContainer width="100%" height="100%" maxHeight={450}>
					<AreaChart
						data={data}
						margin={{ top: 12, right: 28, bottom: 20, left: 0 }}
					>
						<defs>
							<linearGradient
								id="monthlyDistanceFill"
								x1="0"
								y1="0"
								x2="0"
								y2="1"
							>
								<stop
									offset="0%"
									stopColor={palette.accent}
									stopOpacity={0.38}
								/>
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
							dataKey="month"
							angle={-45}
							textAnchor="end"
							height={96}
							tickMargin={12}
							axisLine={false}
							tickLine={false}
							tick={{
								fill: palette.axis,
								fontSize: 12,
							}}
						/>
						<YAxis
							orientation="right"
							axisLine={false}
							tickLine={false}
							tickFormatter={(value) => `${value / 1000}km`}
							tick={{
								fill: palette.axis,
								fontSize: 12,
							}}
						/>
						<Tooltip
							cursor={{ stroke: palette.cursor, strokeWidth: 2 }}
							content={<CustomTooltip />}
						/>
						<Area
							type="monotone"
							dataKey="distance"
							stroke={palette.accent}
							strokeWidth={3}
							fill="url(#monthlyDistanceFill)"
							dot={{
								r: 4,
								strokeWidth: 2,
								fill: isDarkMode ? "#111827" : "#ffffff",
								stroke: palette.accent,
							}}
							activeDot={{
								r: 6,
								strokeWidth: 2,
								fill: isDarkMode ? "#111827" : "#ffffff",
								stroke: palette.accent,
							}}
						/>
					</AreaChart>
				</ResponsiveContainer>
			) : (
				<Text text="No monthly distance data available yet." />
			)}
		</Box>
	);
};
