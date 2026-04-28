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
	onSyncDone?: () => void;
}

export const ProviderCardSync: React.FC<ProviderCardSync> = ({
	provider,
	onSyncDone,
}) => {
	const { colors, isDarkMode } = useTheme();
	const { client } = useDataClient();
	const { getValue, setValue } = useStore();
	const { setLocalLoading } = useLoading();
	const [isLoading, setIsLoading] = useState(true);
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

	const skeletonClass = cn(
		"animate-pulse rounded-md",
		isDarkMode ? "bg-gray-700" : "bg-gray-200",
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const getFromStore = async () => {
			setIsLoading(true);
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
			setIsLoading(false);
		};
		void getFromStore();
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
			toast.success(`${provider} sync complete.`, { transition: Bounce });
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
			if (onSyncDone) {
				onSyncDone();
			}
		}, 500);
	};

	if (isLoading) {
		return (
			<Box>
				<div className="flex items-center justify-between">
					<div className="flex-1 space-y-3">
						<div className={cn("h-7 w-24", skeletonClass)} />
						<div className={cn("h-6 w-40", skeletonClass)} />
					</div>
					<div className={cn("h-11 w-11 rounded-lg", skeletonClass)} />
				</div>
			</Box>
		);
	}

	return (
		<Box>
			<div className="flex items-center justify-between">
				<div className="flex-1 space-y-2">
					<H2 text={provider} classes="font-semibold capitalize" />
					<p className={cn("text-lg", colors.description)}>
						{data.lastSync
							? `Last synced ${formatRelativeTime(data.lastSync)}`
							: "No sync yet"}
					</p>
				</div>
				<button
					type="button"
					disabled={data.isSyncing || !data.hasValidData}
					onClick={onSync}
					aria-label={
						data.isSyncing ? `Syncing ${provider}` : `Sync ${provider}`
					}
					className={cn(
						"inline-flex min-h-11 items-center justify-center rounded-lg border px-4 py-3 text-sm font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 self-center",
						colors.buttonPrimary,
					)}
				>
					<RefreshCw
						size={20}
						className={cn("", data.isSyncing ? "animate-spin" : "")}
					/>
					<span className="sr-only">
						{data.isSyncing ? `Syncing ${provider}` : `Sync ${provider}`}
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
