import { dayjs } from "@repo/dates";
import type { IWeeklyOverviewData } from "@repo/types";
import { cn } from "@repo/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { formatDistance, formatDuration } from "../utils/formatters.js";
import { Box } from "./Box.js";
import { Text } from "./Text.js";
import { ValueTrend } from "./ValueTrend.js";

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

export const WeeklyOverviewList: React.FC<{ limit?: number }> = ({ limit }) => {
	const { client } = useDataClient();
	const { isDarkMode } = useTheme();
	const [weeks, setWeeks] = useState<IWeeklyOverviewData[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const fetchWeeklyData = useCallback(async () => {
		setIsLoading(true);
		try {
			const result = await client.getWeeklyOverview({ limit: limit ?? 4 });
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
	}, [client, limit]);

	useEffect(() => {
		fetchWeeklyData();
	}, [fetchWeeklyData]);

	const displayRows = useMemo(() => {
		const sortedAsc = [...weeks].sort(
			(a, b) => dayjs(a.weekStart).valueOf() - dayjs(b.weekStart).valueOf(),
		);

		const withVariance = sortedAsc.map((entry, index) => {
			const previous = index > 0 ? sortedAsc[index - 1] : undefined;
			return {
				...entry,
				distanceVariance: previous ? entry.distance - previous.distance : null,
				durationVariance: previous ? entry.duration - previous.duration : null,
			};
		});
		// remove the first entry since it has no variance and reverse to show latest first
		return withVariance.slice(1).reverse();
	}, [weeks]);

	return (
		<Box classes="space-y-4">
			{isLoading ? (
				<Text text="Loading weekly overview…" />
			) : displayRows.length === 0 ? (
				<Text text="No weekly data available yet." />
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full table-auto text-sm">
						<thead
							className={cn(
								"text-xs uppercase tracking-wide",
								isDarkMode ? "text-gray-400" : "text-gray-600",
							)}
						>
							<tr className="border-b border-gray-200 dark:border-gray-700">
								<th className="px-3 py-2 text-left">Week</th>
								<th className="px-3 py-2 text-left">Distance</th>
								<th className="px-3 py-2 text-left">Time</th>
							</tr>
						</thead>
						<tbody>
							{displayRows.map((week) => (
								<tr
									key={week.weekStart}
									className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
								>
									<td className="px-3 py-2">
										<span className="font-medium">
											{formatWeekLabel(week.weekStart)}
										</span>
									</td>
									<td className="px-3 py-2 text-left">
										<ValueTrend
											value={formatDistance(week.distance)}
											formatter={formatDistance}
											difference={week.distanceVariance}
											showArrows
										/>
									</td>
									<td className="px-3 py-2 text-left">
										<ValueTrend
											value={formatDuration(Math.round(week.duration))}
											formatter={formatDuration}
											difference={week.durationVariance}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</Box>
	);
};
