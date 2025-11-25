import type { DbActivityPopulated, IDbGearWithDistance } from "@repo/types";
import { ActivitySubType, ActivityType, Providers } from "@repo/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import { Box } from "../components/Box.js";
import { Text } from "../components/Text.js";
import { GearConnectionsSection } from "../components/cards/GearConnectionsSection.js";
import { ActivityCard } from "../components/index.js";
import { useDataClient } from "../contexts/DataClientContext.js";
import { useLoading } from "../contexts/LoadingContext.js";

export function ActivityDetails() {
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const { activityId } = useParams();
	const [activity, setActivity] = useState<DbActivityPopulated | null>(null);
	const [gears, setGears] = useState<IDbGearWithDistance[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	const loadActivity = useCallback(() => {
		if (!activityId) {
			toast.error("Missing activity id", { transition: Bounce });
			setIsLoading(false);
			return Promise.resolve();
		}
		setIsLoading(true);
		return Promise.all([
			client.getActivity(activityId),
			client.getGears({ limit: 100 }),
		])
			.then(([activityResult, gearsResult]) => {
				if (!activityResult.success || !activityResult.data) {
					throw new Error("Activity not found");
				}
				setActivity(activityResult.data);
				if (gearsResult.success) {
					setGears(gearsResult.data.data);
				}
			})
			.catch((err) => {
				toast.error((err as Error).message, { transition: Bounce });
			})
			.finally(() => setIsLoading(false));
	}, [activityId, client]);

	useEffect(() => {
		loadActivity();
	}, [loadActivity]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
				Loading activity…
			</div>
		);
	}

	if (!activity) {
		return (
			<div className="flex items-center justify-center py-10 text-gray-500 dark:text-gray-400">
				Activity not found.
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<ActivityCard activity={activity} gears={gears} />
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
			<EventToggle activity={activity} reload={loadActivity} />
			<ActivityDeleteSection
				activity={activity}
				gears={gears}
				hasConnections={activity.connections.length > 0}
			/>
		</div>
	);
}

function ActivityConnectionsPanel({
	activity,
	reload,
}: {
	activity: DbActivityPopulated;
	reload: () => Promise<void> | void;
}) {
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const [pendingProvider, setPendingProvider] = useState<Providers | null>(
		null,
	);
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
			toast.success(`${provider} connection removed`, { transition: Bounce });
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
		const providerActivityId = inputValues[provider];
		if (!providerActivityId) {
			toast.error("Enter provider activity id", { transition: Bounce });
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
			toast.success(`${provider} connection added`, { transition: Bounce });
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

	const providersList = [Providers.GARMIN, Providers.COROS, Providers.STRAVA];

	return (
		<Box
			title="Provider Connections"
			description="Link this activity to provider entries already imported into the system."
		>
			<div className="space-y-3">
				{providersList.map((provider) => {
					const connectionId = connectionMap.get(provider);
					const isProcessing = pendingProvider === provider;
					return (
						<div
							key={provider}
							className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 md:flex-row md:items-center md:justify-between"
						>
							<div>
								<Text className="text-sm font-semibold" text={provider} />
								<Text
									className="text-xs pt-1"
									variant="description"
									text={
										connectionId
											? `Connected to ${connectionId}`
											: "No provider link set"
									}
								/>
							</div>
							{connectionId ? (
								<button
									type="button"
									onClick={() => handleUnlink(provider)}
									disabled={isProcessing}
									className="rounded border border-red-500 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:border-gray-300 disabled:text-gray-400"
								>
									{isProcessing ? "Removing..." : "Disconnect"}
								</button>
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
										placeholder="Provider activity id"
										className="rounded border border-gray-300 px-3 py-1 text-sm"
									/>
									<button
										type="button"
										onClick={() => handleLink(provider)}
										disabled={isProcessing}
										className="rounded border border-blue-500 px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400"
									>
										{isProcessing ? "Linking..." : "Link"}
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
				className={`rounded-full px-4 py-2 text-sm font-medium ${
					isRace
						? "bg-rose-600 text-white hover:bg-rose-700"
						: "bg-gray-200 text-gray-700 hover:bg-gray-300"
				}`}
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
			navigate("/");
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
				className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
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
					className="rounded border border-gray-300 bg-transparent px-3 py-2 text-sm"
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
					className="rounded border border-blue-500 px-4 py-2 text-sm font-medium text-blue-600 disabled:border-gray-300 disabled:text-gray-400"
				>
					{isSaving ? "Saving…" : "Apply subtype"}
				</button>
			</div>
		</Box>
	);
}
