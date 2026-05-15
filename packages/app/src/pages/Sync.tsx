import { AppType } from "@repo/types";
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Box, CloudSyncSection } from "../components/index.js";
import { Routes } from "../constants.js";
import { useDataClient } from "../contexts/index.js";

export function Sync() {
	const { client, type } = useDataClient();
	const [isConfigured, setIsConfigured] = useState(type === AppType.DESKTOP);

	useEffect(() => {
		let cancelled = false;
		if (type !== AppType.DESKTOP) {
			setIsConfigured(false);
			return;
		}

		void client.getCloudSyncStatus().then((result) => {
			if (cancelled) {
				return;
			}
			setIsConfigured(Boolean(result.success && result.data.configured));
		});

		return () => {
			cancelled = true;
		};
	}, [client, type]);

	if (!isConfigured) {
		return <Navigate to={Routes.SETTINGS} replace />;
	}

	return (
		<Box description="Review desktop cloud sync status, run a manual sync, or sign out of the active cloud session.">
			<CloudSyncSection />
		</Box>
	);
}
