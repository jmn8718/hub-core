import { type IOverviewData, Providers } from "@repo/types";
import { useCallback, useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { MonthlyActivityChart, ProviderSync } from "../components/index.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useLoading } from "../contexts/LoadingContext.js";

export const Home = () => {
	const { setLocalLoading } = useLoading();
	const { client } = useDataClient();

	const [overviewData, setOverviewData] = useState<IOverviewData[]>([]);

	const fetchData = useCallback(async () => {
		setLocalLoading(true);
		const result = await client.getDataOverview({ limit: 12 });
		if (result.success) {
			setOverviewData(result.data);
		} else {
			toast.error(result.error, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}
		setTimeout(() => {
			setLocalLoading(false);
		}, 500);
	}, [setLocalLoading, client]);

	const onSyncDone = () => {
		return fetchData();
	};

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	return (
		<>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl min-w-full mx-auto mb-4">
				<ProviderSync
					id={Providers.GARMIN}
					title="Garmin"
					onSyncDone={onSyncDone}
				/>
				<ProviderSync
					id={Providers.COROS}
					title="Coros"
					onSyncDone={onSyncDone}
				/>
			</div>
			<MonthlyActivityChart data={overviewData} />
		</>
	);
};
