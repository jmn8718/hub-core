import {
	DailyActivitySummary,
	MonthlyActivityChart,
	WeeklyDistanceChart,
	WeeklyOverviewList,
} from "../components/index.js";

export const Home = () => {
	return (
		<div className="space-y-4">
			<DailyActivitySummary />
			<WeeklyOverviewList />
			<WeeklyDistanceChart />
			<MonthlyActivityChart />
		</div>
	);
};
