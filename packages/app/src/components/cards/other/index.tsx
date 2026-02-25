import { formatDateWithTime } from "@repo/dates";
import {
	ActivitySubType,
	ActivityType,
	type DbActivityPopulated,
	type IDbGear,
} from "@repo/types";
import { cn } from "@repo/ui";
import { useEffect, useMemo, useState } from "react";
import { Bounce, toast } from "react-toastify";
import {
	useDataClient,
	useLoading,
	useTheme,
} from "../../../contexts/index.js";
import { Button } from "../../Button.js";
import { SectionContainer } from "../../SectionContainer.js";
import { ActivityCardTemplate } from "../ActivityCardTemplate.js";

interface OtherActivityCardProps {
	activity: DbActivityPopulated;
	gears: IDbGear[];
	showDetailsButton?: boolean;
}

const subtypeOptions = ["", ...Object.values(ActivitySubType)];
const supportsSubtype = (type: ActivityType) => type !== ActivityType.GYM;

export function OtherActivityCard({
	activity,
	gears,
	showDetailsButton,
}: OtherActivityCardProps) {
	return (
		<ActivityCardTemplate
			activity={activity}
			gears={gears}
			showDetailsButton={showDetailsButton}
		>
			{(context) => <OtherActivityBody activity={activity} context={context} />}
		</ActivityCardTemplate>
	);
}

function OtherActivityBody({
	activity,
	context,
}: {
	activity: DbActivityPopulated;
	context: {
		activityData: DbActivityPopulated;
		handleEditActivity: (field: string, value: string) => Promise<void>;
		refreshActivity: () => Promise<void>;
	};
}) {
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const { isDarkMode } = useTheme();
	const [classification, setClassification] = useState<{
		type: ActivityType;
		subtype: ActivitySubType | "";
	}>({
		type: activity.type,
		subtype: (activity.subtype as ActivitySubType) || "",
	});

	useEffect(() => {
		setClassification({
			type: context.activityData.type,
			subtype: (context.activityData.subtype as ActivitySubType) || "",
		});
	}, [context.activityData]);

	const hasChanges = useMemo(() => {
		const currentSubtype = context.activityData.subtype || "";
		const nextSubtype = supportsSubtype(classification.type)
			? classification.subtype
			: "";
		const baseSubtype = supportsSubtype(context.activityData.type)
			? currentSubtype
			: "";
		return (
			classification.type !== context.activityData.type ||
			nextSubtype !== baseSubtype
		);
	}, [classification, context.activityData]);

	const handleClassificationUpdate = async () => {
		if (!hasChanges) return;
		setLocalLoading(true);
		try {
			const payload: {
				type: ActivityType;
				subtype?: ActivitySubType;
			} = {
				type: classification.type,
			};
			if (supportsSubtype(classification.type) && classification.subtype) {
				payload.subtype = classification.subtype;
			}
			const result = await client.editActivity(
				context.activityData.id,
				payload,
			);
			if (!result.success) {
				throw new Error(result.error);
			}
			await context.refreshActivity();
			toast.success("Activity classification updated", {
				transition: Bounce,
			});
		} catch (err) {
			toast.error((err as Error).message, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} finally {
			setTimeout(() => {
				setLocalLoading(false);
			}, 200);
		}
	};

	return (
		<>
			<SectionContainer hasBorder>
				<div
					className={cn(
						"text-sm",
						isDarkMode ? "text-gray-300" : "text-gray-600",
					)}
				>
					{formatDateWithTime(
						context.activityData.timestamp,
						context.activityData.timezone,
					)}
				</div>
			</SectionContainer>
			<SectionContainer hasBorder className="space-y-4">
				<div>
					<p className="text-sm font-medium">Classification</p>
					<p className="text-xs text-gray-500">
						Adjust the activity type and subtype, then apply the change.
					</p>
				</div>
				<div className="grid gap-4 md:grid-cols-2">
					<label className="text-sm font-medium">
						Type
						<select
							className="mt-1 w-full rounded border border-gray-300 bg-transparent px-3 py-2 text-sm"
							value={classification.type}
							onChange={(event) =>
								setClassification((prev) => {
									const nextType = event.target.value as ActivityType;
									return {
										...prev,
										type: nextType,
										subtype: supportsSubtype(nextType) ? prev.subtype : "",
									};
								})
							}
						>
							{Object.values(ActivityType).map((value) => (
								<option key={value} value={value}>
									{value}
								</option>
							))}
						</select>
					</label>
					{supportsSubtype(classification.type) && (
						<label className="text-sm font-medium">
							Subtype
							<select
								className="mt-1 w-full rounded border border-gray-300 bg-transparent px-3 py-2 text-sm"
								value={classification.subtype}
								onChange={(event) =>
									setClassification((prev) => ({
										...prev,
										subtype: event.target.value as ActivitySubType | "",
									}))
								}
							>
								{subtypeOptions.map((value) => (
									<option key={value || "none"} value={value}>
										{value || "None"}
									</option>
								))}
							</select>
						</label>
					)}
				</div>
				<Button onClick={handleClassificationUpdate} disabled={!hasChanges}>
					Apply classification
				</Button>
			</SectionContainer>
		</>
	);
}
