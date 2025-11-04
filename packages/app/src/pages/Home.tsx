import { Providers, StorageKeys } from "@repo/types";
import { cn } from "@repo/ui";
import { useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import {
	Box,
	DailyActivityStats,
	ProviderCardSync,
} from "../components/index.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useStore } from "../contexts/StoreContext.js";
import { useTheme } from "../contexts/ThemeContext.js";

export const Home = () => {
	const { getValue } = useStore();
	const { client } = useDataClient();
	const { isDarkMode } = useTheme();
	const [availableProviders, setAvailableProviders] = useState<Providers[]>([]);
	const [dailyStats, setDailyStats] = useState<{
		distance: number;
		duration: number;
		activeDays: number;
	} | null>(null);
	const [isLoadingStats, setIsLoadingStats] = useState(true);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		getValue(StorageKeys.COROS_CREDENTIALS).then((value) => {
			if (value) {
				setAvailableProviders((current) => {
					if (current.includes(Providers.COROS)) return current;
					return [...current, Providers.COROS];
				});
			}
		});
		getValue(StorageKeys.GARMIN_CREDENTIALS).then((value) => {
			if (value) {
				setAvailableProviders((current) => {
					if (current.includes(Providers.GARMIN)) return current;
					return [...current, Providers.GARMIN];
				});
			}
		});
	}, []);

	useEffect(() => {
		let isMounted = true;
		setIsLoadingStats(true);
		client
			.getDailyOverview({ periodType: "days", periodCount: 30 })
			.then((result) => {
				if (!isMounted) return;
				if (result.success) {
					const stats = result.data.reduce(
						(acc, entry) => {
							return {
								distance: acc.distance + entry.distance,
								duration: acc.duration + entry.duration,
								activeDays: acc.activeDays + (entry.distance > 0 ? 1 : 0),
							};
						},
						{ distance: 0, duration: 0, activeDays: 0 },
					);
					setDailyStats(stats);
				} else {
					toast.error(result.error, {
						hideProgressBar: false,
						closeOnClick: false,
						transition: Bounce,
					});
				}
			})
			.catch((err: unknown) => {
				if (!isMounted) return;
				toast.error((err as Error).message, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			})
			.finally(() => {
				if (!isMounted) return;
				setIsLoadingStats(false);
			});
		return () => {
			isMounted = false;
		};
	}, [client]);

	const subtleTextClass = isDarkMode ? "text-gray-400" : "text-gray-500";
	return (
		<div className="space-y-4 max-w-2xl min-w-full">
			{availableProviders.length > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl min-w-full mx-auto mb-4">
					{availableProviders.map((provider) => (
						<ProviderCardSync key={provider} provider={provider} />
					))}
				</div>
			)}
			<div className="max-w-2xl min-w-full">
				{isLoadingStats ? (
					<p className={cn("text-sm", subtleTextClass)}>
						Loading last 30 days…
					</p>
				) : dailyStats ? (
					<Box>
						<DailyActivityStats
							totalDistance={dailyStats.distance}
							totalDuration={dailyStats.duration}
							activeDays={dailyStats.activeDays}
						/>
					</Box>
				) : (
					<p className={cn("text-sm", subtleTextClass)}>
						No activity data available for the last 30 days.
					</p>
				)}
			</div>
		</div>
	);
};
