import { dayjs } from "@repo/dates";
import type { IWeeklyOverviewData } from "@repo/types";
import { cn } from "@repo/ui";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { formatDistance, formatDuration } from "../utils/formatters.js";
import { Box } from "./Box.js";
import { H2 } from "./H2.js";
import { ValueTrend } from "./ValueTrend.js";

type FormatterFn = (value: number) => string;

interface WeeklyMetricProps {
	label: string;
	value: string;
	difference: number | null;
	formatter: FormatterFn;
	isDarkMode: boolean;
}

const WeeklyMetric: React.FC<WeeklyMetricProps> = ({
	label,
	value,
	difference,
	formatter,
	isDarkMode,
}) => {
	return (
		<div className="flex flex-col gap-2">
			<span
				className={cn(
					"text-md font-semibold",
					isDarkMode ? "text-gray-300" : "text-gray-600",
				)}
			>
				{label}
			</span>
			<ValueTrend
				value={value}
				difference={difference ?? undefined}
				formatter={formatter}
				valueClassName={cn(
					"text-lg font-semibold",
					isDarkMode ? "text-white" : "text-gray-900",
				)}
				neutralClassName={isDarkMode ? "text-gray-400" : "text-gray-500"}
				showArrows
			/>
		</div>
	);
};

const formatWeekLabel = (start: string): string => {
	const startDate = dayjs(start);
	const endDate = startDate.add(6, "day");
	if (!startDate.isValid()) {
		return start;
	}
	const sameMonth = startDate.month() === endDate.month();
	const sameYear = startDate.year() === endDate.year();
	const startFormat = sameYear
		? sameMonth
			? "MMM D"
			: "MMM D"
		: "MMM D, YYYY";
	const endFormat = sameYear ? "MMM D" : "MMM D, YYYY";
	return `${startDate.format(startFormat)} - ${endDate.format(endFormat)}`;
};

const formatDurationDelta: FormatterFn = (value) => {
	return formatDuration(Math.round(value));
};

const formatDistanceDelta: FormatterFn = (value) => {
	return formatDistance(value);
};

export const WeeklyOverviewList: React.FC = () => {
	const { client } = useDataClient();
	const { isDarkMode } = useTheme();
	const [weeks, setWeeks] = useState<IWeeklyOverviewData[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const fetchWeeklyData = useCallback(async () => {
		setIsLoading(true);
		try {
			const result = await client.getWeeklyOverview({ limit: 4 });
			if (result.success) {
				setWeeks(result.data);
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
	}, [client]);

	useEffect(() => {
		fetchWeeklyData();
	}, [fetchWeeklyData]);

	const displayList = useMemo(() => {
		const data = [...weeks].sort((a, b) =>
			a.weekStart.localeCompare(b.weekStart),
		);
		return [
			...data
				.map((entry, index) => {
					const previous = index > 0 ? data[index - 1] : undefined;
					return {
						...entry,
						distanceDelta: previous ? entry.distance - previous.distance : null,
						durationDelta: previous ? entry.duration - previous.duration : null,
					};
				})
				// remove first item, as we only want to show weeks with deltas
				.slice(1),
			// reverse as we want most recent week first
		].reverse();
	}, [weeks]);

	return (
		<Box classes="space-y-4">
			<H2 text="Weekly Summary" />
			{isLoading ? (
				<p
					className={cn(
						"text-sm",
						isDarkMode ? "text-gray-400" : "text-gray-500",
					)}
				>
					Loading weekly overview…
				</p>
			) : displayList.length === 0 ? (
				<p
					className={cn(
						"text-sm",
						isDarkMode ? "text-gray-400" : "text-gray-500",
					)}
				>
					No weekly data available yet.
				</p>
			) : (
				<div className="space-y-3">
					{displayList.map((week, index) => {
						return (
							<div key={week.weekStart}>
								<div
									className={cn(
										"flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between",
										index === 0 ? "mt-0" : "mt-2",
									)}
								>
									<span
										className={cn(
											"text-md font-semibold uppercase tracking-wide",
											isDarkMode ? "text-gray-400" : "text-gray-600",
										)}
									>
										Week of {formatWeekLabel(week.weekStart)}
									</span>
								</div>
								<div className="pl-2 mt-2 grid gap-4 sm:grid-cols-2">
									<WeeklyMetric
										label="Distance"
										value={formatDistance(week.distance)}
										difference={week.distanceDelta}
										formatter={formatDistanceDelta}
										isDarkMode={isDarkMode}
									/>
									<WeeklyMetric
										label="Time"
										value={formatDuration(Math.round(week.duration))}
										difference={0}
										formatter={formatDurationDelta}
										isDarkMode={isDarkMode}
									/>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</Box>
	);
};
