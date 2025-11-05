import { useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { Box, DailyActivityStats, Text } from "../components/index.js";
import { useDataClient } from "../contexts/DataClientContext.js";

type DailyStats = {
	distance: number;
	duration: number;
	activeDays: number;
};

export function HomeStatsSection() {
	const { client } = useDataClient();
	const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const loadStats = async () => {
			setIsLoading(true);
			try {
				const result = await client.getDailyOverview({
					periodType: "days",
					periodCount: 30,
				});

				if (result.success) {
					const aggregated = result.data.reduce<DailyStats>(
						(acc, entry) => ({
							distance: acc.distance + entry.distance,
							duration: acc.duration + entry.duration,
							activeDays: acc.activeDays + (entry.distance > 0 ? 1 : 0),
						}),
						{ distance: 0, duration: 0, activeDays: 0 },
					);
					setDailyStats(aggregated);
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
		};

		loadStats();
	}, [client]);

	return (
		<Box>
			{isLoading ? (
				<Text text="Loading last 30 days…" />
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
