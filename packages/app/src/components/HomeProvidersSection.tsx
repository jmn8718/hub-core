import { AppType, Providers, StorageKeys } from "@repo/types";
import { useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useStore } from "../contexts/StoreContext.js";
import { ProviderCardSync } from "./providers/CardSync.js";

export function HomeProvidersSection({
	onSyncDone,
}: {
	onSyncDone?: () => void;
}) {
	const { getValue } = useStore();
	const { client, type } = useDataClient();
	const [availableProviders, setAvailableProviders] = useState<Providers[]>([]);

	useEffect(() => {
		const resolveProviders = async () => {
			try {
				if (type === AppType.WEB) {
					const result = await client.getConfiguredProviders();
					if (!result.success) {
						throw new Error(result.error);
					}
					setAvailableProviders(result.data.providers);
					return;
				}

				const [hasCoros, hasGarmin, hasStrava] = await Promise.all([
					getValue(StorageKeys.COROS_CREDENTIALS),
					getValue(StorageKeys.GARMIN_CREDENTIALS),
					getValue(StorageKeys.STRAVA_CREDENTIALS),
				]);
				const foundProviders: Providers[] = [];
				if (hasCoros) {
					foundProviders.push(Providers.COROS);
				}
				if (hasGarmin) {
					foundProviders.push(Providers.GARMIN);
				}
				if (hasStrava) {
					foundProviders.push(Providers.STRAVA);
				}
				setAvailableProviders(foundProviders);
			} catch (error) {
				toast.error((error as Error).message, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			}
		};

		void resolveProviders();
	}, [client, getValue, type]);

	if (availableProviders.length === 0) {
		return null;
	}

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			{availableProviders.map((provider) => (
				<ProviderCardSync
					key={provider}
					provider={provider}
					onSyncDone={onSyncDone}
				/>
			))}
		</div>
	);
}
