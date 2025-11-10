import { Providers, StorageKeys } from "@repo/types";
import { cn } from "@repo/ui";
import {
	Download,
	MonitorCheck,
	MonitorOff,
	Upload,
	UserPen,
} from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useDataClient } from "../../../contexts/DataClientContext.js";
import { useLoading } from "../../../contexts/LoadingContext.js";
import { useStore } from "../../../contexts/StoreContext.js";
import { generateExternalLink } from "../../../utils/providers.js";
import IconButton from "../../IconButton.js";

interface ProviderRowProps {
	hasConnection: boolean;
	// eslint-disable-next-line react/require-default-props
	connectionId?: string;
	activityId: string;
	provider: Providers;
	isOriginalSource: boolean;
	hasBeenExported: boolean;
	refreshData: () => void;
}

const ProviderRow: FC<ProviderRowProps> = ({
	activityId,
	hasConnection,
	connectionId,
	provider,
	isOriginalSource,
	hasBeenExported,
	refreshData,
}) => {
	const { setLocalLoading } = useLoading();
	const { client } = useDataClient();
	const { getValue } = useStore();
	const [loading, setLoading] = useState(false);
	const [hasDownloadFile, setHasDownloadFile] = useState(false);

	const onProviderClick = async () => {
		if (!connectionId) return;
		try {
			const url = generateExternalLink(provider, connectionId);
			await client.openLink(url);
		} catch (err) {
			toast.error((err as Error).message, {
				transition: Bounce,
			});
		}
	};

	const checkIsExported = async () => {
		if (!connectionId) return;
		const downloadsFolder = await getValue<string>(StorageKeys.DOWNLOAD_FOLDER);
		if (!downloadsFolder) return;
		const result = await client.existsFile({
			provider,
			activityId: connectionId,
		});
		if (result.success) {
			if (result.data.exists) setHasDownloadFile(true);
		} else {
			toast.error(result.error, {
				transition: Bounce,
			});
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		checkIsExported();
	}, []);

	const handleManualUpload = async () => {
		// if it is coros or we have the activity, we do nothing
		if (provider === Providers.COROS || connectionId) return;
		if (provider !== Providers.GARMIN) return;
		setLocalLoading(true);
		setLoading(true);

		const result = await client.exportActivityManual({
			target: provider,
			activityId,
		});
		if (!result.success) {
			toast.error(result.error, {
				transition: Bounce,
			});
		} else {
			toast.success("Manual upload completed", {
				transition: Bounce,
			});
		}

		setLocalLoading(false);
		setLoading(false);
		refreshData();
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const handleUpload = async () => {
		if (!connectionId) return;
		const downloadsFolder = await getValue<string>(StorageKeys.DOWNLOAD_FOLDER);
		if (!downloadsFolder) return;
		setLocalLoading(true);
		setLoading(true);

		const result = await client.uploadActivityFile({
			provider,
			target: provider === Providers.COROS ? Providers.GARMIN : Providers.COROS,
			providerActivityId: connectionId,
			downloadPath: downloadsFolder,
		});
		if (!result.success) {
			toast.error(result.error, {
				transition: Bounce,
			});
		} else {
			toast.success("Upload completed", {
				transition: Bounce,
			});
		}
		setLocalLoading(false);
		setLoading(false);
		refreshData();
	};

	const handleDownload = async () => {
		if (!connectionId) return;
		const downloadsFolder = await getValue<string>(StorageKeys.DOWNLOAD_FOLDER);
		if (!downloadsFolder) return;

		setLocalLoading(true);
		setLoading(true);

		const result = await client.downloadActivityFile({
			provider,
			providerActivityId: connectionId,
			downloadPath: downloadsFolder,
		});
		if (!result.success) {
			toast.error(result.error, {
				transition: Bounce,
			});
		} else {
			toast.success("Download completed", {
				transition: Bounce,
			});
		}

		checkIsExported();
		setLocalLoading(false);
		setLoading(false);
		refreshData();
	};
	return (
		<div className="flex flex-row items-center">
			{hasConnection ? (
				<MonitorCheck color="green" />
			) : (
				<MonitorOff color="gray" />
			)}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
			<span
				onClick={onProviderClick}
				className={cn([
					connectionId && "cursor-pointer",
					"mx-2 px-3 w-[80px] flex justify-center py-1 rounded-full text-sm uppercase",
					provider === Providers.COROS && "bg-blue-100 text-blue-800",
					provider === Providers.GARMIN && "bg-orange-100 text-orange-800",
					provider === Providers.STRAVA && "bg-red-100 text-red-800",
				])}
			>
				{provider}
			</span>
			<div className="hidden md:flex items-center gap-2">
				{hasConnection && isOriginalSource && (
					<IconButton
						icon={<Download size={16} />}
						label="Download activity"
						onClick={handleDownload}
						disabled={hasDownloadFile || loading}
					/>
				)}
				{!hasBeenExported && (
					<IconButton
						icon={<Upload size={16} />}
						label="Upload activity"
						onClick={handleUpload}
						disabled={!hasDownloadFile || loading}
					/>
				)}
				{!hasConnection && provider === Providers.GARMIN && (
					<IconButton
						icon={<UserPen size={16} />}
						label="Manual upload"
						onClick={handleManualUpload}
						disabled={loading}
					/>
				)}
			</div>
		</div>
	);
};

export default ProviderRow;
