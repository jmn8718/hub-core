import { formatRelativeTime } from "@repo/dates";
import { AppType, type Providers, StorageKeys } from "@repo/types";
import { FolderSync, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useDataClient, useLoading, useStore } from "../../contexts/index.js";
import { Box } from "../Box.js";
import { ActionButton } from "./ActionButton.js";
import { useProviderSyncActions } from "./useProviderSyncActions.js";

const getProviderStorageKey = (
	provider: Providers,
	suffix: "VALIDATED" | "LAST_SYNC",
): StorageKeys =>
	StorageKeys[
		`${provider}_${suffix}` as keyof typeof StorageKeys
	] as StorageKeys;

export function ProviderSyncActionsSection({
	provider,
	stateVersion = 0,
}: {
	provider: Providers;
	stateVersion?: number;
}) {
	const { client, type } = useDataClient();
	const { setLocalLoading } = useLoading();
	const { getValue, setValue } = useStore();
	const [isReady, setIsReady] = useState(type === AppType.WEB);
	const [lastSync, setLastSync] = useState("");

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const loadState = async () => {
			const storedLastSync =
				(await getValue<string>(
					getProviderStorageKey(provider, "LAST_SYNC"),
				)) || "";
			setLastSync(storedLastSync);

			if (type === AppType.WEB) {
				setIsReady(true);
				return;
			}

			const validated = await getValue<boolean>(
				getProviderStorageKey(provider, "VALIDATED"),
			);
			setIsReady(Boolean(validated));
		};

		void loadState();
	}, [getValue, provider, stateVersion, type]);

	const { handlePullGear, handleSync, handleSyncLatest } =
		useProviderSyncActions({
			provider,
			validationStatus: isReady ? "success" : "pending",
			client,
			setLocalLoading,
			setValue,
		});

	return (
		<Box
			title="Sync Activities and Gears"
			description={
				lastSync ? `Last synced ${formatRelativeTime(lastSync)}` : "No sync yet"
			}
		>
			<div className="flex flex-wrap gap-4 items-center">
				<ActionButton
					icon={<FolderSync size={20} />}
					onClick={handlePullGear}
					text="Sync Gears"
					disabled={!isReady}
				/>
				<ActionButton
					icon={<RefreshCw size={20} />}
					onClick={handleSyncLatest}
					text="Sync Latest Activities"
					disabled={!isReady}
				/>
				<ActionButton
					icon={<RefreshCw size={20} />}
					onClick={handleSync}
					text="Sync All Activities"
					disabled={!isReady}
				/>
			</div>
		</Box>
	);
}
