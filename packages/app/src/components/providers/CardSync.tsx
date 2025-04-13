import type React from "react";
import { useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";

import { formatRelativeTime } from "@repo/dates";
import { type Providers, StorageKeys } from "@repo/types";
import { cn } from "@repo/ui";
import { AlertCircle, RefreshCw } from "lucide-react";
import {
	useDataClient,
	useLoading,
	useStore,
	useTheme,
} from "../../contexts/index.js";
import { Box } from "../Box.js";
import { H2 } from "../H2.js";

interface ProviderCardSync {
	provider: Providers;
	onSyncDone: () => void;
}

export const ProviderCardSync: React.FC<ProviderCardSync> = ({
	provider,
	onSyncDone,
}) => {
	const { isDarkMode } = useTheme();
	const { client } = useDataClient();
	const { getValue, setValue } = useStore();
	const { setLocalLoading } = useLoading();
	const [data, setData] = useState<{
		hasValidData: boolean;
		lastSync: string;
		isSyncing: boolean;
		error: string;
	}>({
		hasValidData: false,
		lastSync: "",
		isSyncing: false,
		error: "",
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const getFromStore = async () => {
			setLocalLoading(true);
			try {
				const [storeLastSync, storeValidated] = await Promise.all([
					getValue<string>(StorageKeys[`${provider}_LAST_SYNC`]),
					getValue<boolean>(StorageKeys[`${provider}_VALIDATED`]),
				]);
				setData({
					lastSync: storeLastSync || "",
					isSyncing: false,
					hasValidData: !!storeValidated,
					error: "",
				});
			} catch (err) {
				console.error(err);
				const message = (err as Error).message;
				toast.error(message, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
				setData((current) => ({
					...current,
					error: message,
				}));
			}
			setTimeout(() => {
				setLocalLoading(false);
			}, 300);
		};
		getFromStore();
	}, [provider]);

	const onSync = async () => {
		setLocalLoading(true);
		setData((current) => ({
			...current,
			isSyncing: true,
		}));

		const result = await client.providerSync(provider);

		if (result.success) {
			const syncDate = new Date().toISOString();
			setValue(StorageKeys[`${provider}_LAST_SYNC`], syncDate);
			setData((current) => ({
				...current,
				error: "",
				lastSync: syncDate,
				isSyncing: false,
			}));
			toast.success("Synced completed", { transition: Bounce });
		} else {
			toast.error(result.error, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
			setData((current) => ({
				...current,
				error: result.error,
				isSyncing: false,
			}));
		}
		setTimeout(() => {
			onSyncDone();
		}, 500);
	};
	return (
		<Box>
			<div className="flex items-center justify-between">
				<div className="flex-1 space-y-2">
					<H2 text={provider} classes="font-semibold capitalize" />
					<p
						className={cn(
							"text-lg",
							isDarkMode ? "text-gray-300" : "text-gray-600",
						)}
					>
						{data.lastSync
							? `Last synchronized ${formatRelativeTime(data.lastSync)}`
							: "No synchronization data available"}
					</p>
				</div>
				<button
					type="button"
					disabled={data.isSyncing || !data.hasValidData}
					onClick={onSync}
					className={cn(
						`inline-flex items-center px-4 py-3 rounded-lg
            text-white font-medium text-sm
            focus:outline-none focus:ring-2 focus:ring-offset-2
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            self-center`,
						isDarkMode
							? "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
							: "bg-blue-500 hover:bg-blue-600 focus:ring-blue-400",
					)}
				>
					<RefreshCw
						size={20}
						className={cn("", data.isSyncing ? "animate-spin" : "")}
					/>
					<span className="sr-only">
						{data.isSyncing ? "Syncing..." : "Sync Now"}
					</span>
				</button>
			</div>
			{data.error && (
				<div className="flex items-center gap-2 mt-2 text-red-500">
					<AlertCircle size={16} />
					<span className="text-sm">{data.error}</span>
				</div>
			)}
		</Box>
	);
};
