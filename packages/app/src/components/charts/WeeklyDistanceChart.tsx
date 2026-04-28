import { dayjs } from "@repo/dates";
import type { IWeeklyOverviewData } from "@repo/types";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bounce, toast } from "react-toastify";
import {
	Bar,
	BarChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { useDataClient } from "../../contexts/DataClientContext.js";
import { useLoading } from "../../contexts/LoadingContext.js";
import { useTheme } from "../../contexts/ThemeContext.js";
import { useWebCachedReadRefresh } from "../../hooks/useWebCachedReadRefresh.js";
import { formatDistance } from "../../utils/formatters.js";
import { Box } from "../Box.js";
import { H2 } from "../H2.js";

type WeeklyDistanceData = IWeeklyOverviewData & {
	label: string;
};

type WeeklyDistanceChartProps = {
	onLoadingChange?: (isLoading: boolean) => void;
};

const formatWeekLabel = (weekStart: string) => {
	const start = dayjs(weekStart);
	if (!start.isValid()) return weekStart;
	return start.format("MMM D");
};

const formatWeekRange = (weekStart: string) => {
	const start = dayjs(weekStart);
	if (!start.isValid()) return weekStart;
	const end = start.add(6, "day");
	return `${start.format("MMM D")} - ${end.format("MMM D")}`;
};

export const WeeklyDistanceChart: React.FC<WeeklyDistanceChartProps> = ({
	onLoadingChange,
}) => {
	const { isDarkMode } = useTheme();
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const [data, setData] = useState<WeeklyDistanceData[]>([]);

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
				const result = await client.getWeeklyOverview({ limit: 8 });
				if (result.success) {
					const normalized = [...result.data]
						.sort(
							(a, b) =>
								dayjs(a.weekStart).valueOf() - dayjs(b.weekStart).valueOf(),
						)
						.map((entry) => ({
							...entry,
							label: formatWeekLabel(entry.weekStart),
						}));
					setData(normalized);
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

	useWebCachedReadRefresh(["getWeeklyOverview"], () =>
		fetchData({ showLoading: false, showErrors: false }),
	);

	const chartData = useMemo(() => data, [data]);

	// @ts-expect-error recharts tooltip typing is loose here
	const CustomTooltip = ({ active, payload, label }: unknown) => {
		if (active && payload && payload.length) {
			const point = payload[0]?.payload as WeeklyDistanceData | undefined;
			return (
				<div
					className={`p-2 rounded-lg shadow-lg ${
						isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
					}`}
				>
					<p className="font-semibold">
						{point ? formatWeekRange(point.weekStart) : label}
					</p>
					<p>{formatDistance(payload[0].value)}</p>
				</div>
			);
		}
		return null;
	};

	return (
		<Box classes="h-96 min-h-fit">
			<H2 text="Weekly Distance" />
			{chartData.length > 0 && (
				<ResponsiveContainer width="100%" height="100%" maxHeight={450}>
					<BarChart
						data={chartData}
						margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
					>
						<XAxis
							dataKey="label"
							angle={-45}
							textAnchor="end"
							height={92}
							tick={{
								fill: isDarkMode ? "#9CA3AF" : "#4B5563",
								fontSize: 12,
							}}
						/>
						<YAxis
							tickFormatter={(value) => `${value / 1000}km`}
							tick={{
								fill: isDarkMode ? "#9CA3AF" : "#4B5563",
								fontSize: 12,
							}}
						/>
						<Tooltip content={<CustomTooltip />} />
						<Bar
							dataKey="distance"
							fill={isDarkMode ? "#10B981" : "#059669"}
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ResponsiveContainer>
			)}
		</Box>
	);
};
