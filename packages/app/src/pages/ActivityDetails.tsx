import { dateWithTimezoneToUTC, formatDate } from "@repo/dates";
import type {
	DbActivityPopulated,
	IDbActivityLap,
	IDbGearWithDistance,
} from "@repo/types";
import {
	ActivitySubType,
	ActivityType,
	AppType,
	LapIdentifier,
	Providers,
	StorageKeys,
	lapIdentifierValues,
} from "@repo/types";
import { cn } from "@repo/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import { Box } from "../components/Box.js";
import { Text } from "../components/Text.js";
import { GearConnectionsSection } from "../components/cards/GearConnectionsSection.js";
import { ActivityCard } from "../components/index.js";
import { Routes } from "../constants.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useLoading } from "../contexts/LoadingContext.js";
import { useStore } from "../contexts/StoreContext.js";
import { useTheme } from "../contexts/ThemeContext.js";
import { useWebCachedReadRefresh } from "../hooks/useWebCachedReadRefresh.js";
import { formatDistance, formatDuration } from "../utils/formatters.js";
import {
	actionButtonBaseClass,
	inputBaseClass,
	pillButtonBaseClass,
} from "../utils/style.js";

export function ActivityDetails() {
	const { client } = useDataClient();
	const { setGlobalLoading, setLocalLoading } = useLoading();
	const { colors } = useTheme();
	const { activityId } = useParams();
	const [activity, setActivity] = useState<DbActivityPopulated | null>(null);
	const [gears, setGears] = useState<IDbGearWithDistance[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [isRegeneratingMetadata, setIsRegeneratingMetadata] = useState(false);
	const [isPopulatingLaps, setIsPopulatingLaps] = useState(false);

	const MAX_RETRIES = 3;
	const RETRY_DELAY_MS = 1000;

	const loadActivity = useCallback(
		async ({
			showLoading = true,
			showErrors = true,
		}: {
			showLoading?: boolean;
			showErrors?: boolean;
		} = {}) => {
			if (!activityId) {
				const message = "Missing activity id";
				if (showErrors) {
					toast.error(message, { transition: Bounce });
				}
				setLoadError(message);
				setIsLoading(false);
				return;
			}
			if (showLoading) {
				setIsLoading(true);
			}
			setLoadError(null);

			for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
				try {
					const [activityResult, gearsResult] = await Promise.all([
						client.getActivity(activityId),
						client.getGears({ limit: 100 }),
					]);

					if (activityResult.success && activityResult.data) {
						setActivity(activityResult.data);
						if (gearsResult.success) {
							setGears(gearsResult.data.data);
						}
						setIsLoading(false);
						setLoadError(null);
						return;
					}

					if (attempt < MAX_RETRIES) {
						await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
						continue;
					}

					throw new Error("Activity not found");
				} catch (err) {
					if (attempt < MAX_RETRIES) {
						await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
						continue;
					}
					const message = (err as Error).message;
					if (showErrors) {
						toast.error(message, { transition: Bounce });
					}
					setLoadError(message);
					if (showLoading) {
						setIsLoading(false);
					}
					return;
				}
			}
		},
		[activityId, client],
	);

	useEffect(() => {
		void loadActivity();
	}, [loadActivity]);

	useWebCachedReadRefresh(["getActivity", "getGears"], () =>
		loadActivity({ showLoading: false, showErrors: false }),
	);

	if (isLoading) {
		return (
			<div
				// biome-ignore lint/a11y/useSemanticElements: <explanation>
				role="status"
				aria-live="polite"
				className={cn(
					"flex items-center justify-center py-10",
					colors.description,
				)}
			>
				Loading activity…
			</div>
		);
	}

	if (!activity) {
		return (
			<div
				role="alert"
				className={cn(
					"flex flex-col items-center justify-center gap-3 py-10 text-center",
					colors.description,
				)}
			>
				<p>{loadError || "Activity not found."}</p>
				<button
					type="button"
					onClick={() => {
						void loadActivity();
					}}
					className={cn(actionButtonBaseClass, colors.buttonSecondary)}
				>
					Try again
				</button>
			</div>
		);
	}

	const hasLongFormContent =
		(activity.insight?.trim() ?? "").length > 0 ||
		(activity.description?.trim() ?? "").length > 0;
	const stravaConnection = activity.connections.find(
		(connection) => connection.provider === Providers.STRAVA,
	);
	const canPopulateStravaLaps =
		Boolean(stravaConnection?.id) && activity.laps.length === 0;

	return (
		<div className="space-y-4">
			<ActivityCard
				activity={activity}
				gears={gears}
				showExtendedTextFields
				onActivityRefresh={loadActivity}
			/>
			{canPopulateStravaLaps && (
				<Box
					title="Laps"
					description="Fetch provider-reported lap splits for this activity from Strava."
				>
					<div className="flex justify-end">
						<button
							type="button"
							onClick={async () => {
								if (!stravaConnection?.id) {
									return;
								}

								setIsPopulatingLaps(true);
								setLocalLoading(true);
								try {
									const result = await client.providerSyncActivity(
										Providers.STRAVA,
										stravaConnection.id,
									);
									if (!result.success) {
										throw new Error(result.error);
									}
									await loadActivity();
									toast.success("Strava laps populated.", {
										transition: Bounce,
									});
								} catch (error) {
									toast.error((error as Error).message, {
										hideProgressBar: false,
										closeOnClick: false,
										transition: Bounce,
									});
								} finally {
									setLocalLoading(false);
									setIsPopulatingLaps(false);
								}
							}}
							disabled={isPopulatingLaps}
							className={cn(actionButtonBaseClass, colors.buttonSecondary)}
						>
							{isPopulatingLaps ? "Fetching laps..." : "Fetch laps"}
						</button>
					</div>
				</Box>
			)}
			{activity.laps.length > 0 && (
				<ActivityLapsSection activity={activity} reload={loadActivity} />
			)}
			{(activity.type === ActivityType.GYM ||
				activity.type === ActivityType.SWIM) && (
				<ActivityDateSection activity={activity} reload={loadActivity} />
			)}
			{(activity.type === ActivityType.RUN ||
				activity.type === ActivityType.BIKE) && (
				<Box
					title="Metadata"
					description="Refresh provider-derived metadata from the main provider source for this activity."
				>
					<div className="flex justify-end">
						<button
							type="button"
							onClick={async () => {
								setIsRegeneratingMetadata(true);
								setGlobalLoading(true, "Regenerating activity metadata");
								try {
									const result = await client.regenerateActivityMetadata(
										activity.id,
									);
									if (!result.success) {
										throw new Error(result.error);
									}
									await loadActivity();
									toast.success("Activity metadata regenerated.", {
										transition: Bounce,
									});
								} catch (error) {
									toast.error((error as Error).message, {
										hideProgressBar: false,
										closeOnClick: false,
										transition: Bounce,
									});
								} finally {
									setGlobalLoading(false);
									setIsRegeneratingMetadata(false);
								}
							}}
							disabled={isRegeneratingMetadata}
							className={cn(actionButtonBaseClass, colors.buttonSecondary)}
						>
							{isRegeneratingMetadata
								? "Regenerating..."
								: "Regenerate metadata"}
						</button>
					</div>
				</Box>
			)}
			<GearConnectionsSection
				activityId={activity.id}
				selectedGearIds={activity.gears.map((gear) => gear.id)}
				providers={activity.connections.map(
					(connection) => connection.provider,
				)}
				gears={gears}
				refreshActivity={loadActivity}
			/>
			{(activity.type === ActivityType.RUN ||
				activity.type === ActivityType.BIKE) && (
				<ActivitySubtypePanel
					activity={activity}
					setLocalLoading={setLocalLoading}
					reload={loadActivity}
				/>
			)}
			<ActivityConnectionsPanel activity={activity} reload={loadActivity} />
			{(activity.type === ActivityType.RUN ||
				activity.type === ActivityType.BIKE) && (
				<EventToggle activity={activity} reload={loadActivity} />
			)}
			<ActivityDeleteSection
				activity={activity}
				gears={gears}
				hasConnections={activity.connections.length > 0}
			/>
		</div>
	);
}

function ActivityLapsSection({
	activity,
	reload,
}: {
	activity: DbActivityPopulated;
	reload: (options?: {
		showLoading?: boolean;
		showErrors?: boolean;
	}) => Promise<void>;
}) {
	const { client } = useDataClient();
	const { setLocalLoading, isLocalLoading } = useLoading();
	const [lapIdentifiers, setLapIdentifiers] = useState<
		Record<string, LapIdentifier>
	>({});

	useEffect(() => {
		setLapIdentifiers(
			Object.fromEntries(
				activity.laps.map((lap) => [
					lap.id,
					lapIdentifierValues.includes(lap.identifier)
						? lap.identifier
						: LapIdentifier.RUN,
				]),
			),
		);
	}, [activity.laps]);

	const handleLapIdentifierSave =
		(lapId: string, currentIdentifier: LapIdentifier) =>
		async (value: LapIdentifier) => {
			if (value === currentIdentifier) {
				return;
			}

			setLapIdentifiers((current) => ({
				...current,
				[lapId]: value,
			}));
			setLocalLoading(true);

			try {
				const result = await client.editActivityLap(lapId, {
					identifier: value,
					activityId: activity.id,
				});
				if (!result.success) {
					console.error("[ActivityDetails] lap identifier save failed", {
						activityId: activity.id,
						lapId,
						nextIdentifier: value,
						error: result.error,
					});
					setLapIdentifiers((current) => ({
						...current,
						[lapId]: currentIdentifier,
					}));
					toast.error(result.error, {
						hideProgressBar: false,
						closeOnClick: false,
						transition: Bounce,
					});
					return;
				}

				const persistedLap = result.data;
				if (persistedLap) {
					setLapIdentifiers((current) => ({
						...current,
						[persistedLap.id]: persistedLap.identifier,
					}));
				}

				await reload({
					showLoading: false,
					showErrors: false,
				});
			} catch (error) {
				console.error("[ActivityDetails] lap identifier save threw", {
					activityId: activity.id,
					lapId,
					nextIdentifier: value,
					error,
				});
				setLapIdentifiers((current) => ({
					...current,
					[lapId]: currentIdentifier,
				}));
				toast.error((error as Error).message, {
					hideProgressBar: false,
					closeOnClick: false,
					transition: Bounce,
				});
			} finally {
				setTimeout(() => setLocalLoading(false), 200);
			}
		};
	return (
		<Box
			title="Laps"
			description="Provider-reported lap splits for this activity."
		>
			<div className="overflow-x-auto rounded-md border border-slate-200/80">
				<table className="min-w-full border-collapse text-sm">
					<thead className="bg-slate-50/80">
						<tr className="border-b border-slate-200/80">
							<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
								Lap
							</th>
							<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
								Distance
							</th>
							<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
								Time
							</th>
							<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
								Avg HR
							</th>
							<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
								Max HR
							</th>
							<th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
								Identifier
							</th>
						</tr>
					</thead>
					<tbody>
						{activity.laps.map((lap, index) => {
							const selectedIdentifier =
								lapIdentifiers[lap.id] ?? LapIdentifier.RUN;

							return (
								<tr
									key={lap.id}
									className={cn(
										"border-b border-slate-200/80 align-middle last:border-b-0",
										index % 2 === 0 ? "bg-white" : "bg-slate-50/40",
									)}
								>
									<td className="px-4 py-3 font-semibold text-slate-700">
										{lap.lapNumber}
									</td>
									<td className="px-4 py-3 text-slate-700">
										{formatDistance(lap.distance)}
									</td>
									<td className="px-4 py-3 text-slate-700">
										{formatDuration(lap.elapsedTime)}
									</td>
									<td className="px-4 py-3 text-slate-700">
										{lap.averageHeartRate
											? `${Math.round(lap.averageHeartRate)} bpm`
											: "-"}
									</td>
									<td className="px-4 py-3 text-slate-700">
										{lap.maximumHeartRate
											? `${Math.round(lap.maximumHeartRate)} bpm`
											: "-"}
									</td>
									<td className="px-4 py-3">
										<select
											value={selectedIdentifier}
											onChange={(event) => {
												void handleLapIdentifierSave(
													lap.id,
													selectedIdentifier,
												)(event.target.value as LapIdentifier);
											}}
											disabled={isLocalLoading}
											className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-slate-400"
										>
											{lapIdentifierValues.map((option) => (
												<option key={option} value={option}>
													{option}
												</option>
											))}
										</select>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</Box>
	);
}

function ActivityDateSection({
	activity,
	reload,
}: {
	activity: DbActivityPopulated;
	reload: () => Promise<void> | void;
}) {
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const { colors } = useTheme();
	const [timestampValue, setTimestampValue] = useState(() =>
		formatDate(activity.timestamp, {
			format: "YYYY-MM-DDTHH:mm",
			timezone: activity.timezone || undefined,
		}),
	);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		setTimestampValue(
			formatDate(activity.timestamp, {
				format: "YYYY-MM-DDTHH:mm",
				timezone: activity.timezone || undefined,
			}),
		);
	}, [activity.timestamp, activity.timezone]);

	const currentTimestampValue = formatDate(activity.timestamp, {
		format: "YYYY-MM-DDTHH:mm",
		timezone: activity.timezone || undefined,
	});
	const hasChanges = timestampValue !== currentTimestampValue;

	const handleSave = async () => {
		if (!hasChanges) return;
		setIsSaving(true);
		setLocalLoading(true);
		try {
			const nextTimestamp = activity.timezone
				? dateWithTimezoneToUTC(timestampValue, activity.timezone).getTime()
				: new Date(timestampValue).getTime();
			if (Number.isNaN(nextTimestamp)) {
				throw new Error("Invalid activity date");
			}
			const result = await client.editActivity(activity.id, {
				timestamp: nextTimestamp,
			});
			if (!result.success) {
				throw new Error(result.error);
			}
			await reload();
			toast.success("Activity date updated.", { transition: Bounce });
		} catch (err) {
			toast.error((err as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			setIsSaving(false);
			setTimeout(() => setLocalLoading(false), 200);
		}
	};

	return (
		<Box
			title="Date & Time"
			description="Adjust the recorded date and time for this activity."
		>
			<div className="flex flex-col gap-2 md:flex-row md:items-center">
				<input
					type="datetime-local"
					value={timestampValue}
					onChange={(event) => setTimestampValue(event.target.value)}
					className={cn(inputBaseClass, colors.input)}
				/>
				<button
					type="button"
					onClick={handleSave}
					disabled={!hasChanges || isSaving}
					className={cn(actionButtonBaseClass, colors.buttonPrimary)}
				>
					{isSaving ? "Saving…" : "Save date"}
				</button>
			</div>
		</Box>
	);
}

function ActivityConnectionsPanel({
	activity,
	reload,
}: {
	activity: DbActivityPopulated;
	reload: () => Promise<void> | void;
}) {
	const { client, type } = useDataClient();
	const { setLocalLoading } = useLoading();
	const { colors } = useTheme();
	const { store } = useStore();
	const [pendingProvider, setPendingProvider] = useState<Providers | null>(
		null,
	);
	const [pendingPersistProvider, setPendingPersistProvider] =
		useState<Providers | null>(null);
	const [inputValues, setInputValues] = useState<Record<Providers, string>>({
		[Providers.GARMIN]: "",
		[Providers.COROS]: "",
		[Providers.STRAVA]: "",
	});

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		setInputValues({
			[Providers.GARMIN]: "",
			[Providers.COROS]: "",
			[Providers.STRAVA]: "",
		});
	}, [activity.id]);

	const connectionMap = useMemo(() => {
		return new Map(
			activity.connections.map((connection) => [
				connection.provider,
				connection.id,
			]),
		);
	}, [activity.connections]);

	const handleUnlink = async (provider: Providers) => {
		const providerActivityId = connectionMap.get(provider);
		if (!providerActivityId) return;
		setPendingProvider(provider);
		setLocalLoading(true);
		try {
			const result = await client.unlinkActivityConnection(
				activity.id,
				providerActivityId,
			);
			if (!result.success) throw new Error(result.error);
			await reload();
			toast.success(`${provider} link removed.`, { transition: Bounce });
		} catch (err) {
			toast.error((err as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			setPendingProvider(null);
			setTimeout(() => setLocalLoading(false), 200);
		}
	};

	const handleLink = async (provider: Providers) => {
		const providerActivityId = inputValues[provider]?.trim();
		if (!providerActivityId) {
			toast.error(`Enter the ${provider} activity ID.`, {
				transition: Bounce,
			});
			return;
		}
		setPendingProvider(provider);
		setLocalLoading(true);
		try {
			const result = await client.linkActivityConnection(
				activity.id,
				providerActivityId,
			);
			if (!result.success) throw new Error(result.error);
			await reload();
			toast.success(`${provider} link added.`, { transition: Bounce });
			setInputValues((prev) => ({ ...prev, [provider]: "" }));
		} catch (err) {
			toast.error((err as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			setPendingProvider(null);
			setTimeout(() => setLocalLoading(false), 200);
		}
	};

	const handlePersistCache = async (provider: Providers) => {
		const providerActivityId = connectionMap.get(provider);
		if (!providerActivityId) return;
		const cacheFolder = store[StorageKeys.CACHE_FOLDER];
		if (!cacheFolder) {
			toast.error("Choose a cache folder first.", { transition: Bounce });
			return;
		}
		setPendingPersistProvider(provider);
		setLocalLoading(true);
		try {
			const result = await client.providerPersistActivityCache({
				provider,
				providerActivityId,
			});
			if (!result.success) throw new Error(result.error);
			toast.success(`${provider} activity saved to the cache folder.`, {
				transition: Bounce,
			});
		} catch (err) {
			toast.error((err as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			setPendingPersistProvider(null);
			setTimeout(() => setLocalLoading(false), 200);
		}
	};

	const providersList = [Providers.GARMIN, Providers.COROS, Providers.STRAVA];
	const connectionRowClass = cn(
		"flex flex-col gap-2 rounded-lg p-3 md:flex-row md:items-center md:justify-between",
		colors.panel,
	);
	const inlineInputClass = cn(
		inputBaseClass,
		"min-w-[220px] py-1.5",
		colors.input,
	);
	const actionButtonClass = cn(actionButtonBaseClass, "py-1.5");

	return (
		<Box
			title="Provider Connections"
			description="Match this activity to the same workout from Garmin, COROS, or Strava."
		>
			<div className="space-y-3">
				{providersList.map((provider) => {
					const connectionId = connectionMap.get(provider);
					const isProcessing = pendingProvider === provider;
					return (
						<div key={provider} className={connectionRowClass}>
							<div className="min-w-0">
								<Text className="text-sm font-semibold" text={provider} />
								<Text
									className="break-all pt-1 text-xs"
									variant="description"
									text={
										connectionId
											? `Linked to activity ${connectionId}`
											: "No linked activity yet"
									}
								/>
							</div>
							{connectionId ? (
								<div className="flex flex-wrap items-center gap-2">
									{type === AppType.DESKTOP &&
										!!store[StorageKeys.CACHE_FOLDER] && (
											<button
												type="button"
												onClick={() => handlePersistCache(provider)}
												disabled={pendingPersistProvider === provider}
												className={cn(actionButtonClass, colors.buttonSuccess)}
											>
												{pendingPersistProvider === provider
													? "Saving..."
													: "Save cache file"}
											</button>
										)}
									<button
										type="button"
										onClick={() => handleUnlink(provider)}
										disabled={isProcessing}
										className={cn(actionButtonClass, colors.buttonDanger)}
									>
										{isProcessing ? "Removing..." : "Remove link"}
									</button>
								</div>
							) : (
								<div className="flex flex-col gap-2 md:flex-row">
									<input
										type="text"
										value={inputValues[provider]}
										onChange={(event) =>
											setInputValues((prev) => ({
												...prev,
												[provider]: event.target.value,
											}))
										}
										placeholder={`${provider} activity ID`}
										className={inlineInputClass}
									/>
									<button
										type="button"
										onClick={() => handleLink(provider)}
										disabled={isProcessing}
										className={cn(actionButtonClass, colors.buttonPrimary)}
									>
										{isProcessing ? "Linking..." : "Add link"}
									</button>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</Box>
	);
}

function EventToggle({
	activity,
	reload,
}: {
	activity: DbActivityPopulated;
	reload: () => Promise<void> | void;
}) {
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const { colors } = useTheme();
	const [isSaving, setIsSaving] = useState(false);
	const isRace = activity.isEvent === 1;

	const handleToggle = async () => {
		setIsSaving(true);
		setLocalLoading(true);
		try {
			const result = await client.editActivity(activity.id, {
				isEvent: isRace ? 0 : 1,
			});
			if (!result.success) {
				throw new Error(result.error);
			}
			await reload();
			toast.success(`Marked as ${isRace ? "non-race" : "race"}.`, {
				transition: Bounce,
			});
		} catch (err) {
			toast.error((err as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			setIsSaving(false);
			setTimeout(() => setLocalLoading(false), 200);
		}
	};

	return (
		<Box
			title="Race Flag"
			description="Mark this workout as an event you raced."
		>
			<button
				type="button"
				onClick={handleToggle}
				disabled={isSaving}
				className={cn(
					pillButtonBaseClass,
					isRace ? colors.buttonDanger : colors.buttonSecondary,
				)}
			>
				{isSaving ? "Saving…" : isRace ? "Unset race" : "Mark as race"}
			</button>
		</Box>
	);
}

function ActivityDeleteSection({
	activity,
	gears,
	hasConnections,
}: {
	activity: DbActivityPopulated;
	gears: IDbGearWithDistance[];
	hasConnections: boolean;
}) {
	const { client } = useDataClient();
	const navigate = useNavigate();
	const { setLocalLoading } = useLoading();
	const { colors } = useTheme();
	const [isDeleting, setIsDeleting] = useState(false);
	const hasGearConnected = activity.gears.length > 0;

	const handleDelete = async () => {
		if (hasGearConnected || hasConnections) return;
		setIsDeleting(true);
		setLocalLoading(true);
		try {
			const result = await client.deleteActivity(activity.id);
			if (!result.success) {
				throw new Error(result.error);
			}
			toast.success("Activity deleted", { transition: Bounce });
			navigate(Routes.DATA);
		} catch (err) {
			toast.error((err as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			setIsDeleting(false);
			setTimeout(() => setLocalLoading(false), 200);
		}
	};

	return (
		<Box
			title="Danger Zone"
			description="Remove this activity permanently. This action is not reversible."
		>
			<button
				type="button"
				disabled={hasGearConnected || hasConnections || isDeleting}
				onClick={handleDelete}
				className={cn(
					pillButtonBaseClass,
					"font-semibold",
					colors.buttonDanger,
				)}
			>
				{hasGearConnected
					? "Remove gear before deleting"
					: hasConnections
						? "Remove provider links first"
						: isDeleting
							? "Deleting..."
							: "Delete activity"}
			</button>
		</Box>
	);
}

function ActivitySubtypePanel({
	activity,
	reload,
	setLocalLoading,
}: {
	activity: DbActivityPopulated;
	reload: () => Promise<void> | void;
	setLocalLoading: (value: boolean) => void;
}) {
	const { client } = useDataClient();
	const { colors } = useTheme();
	const [subtype, setSubtype] = useState<ActivitySubType | "">(
		(activity.subtype as ActivitySubType) || "",
	);
	const [isSaving, setIsSaving] = useState(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		setSubtype((activity.subtype as ActivitySubType) || "");
	}, [activity.id, activity.subtype]);

	const subtypeOptions = ["", ...Object.values(ActivitySubType)];
	const hasChanges = (subtype || "") !== (activity.subtype || "");

	const handleApply = async () => {
		if (!hasChanges) return;
		setIsSaving(true);
		setLocalLoading(true);
		try {
			const payload: { subtype?: ActivitySubType } = {};
			if (subtype) payload.subtype = subtype;
			const result = await client.editActivity(activity.id, payload);
			if (!result.success) {
				throw new Error(result.error);
			}
			await reload();
			toast.success("Subtype updated", { transition: Bounce });
		} catch (err) {
			toast.error((err as Error).message, { transition: Bounce });
		} finally {
			setIsSaving(false);
			setTimeout(() => setLocalLoading(false), 200);
		}
	};

	return (
		<Box title="Subtype">
			<div className="flex flex-col gap-2 md:flex-row md:items-center">
				<select
					className={cn(inputBaseClass, colors.input)}
					value={subtype}
					onChange={(event) =>
						setSubtype(event.target.value as ActivitySubType | "")
					}
				>
					{subtypeOptions.map((option) => (
						<option key={option || "none"} value={option}>
							{option || "None"}
						</option>
					))}
				</select>
				<button
					type="button"
					onClick={handleApply}
					disabled={!hasChanges || isSaving}
					className={cn(actionButtonBaseClass, colors.buttonPrimary)}
				>
					{isSaving ? "Saving…" : "Apply subtype"}
				</button>
			</div>
		</Box>
	);
}
