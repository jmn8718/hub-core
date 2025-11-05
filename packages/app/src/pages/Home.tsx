import {
	HomeProvidersSection,
	HomeStatsSection,
	WeeklyOverviewList,
} from "../components/index.js";

export const Home = () => {
	return (
		<div className="space-y-4 max-w-2xl min-w-full">
			<HomeProvidersSection />
			<HomeStatsSection />
			<WeeklyOverviewList limit={2} />
		</div>
	);
};
