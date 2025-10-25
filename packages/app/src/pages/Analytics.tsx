import type { IOverviewData } from "@repo/types";
import { useCallback, useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { MonthlyActivityChart } from "../components/index.js";
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
			setOverviewData(result.data.reverse());
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

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		fetchData();
	}, []);
	return <MonthlyActivityChart data={overviewData} />;
};
