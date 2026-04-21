import { useCallback, useEffect, useRef } from "react";
import {
	DailyActivitySummary,
	MonthlyActivityChart,
	WeeklyDistanceChart,
	WeeklyOverviewList,
} from "../components/index.js";
import { useLoading } from "../contexts/index.js";

export const Home = () => {
	const { setGlobalLoading } = useLoading();
	const activeLoadersRef = useRef(new Set<string>());

	const handleLoadingChange = useCallback(
		(key: string, isLoading: boolean) => {
			if (isLoading) {
				activeLoadersRef.current.add(key);
				setGlobalLoading(true);
				return;
			}

			activeLoadersRef.current.delete(key);
			if (activeLoadersRef.current.size === 0) {
				setGlobalLoading(false);
			}
		},
		[setGlobalLoading],
	);
	const handleDailyLoading = useCallback(
		(isLoading: boolean) => handleLoadingChange("daily", isLoading),
		[handleLoadingChange],
	);
	const handleWeeklyOverviewLoading = useCallback(
		(isLoading: boolean) => handleLoadingChange("weekly-overview", isLoading),
		[handleLoadingChange],
	);
	const handleWeeklyDistanceLoading = useCallback(
		(isLoading: boolean) => handleLoadingChange("weekly-distance", isLoading),
		[handleLoadingChange],
	);
	const handleMonthlyLoading = useCallback(
		(isLoading: boolean) => handleLoadingChange("monthly", isLoading),
		[handleLoadingChange],
	);

	useEffect(() => {
		return () => {
			activeLoadersRef.current.clear();
			setGlobalLoading(false);
		};
	}, [setGlobalLoading]);

	return (
		<div className="space-y-4">
			<DailyActivitySummary onLoadingChange={handleDailyLoading} />
			<WeeklyOverviewList onLoadingChange={handleWeeklyOverviewLoading} />
			<WeeklyDistanceChart onLoadingChange={handleWeeklyDistanceLoading} />
			<MonthlyActivityChart onLoadingChange={handleMonthlyLoading} />
		</div>
	);
};
