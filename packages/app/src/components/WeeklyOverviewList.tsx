import { dayjs } from "@repo/dates";
import type { IWeeklyOverviewData } from "@repo/types";
import { cn } from "@repo/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { useWebCachedReadRefresh } from "../hooks/useWebCachedReadRefresh.js";
import { formatDistance, formatDuration } from "../utils/formatters.js";
import { Box } from "./Box.js";
import { Text } from "./Text.js";
import { ValueTrend } from "./ValueTrend.js";

const weeklyOverviewSkeletonIds = ["one", "two"] as const;

const SkeletonBlock = ({
	className,
	isDarkMode,
}: {
	className: string;
	isDarkMode: boolean;
}) => (
	<div
		className={cn(
			"animate-pulse rounded-md",
			isDarkMode ? "bg-gray-700" : "bg-gray-200",
			className,
		)}
	/>
);

const WeeklyOverviewSkeleton = ({
	isDarkMode,
	rows,
}: {
	isDarkMode: boolean;
	rows: readonly string[];
}) => (
	<>
		<div className="space-y-3 sm:hidden" aria-hidden="true">
			{rows.map((id) => (
				<div
					key={id}
					className="space-y-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 dark:border-gray-800"
				>
					<div className="space-y-2">
						<SkeletonBlock className="h-3 w-14" isDarkMode={isDarkMode} />
						<SkeletonBlock className="h-5 w-40" isDarkMode={isDarkMode} />
					</div>
					<div className="grid gap-4 min-[360px]:grid-cols-2">
						<div className="space-y-2">
							<SkeletonBlock className="h-3 w-16" isDarkMode={isDarkMode} />
							<SkeletonBlock className="h-7 w-24" isDarkMode={isDarkMode} />
						</div>
						<div className="space-y-2">
							<SkeletonBlock className="h-3 w-10" isDarkMode={isDarkMode} />
							<SkeletonBlock className="h-7 w-24" isDarkMode={isDarkMode} />
						</div>
					</div>
				</div>
			))}
		</div>
		<div className="hidden overflow-x-auto sm:block" aria-hidden="true">
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
					{rows.map((id) => (
						<tr
							key={id}
							className="border-b border-gray-100 last:border-b-0 dark:border-gray-800"
						>
							<td className="px-3 py-3">
								<SkeletonBlock className="h-5 w-40" isDarkMode={isDarkMode} />
							</td>
							<td className="px-3 py-3">
								<SkeletonBlock className="h-5 w-24" isDarkMode={isDarkMode} />
							</td>
							<td className="px-3 py-3">
								<SkeletonBlock className="h-5 w-24" isDarkMode={isDarkMode} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	</>
);

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

type WeeklyOverviewListProps = {
	limit?: number;
	refreshToken?: number;
	onLoadingChange?: (isLoading: boolean) => void;
};

export const WeeklyOverviewList: React.FC<WeeklyOverviewListProps> = ({
	limit,
	onLoadingChange,
	refreshToken,
}) => {
	const { client } = useDataClient();
	const { isDarkMode } = useTheme();
	const [weeks, setWeeks] = useState<IWeeklyOverviewData[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const fetchWeeklyData = useCallback(
		async ({
			showLoading = true,
			showErrors = true,
		}: {
			showLoading?: boolean;
			showErrors?: boolean;
		} = {}) => {
			if (showLoading) {
				setIsLoading(true);
				onLoadingChange?.(true);
			}
			try {
				const result = await client.getWeeklyOverview({ limit: limit ?? 4 });
				if (result.success) {
					setWeeks(result.data);
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
					setIsLoading(false);
					onLoadingChange?.(false);
				}
			}
		},
		[client, limit, onLoadingChange],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		fetchWeeklyData();
	}, [fetchWeeklyData, refreshToken]);

	useWebCachedReadRefresh(["getWeeklyOverview"], () =>
		fetchWeeklyData({ showLoading: false, showErrors: false }),
	);

	const displayRows = useMemo(() => {
		const sortedAsc = [...weeks].sort(
			(a, b) => dayjs(a.weekStart).valueOf() - dayjs(b.weekStart).valueOf(),
		);

		const withVariance = sortedAsc.map((entry, index) => {
			const previous = index > 0 ? sortedAsc[index - 1] : undefined;
			return {
				...entry,
				previousDistance: previous?.distance ?? null,
				previousDuration: previous?.duration ?? null,
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
				<WeeklyOverviewSkeleton
					isDarkMode={isDarkMode}
					rows={weeklyOverviewSkeletonIds}
				/>
			) : displayRows.length === 0 ? (
				<Text text="No weekly data available yet." />
			) : (
				<>
					<div className="space-y-3 sm:hidden">
						{displayRows.map((week) => (
							<div
								key={week.weekStart}
								className="space-y-3 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 dark:border-gray-800"
							>
								<div>
									<span
										className={cn(
											"text-xs font-semibold uppercase tracking-wide",
											isDarkMode ? "text-gray-400" : "text-gray-600",
										)}
									>
										Week
									</span>
									<p className="mt-1 text-sm font-medium">
										{formatWeekLabel(week.weekStart)}
									</p>
								</div>
								<div className="grid gap-4 min-[360px]:grid-cols-2">
									<div>
										<span
											className={cn(
												"text-xs font-semibold uppercase tracking-wide",
												isDarkMode ? "text-gray-400" : "text-gray-600",
											)}
										>
											Distance
										</span>
										<div className="mt-1">
											<ValueTrend
												value={formatDistance(week.distance)}
												formatter={formatDistance}
												difference={week.distanceVariance}
												percentageBase={week.previousDistance}
												className="flex-col items-start gap-1"
												valueClassName="whitespace-nowrap"
												trendClassName="whitespace-nowrap"
												showArrows
											/>
										</div>
									</div>
									<div>
										<span
											className={cn(
												"text-xs font-semibold uppercase tracking-wide",
												isDarkMode ? "text-gray-400" : "text-gray-600",
											)}
										>
											Time
										</span>
										<div className="mt-1">
											<ValueTrend
												value={formatDuration(Math.round(week.duration))}
												formatter={formatDuration}
												difference={week.durationVariance}
												percentageBase={week.previousDuration}
												className="flex-col items-start gap-1"
												valueClassName="whitespace-nowrap"
												trendClassName="whitespace-nowrap"
											/>
										</div>
									</div>
								</div>
							</div>
						))}
					</div>
					<div className="hidden overflow-x-auto sm:block">
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
												percentageBase={week.previousDistance}
												showArrows
											/>
										</td>
										<td className="px-3 py-2 text-left">
											<ValueTrend
												value={formatDuration(Math.round(week.duration))}
												formatter={formatDuration}
												difference={week.durationVariance}
												percentageBase={week.previousDuration}
											/>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</>
			)}
		</Box>
	);
};
