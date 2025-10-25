import { Providers, StorageKeys } from "@repo/types";
import { useEffect, useState } from "react";
import { ProviderCardSync } from "../components/index.js";
import { useStore } from "../contexts/StoreContext.js";

export const Home = () => {
	const { getValue } = useStore();
	const [availableProviders, setAvailableProviders] = useState<Providers[]>([]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
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
						<ProviderCardSync key={provider} provider={provider} />
					))}
				</div>
			)}
		</>
	);
};
