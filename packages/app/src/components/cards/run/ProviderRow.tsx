// import { Bounce, toast } from 'react-toastify';
import { Providers } from "@repo/types";
import { cn } from "@repo/ui";
import {
	Download,
	MonitorCheck,
	MonitorOff,
	Upload,
	UserPen,
} from "lucide-react";
import { type FC, useEffect, useState } from "react";
import { useLoading } from "../../../contexts/LoadingContext.js";
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

const GARMIN_ACTIVITY_URL = (activityId: string) =>
	`https://connect.garmin.com/modern/activity/${activityId}`;
const COROS_ACTIVITY_URL = (activityId: string) =>
	`https://training.coros.com/activity-detail?labelId=${activityId}&sportType=100`;

const generateExternalLink = (activityId: string, provider: Providers) => {
	switch (provider) {
		case Providers.COROS:
			return COROS_ACTIVITY_URL(activityId);
		case Providers.GARMIN:
			return GARMIN_ACTIVITY_URL(activityId);
		default:
			throw new Error(`Invalid provider ${provider}`);
	}
};

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
	const [loading, setLoading] = useState(false);
	const [hasDownloadFile, setHasDownloadFile] = useState(false);

	const onProviderClick = async () => {
		if (!connectionId) return;
		// const url = generateExternalLink(connectionId, provider);
		// await window.electron.ipcRenderer.invoke(Channels.OPEN_LINK, url);
	};

	const checkIsExported = async () => {
		if (!connectionId) return;
		// const result = (await window.electron.ipcRenderer.invoke(
		//   Channels.FILE_EXISTS,
		//   provider,
		//   connectionId,
		// )) as { exitsFile: boolean };
		// if (result.exitsFile) {
		//   setHasDownloadFile(true);
		// } else {
		//   // handle error
		// }
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		checkIsExported();
	}, []);

	const handleManualUpload = async () => {
		if (provider !== Providers.GARMIN) return;
		setLocalLoading(true);
		setLoading(true);
		// const result = (await window.electron.ipcRenderer.invoke(
		//   Channels.PROVIDER_ACTIVITY_EXPORT_MANUAL,
		//   {
		//     activityId,
		//     providerTarget: Providers.GARMIN,
		//   },
		// )) as ProviderIpcResponse;
		// if (!result.success) {
		//   // handle error
		//   toast.error(result.error, {
		//     transition: Bounce,
		//   });
		// } else {
		//   toast.success('Exported successfully', {
		//     transition: Bounce,
		//   });
		// }
		setLocalLoading(false);
		setLoading(false);
		refreshData();
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const handleUpload = async () => {
		setLocalLoading(true);
		setLoading(true);
		// const result = (await window.electron.ipcRenderer.invoke(
		//   Channels.PROVIDER_ACTIVITY_EXPORT,
		//   {
		//     provider,
		//     activityId: connectionId,
		//     target:
		//       provider === Providers.COROS ? Providers.GARMIN : Providers.COROS,
		//   },
		// )) as ProviderIpcResponse;
		// if (!result.success) {
		//   // handle error
		//   toast.error(result.error, {
		//     transition: Bounce,
		//   });
		// } else {
		//   toast.success('Upload completed', {
		//     transition: Bounce,
		//   });
		// }
		setLocalLoading(false);
		setLoading(false);
		refreshData();
	};

	const handleDownload = async () => {
		setLocalLoading(true);
		setLoading(true);
		// const result = (await window.electron.ipcRenderer.invoke(
		//   Channels.PROVIDER_ACTIVITY_DOWNLOAD,
		//   provider,
		//   connectionId,
		// )) as ProviderIpcResponse;
		// if (!result.success) {
		//   // handle error
		//   toast.error(result.error, {
		//     transition: Bounce,
		//   });
		// } else {
		//   toast.success('Download completed', {
		//     transition: Bounce,
		//   });
		// }
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
				])}
			>
				{provider}
			</span>
			<div className="flex items-center gap-2">
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
