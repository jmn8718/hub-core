import { type IOverviewData, Providers, StorageKeys } from "@repo/types";
import { useCallback, useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { MonthlyActivityChart, ProviderCardSync } from "../components/index.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useLoading } from "../contexts/LoadingContext.js";
import { useStore } from "../contexts/StoreContext.js";

export const Home = () => {
	const { setLocalLoading } = useLoading();
	const { client } = useDataClient();
	const { getValue } = useStore();
	const [availableProviders, setAvailableProviders] = useState<Providers[]>([]);

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

	const onSyncDone = () => {
		return fetchData();
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		fetchData();
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
	return (
		<>
			{availableProviders.length > 0 && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl min-w-full mx-auto mb-4">
					{availableProviders.map((provider) => (
						<ProviderCardSync
							key={provider}
							provider={provider}
							onSyncDone={onSyncDone}
						/>
					))}
				</div>
			)}
			<MonthlyActivityChart data={overviewData} />
		</>
	);
};
