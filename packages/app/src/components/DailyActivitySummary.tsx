import { dayjs } from "@repo/dates";
import type { IDailyOverviewData } from "@repo/types";
import { cn } from "@repo/ui";
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
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { formatDistance } from "../utils/formatters.js";
import { Box } from "./Box.js";
import { DailyActivityStats } from "./DailyActivityStats.js";
import { H2 } from "./H2.js";
import { DailyDistanceChart } from "./charts/DailyDistanceChart.js";

type Mode = "relative" | "range";
type PeriodType = "days" | "weeks" | "months";

const formatDateForInput = (value: string | Date): string => {
	return dayjs(value).format("YYYY-MM-DD");
};

const DEFAULT_PERIOD_COUNT = 30;

export const DailyActivitySummary = () => {
	const { client } = useDataClient();
	const { isDarkMode } = useTheme();
	const [mode, setMode] = useState<Mode>("relative");
	const [periodType, setPeriodType] = useState<PeriodType>("days");
	const [periodCount, setPeriodCount] = useState<number>(DEFAULT_PERIOD_COUNT);
	const [startDate, setStartDate] = useState<string>(
		formatDateForInput(
			dayjs()
				.subtract(DEFAULT_PERIOD_COUNT - 1, "day")
				.toDate(),
		),
	);
	const [endDate, setEndDate] = useState<string>(
		formatDateForInput(dayjs().toDate()),
	);
	const [data, setData] = useState<IDailyOverviewData[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const fetchData = useCallback(async () => {
		if (mode === "range") {
			if (!startDate || !endDate) return;
			if (dayjs(startDate).isAfter(dayjs(endDate))) {
				toast.error("Start date must be before end date", {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
				return;
			}
		}

		setIsLoading(true);

		try {
			const params =
				mode === "range"
					? {
							startDate,
							endDate,
						}
					: {
							periodType,
							periodCount,
						};

			const result = await client.getDailyOverview(params);
			if (result.success) {
				setData(result.data);
			} else {
				toast.error(result.error, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			}
		} catch (err) {
			toast.error((err as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			setIsLoading(false);
		}
	}, [client, endDate, mode, periodCount, periodType, startDate]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const totals = useMemo(() => {
		const totalDistance = data.reduce((sum, entry) => sum + entry.distance, 0);
		const totalDuration = data.reduce((sum, entry) => sum + entry.duration, 0);
		const activeDays = data.filter((entry) => entry.distance > 0).length;

		return {
			totalDistance,
			totalDuration,
			activeDays,
		};
	}, [data]);

	const chartData = useMemo(() => {
		return data.map((entry) => ({
			date: entry.date,
			label: dayjs(entry.date).format("D"),
			distance: entry.distance,
		}));
	}, [data]);

	const inputClasses = (extra?: string) =>
		cn(
			"rounded-md border px-3 py-1 text-sm",
			isDarkMode
				? "border-gray-700 bg-gray-900 text-white"
				: "border-gray-200 bg-white text-gray-800",
			extra,
		);
	const subtleTextClass = isDarkMode ? "text-gray-400" : "text-gray-500";

	return (
		<Box classes="space-y-6">
			<div className="flex flex-col sm:flex-row-reverse gap-4 sm:items-start sm:justify-between">
				<div className="flex flex-wrap items-center gap-2">
					<select
						value={mode}
						onChange={(event) => setMode(event.target.value as Mode)}
						className={inputClasses()}
					>
						<option value="relative">Last period</option>
						<option value="range">Custom range</option>
					</select>

					{mode === "relative" ? (
						<div className="flex flex-wrap items-center gap-2">
							<input
								type="number"
								min={1}
								value={periodCount}
								onChange={(event) =>
									setPeriodCount(
										Math.max(1, Number.parseInt(event.target.value || "1", 10)),
									)
								}
								className={inputClasses("w-20")}
							/>
							<select
								value={periodType}
								onChange={(event) =>
									setPeriodType(event.target.value as PeriodType)
								}
								className={inputClasses()}
							>
								<option value="days">days</option>
								<option value="weeks">weeks</option>
								<option value="months">months</option>
							</select>
						</div>
					) : (
						<div className="flex flex-wrap items-center gap-2">
							{/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
							<label
								className={cn(
									"text-xs uppercase tracking-wide",
									subtleTextClass,
								)}
							>
								Start
							</label>
							<input
								type="date"
								value={startDate}
								onChange={(event) => setStartDate(event.target.value)}
								className={inputClasses()}
							/>
							{/* biome-ignore lint/a11y/noLabelWithoutControl: <explanation> */}
							<label
								className={cn(
									"text-xs uppercase tracking-wide",
									subtleTextClass,
								)}
							>
								End
							</label>
							<input
								type="date"
								value={endDate}
								onChange={(event) => setEndDate(event.target.value)}
								className={inputClasses()}
							/>
						</div>
					)}
				</div>
				<DailyActivityStats
					totalDistance={totals.totalDistance}
					totalDuration={totals.totalDuration}
					activeDays={totals.activeDays}
				/>
			</div>

			<div
				className={cn(
					"rounded-lg p-4",
					isDarkMode ? "bg-gray-800" : "bg-white",
				)}
			>
				{isLoading ? (
					<div className={cn("py-12 text-center text-sm", subtleTextClass)}>
						Loading daily data…
					</div>
				) : chartData.length === 0 ? (
					<div className={cn("py-12 text-center text-sm", subtleTextClass)}>
						No activities found for the selected period.
					</div>
				) : (
					<div className="h-72">
						<DailyDistanceChart data={chartData} />
					</div>
				)}
			</div>
		</Box>
	);
};
