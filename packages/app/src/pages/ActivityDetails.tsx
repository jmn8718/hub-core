import type { DbActivityPopulated, IDbGearWithDistance } from "@repo/types";
import { ActivitySubType, ActivityType } from "@repo/types";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Bounce, toast } from "react-toastify";
import { Box } from "../components/Box.js";
import { SectionContainer } from "../components/SectionContainer.js";
import { ActivityCard, Text } from "../components/index.js";
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
			{(activity.type === ActivityType.RUN ||
				activity.type === ActivityType.BIKE) && (
				<ActivitySubtypePanel
					activity={activity}
					setLocalLoading={setLocalLoading}
					reload={loadActivity}
				/>
			)}
			<Box classes="flex flex-col gap-1">
				<Text text={activity.id} className="font-md" />
				{activity.connections.map((connection) => (
					<Text
						key={connection.id}
						text={`${connection.provider}: ${connection.id}`}
					/>
				))}
			</Box>
		</div>
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
		<Box>
			<p className="text-sm font-medium uppercase">Subtype</p>
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
