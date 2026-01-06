import { useCallback, useState } from "react";
import {
	HomeProvidersSection,
	HomeStatsSection,
	WeeklyOverviewList,
} from "../components/index.js";

export const Home = () => {
	const [refreshToken, setRefreshToken] = useState(0);

	const handleProviderSync = useCallback(() => {
		setRefreshToken((current) => current + 1);
	}, []);

	return (
		<div className="space-y-4 max-w-2xl min-w-full">
			<HomeProvidersSection onSyncDone={handleProviderSync} />
			<HomeStatsSection refreshToken={refreshToken} />
			<WeeklyOverviewList limit={2} refreshToken={refreshToken} />
		</div>
	);
};
