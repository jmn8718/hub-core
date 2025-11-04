import {
	DailyActivitySummary,
	MonthlyActivityChart,
	WeeklyOverviewList,
} from "../components/index.js";

export const Home = () => {
	return (
		<div className="space-y-4">
			<DailyActivitySummary />
			<MonthlyActivityChart />
			<WeeklyOverviewList />
		</div>
	);
};
