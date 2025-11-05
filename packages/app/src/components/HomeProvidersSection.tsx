import { Providers, StorageKeys } from "@repo/types";
import { useEffect, useState } from "react";
import { useStore } from "../contexts/StoreContext.js";
import { ProviderCardSync } from "./providers/CardSync.js";

export function HomeProvidersSection() {
	const { getValue } = useStore();
	const [availableProviders, setAvailableProviders] = useState<Providers[]>([]);

	useEffect(() => {
		const resolveProviders = async () => {
			const [hasCoros, hasGarmin] = await Promise.all([
				getValue(StorageKeys.COROS_CREDENTIALS),
				getValue(StorageKeys.GARMIN_CREDENTIALS),
			]);
			const foundProviders: Providers[] = [];
			if (hasCoros) {
				foundProviders.push(Providers.COROS);
			}
			if (hasGarmin) {
				foundProviders.push(Providers.GARMIN);
			}
			setAvailableProviders(foundProviders);
		};

		resolveProviders();
	}, [getValue]);

	if (availableProviders.length === 0) {
		return null;
	}

	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
			{availableProviders.map((provider) => (
				<ProviderCardSync key={provider} provider={provider} />
			))}
		</div>
	);
}
