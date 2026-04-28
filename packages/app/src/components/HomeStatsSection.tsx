import type { IDailyOverviewData } from "@repo/types";
import { cn } from "@repo/ui";
import { useCallback, useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { Box, DailyActivityStats, Text } from "../components/index.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useTheme } from "../contexts/index.js";
import { useWebCachedReadRefresh } from "../hooks/useWebCachedReadRefresh.js";

type DailyStats = {
	distance: number;
	duration: number;
	activeDays: number;
};

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

const HomeStatsSkeleton = ({ isDarkMode }: { isDarkMode: boolean }) => (
	<div
		className="flex min-w-0 flex-col gap-4 px-2 py-2 sm:px-4"
		aria-hidden="true"
	>
		<div className="flex min-w-0 flex-col gap-2">
			<SkeletonBlock className="h-6 w-28" isDarkMode={isDarkMode} />
			<SkeletonBlock className="h-16 w-full max-w-72" isDarkMode={isDarkMode} />
		</div>
		<div className="grid min-w-0 gap-4 sm:grid-cols-2 sm:gap-6">
			<div className="flex flex-col gap-2">
				<SkeletonBlock className="h-6 w-20" isDarkMode={isDarkMode} />
				<SkeletonBlock className="h-10 w-32" isDarkMode={isDarkMode} />
			</div>
			<div className="flex flex-col gap-2">
				<SkeletonBlock className="h-6 w-20" isDarkMode={isDarkMode} />
				<SkeletonBlock className="h-10 w-20" isDarkMode={isDarkMode} />
			</div>
		</div>
	</div>
);

export function HomeStatsSection({
	refreshToken,
}: {
	refreshToken?: number;
}) {
	const { client } = useDataClient();
	const { isDarkMode } = useTheme();
	const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const loadStats = useCallback(
		async ({
			showLoading = true,
			showErrors = true,
		}: {
			showLoading?: boolean;
			showErrors?: boolean;
		} = {}) => {
			if (showLoading) {
				setIsLoading(true);
			}
			try {
				const result = await client.getDailyOverview({
					periodType: "days",
					periodCount: 30,
				});

				if (result.success) {
					const aggregated = result.data.reduce<DailyStats>(
						(acc: DailyStats, entry: IDailyOverviewData) => ({
							distance: acc.distance + entry.distance,
							duration: acc.duration + entry.duration,
							activeDays: acc.activeDays + (entry.distance > 0 ? 1 : 0),
						}),
						{ distance: 0, duration: 0, activeDays: 0 },
					);
					setDailyStats(aggregated);
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
				}
			}
		},
		[client],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		void loadStats();
	}, [loadStats, refreshToken]);

	useWebCachedReadRefresh(["getDailyOverview"], () =>
		loadStats({ showLoading: false, showErrors: false }),
	);

	return (
		<Box>
			{isLoading ? (
				<HomeStatsSkeleton isDarkMode={isDarkMode} />
			) : !dailyStats ? (
				<Text text="No activity data available for the last 30 days." />
			) : (
				<DailyActivityStats
					totalDistance={dailyStats.distance}
					totalDuration={dailyStats.duration}
					activeDays={dailyStats.activeDays}
				/>
			)}
		</Box>
	);
}
