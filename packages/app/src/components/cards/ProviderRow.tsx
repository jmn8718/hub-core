import { ActivityType, Providers, StorageKeys } from "@repo/types";
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
import { useDataClient } from "../../contexts/DataClientContext.js";
import { useLoading } from "../../contexts/LoadingContext.js";
import { useStore } from "../../contexts/StoreContext.js";
import { generateExternalLink } from "../../utils/providers.js";
import IconButton from "../IconButton.js";

const fileExistsCache = new Map<string, boolean | Promise<boolean>>();

const getFileCacheKey = (provider: Providers, activityId: string) =>
	`${provider}:${activityId}`;

const invalidateFileExists = (provider: Providers, activityId: string) => {
	fileExistsCache.delete(getFileCacheKey(provider, activityId));
};

interface ProviderRowProps {
	hasConnection: boolean;
	// eslint-disable-next-line react/require-default-props
	connectionId?: string;
	activityId: string;
	activityType: ActivityType;
	provider: Providers;
	isOriginalSource: boolean;
	hasBeenExported: boolean;
	uploadCandidates: { provider: Providers; activityId: string }[];
	refreshData: () => void;
}

const ProviderRow: FC<ProviderRowProps> = ({
	activityId,
	activityType,
	hasConnection,
	connectionId,
	provider,
	isOriginalSource,
	hasBeenExported,
	uploadCandidates,
	refreshData,
}) => {
	const { setLocalLoading } = useLoading();
	const { client } = useDataClient();
	const { getValue } = useStore();
	const [loading, setLoading] = useState(false);
	const [hasDownloadFile, setHasDownloadFile] = useState(false);
	const [availableUploadSource, setAvailableUploadSource] = useState<{
		provider: Providers;
		activityId: string;
	} | null>(null);
	const uploadCandidatesKey = uploadCandidates
		.map((candidate) => `${candidate.provider}:${candidate.activityId}`)
		.join("|");
	const canDownloadOriginalActivity =
		hasConnection &&
		isOriginalSource &&
		!(provider === Providers.GARMIN && activityType === ActivityType.GYM);

	const readFileExists = async (
		targetProvider: Providers,
		targetActivityId: string,
	) => {
		const cacheKey = getFileCacheKey(targetProvider, targetActivityId);
		const cachedResult = fileExistsCache.get(cacheKey);
		if (typeof cachedResult === "boolean") {
			return cachedResult;
		}
		if (cachedResult) {
			return cachedResult;
		}

		const pendingResult = client
			.existsFile({
				provider: targetProvider,
				activityId: targetActivityId,
			})
			.then((result) => {
				const exists = result.success ? result.data.exists : false;
				fileExistsCache.set(cacheKey, exists);
				return exists;
			})
			.catch(() => {
				fileExistsCache.delete(cacheKey);
				return false;
			});

		fileExistsCache.set(cacheKey, pendingResult);
		return pendingResult;
	};

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
		if (!connectionId) {
			setHasDownloadFile(false);
			return;
		}
		const downloadsFolder = await getValue<string>(StorageKeys.DOWNLOAD_FOLDER);
		if (!downloadsFolder) {
			setHasDownloadFile(false);
			return;
		}
		setHasDownloadFile(await readFileExists(provider, connectionId));
	};

	const checkAvailableUploadSource = async () => {
		if (hasConnection || provider !== Providers.GARMIN) {
			setAvailableUploadSource(null);
			return;
		}
		const downloadsFolder = await getValue<string>(StorageKeys.DOWNLOAD_FOLDER);
		if (!downloadsFolder) {
			setAvailableUploadSource(null);
			return;
		}

		const candidateResults = await Promise.all(
			uploadCandidates.map(async (candidate) => ({
				candidate,
				exists: await readFileExists(candidate.provider, candidate.activityId),
			})),
		);
		const availableCandidate = candidateResults.find(
			({ exists }) => exists,
		)?.candidate;

		setAvailableUploadSource(availableCandidate ?? null);
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		void checkIsExported();
		void checkAvailableUploadSource();
	}, [connectionId, hasConnection, provider, uploadCandidatesKey]);

	const handleManualUpload = async () => {
		// if it is coros or we have the activity, we do nothing
		if (provider === Providers.COROS || connectionId) return;
		if (provider !== Providers.GARMIN && provider !== Providers.STRAVA) return;
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
		await checkAvailableUploadSource();
		refreshData();
	};

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const handleUpload = async () => {
		if (!availableUploadSource) return;
		const downloadsFolder = await getValue<string>(StorageKeys.DOWNLOAD_FOLDER);
		if (!downloadsFolder) return;
		setLocalLoading(true);
		setLoading(true);

		const result = await client.uploadActivityFile({
			provider: availableUploadSource.provider,
			target: provider,
			providerActivityId: availableUploadSource.activityId,
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
		await checkAvailableUploadSource();
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
			invalidateFileExists(provider, connectionId);
			toast.success("Download completed", {
				transition: Bounce,
			});
		}

		await checkIsExported();
		await checkAvailableUploadSource();
		setLocalLoading(false);
		setLoading(false);
		refreshData();
	};

	const showUploadButton = !hasConnection && provider === Providers.GARMIN;
	const canUploadFromFile = showUploadButton && !!availableUploadSource;
	return (
		<div className="flex flex-row items-center">
			{hasConnection ? (
				<MonitorCheck color="green" />
			) : (
				<MonitorOff color="gray" />
			)}
			{connectionId ? (
				<button
					type="button"
					onClick={onProviderClick}
					className={cn([
						"mx-2 flex min-w-[80px] justify-center rounded-full px-3 py-1 text-sm uppercase cursor-pointer",
						provider === Providers.COROS && "bg-blue-100 text-blue-800",
						provider === Providers.GARMIN && "bg-orange-100 text-orange-800",
						provider === Providers.STRAVA && "bg-red-100 text-red-800",
					])}
				>
					{provider}
				</button>
			) : (
				<span
					className={cn([
						"mx-2 flex min-w-[80px] justify-center rounded-full px-3 py-1 text-sm uppercase",
						provider === Providers.COROS && "bg-blue-100 text-blue-800",
						provider === Providers.GARMIN && "bg-orange-100 text-orange-800",
						provider === Providers.STRAVA && "bg-red-100 text-red-800",
					])}
				>
					{provider}
				</span>
			)}
			<div className="hidden md:flex items-center gap-2">
				{canDownloadOriginalActivity && (
					<IconButton
						icon={<Download size={16} />}
						label="Download activity"
						onClick={handleDownload}
						disabled={hasDownloadFile || loading}
					/>
				)}
				{showUploadButton && (
					<IconButton
						icon={<Upload size={16} />}
						label="Upload activity"
						onClick={handleUpload}
						disabled={!canUploadFromFile || loading}
					/>
				)}
				{!hasConnection &&
					(provider === Providers.GARMIN || provider === Providers.STRAVA) && (
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
