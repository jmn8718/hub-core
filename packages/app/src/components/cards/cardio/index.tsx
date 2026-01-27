import { formatDateWithTime } from "@repo/dates";
import type { DbActivityPopulated, IDbGear } from "@repo/types";
import { ActivityType } from "@repo/types";
import { Clock, MapPin, Timer, Waves } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDuration } from "../../../utils/formatters.js";
import { SectionContainer } from "../../SectionContainer.js";
import { EditableNumber } from "../../forms/EditableNumber.js";
import { EditableText } from "../../forms/EditableText.js";
import { ActivityCardTemplate } from "../ActivityCardTemplate.js";

interface CardioCardProps {
	activity: DbActivityPopulated;
	gears: IDbGear[];
	showDetailsButton?: boolean;
}

export function CardioCard({
	activity,
	gears,
	showDetailsButton,
}: CardioCardProps) {
	return (
		<ActivityCardTemplate
			activity={activity}
			gears={gears}
			showDetailsButton={showDetailsButton}
		>
			{(context) => (
				<CardioCardBody
					activityData={context.activityData}
					handleEditActivity={context.handleEditActivity}
					isSwim={activity.type === ActivityType.SWIM}
				/>
			)}
		</ActivityCardTemplate>
	);
}

function CardioCardBody({
	activityData,
	handleEditActivity,
	isSwim,
}: {
	activityData: DbActivityPopulated;
	handleEditActivity: (field: string, value: string) => Promise<void>;
	isSwim: boolean;
}) {
	const [locationName, setLocationName] = useState(
		activityData.locationName || "",
	);
	const [laps, setLaps] = useState(
		activityData.type === ActivityType.SWIM && activityData.metadata?.laps
			? Number(activityData.metadata.laps)
			: 0,
	);
	const [poolLength, setPoolLength] = useState(
		activityData.type === ActivityType.SWIM && activityData.metadata?.length
			? Number(activityData.metadata.length)
			: 0,
	);

	useEffect(() => {
		setLocationName(activityData.locationName || "");
		if (activityData.type === ActivityType.SWIM && activityData.metadata) {
			setLaps(
				typeof activityData.metadata.laps === "number"
					? activityData.metadata.laps
					: 0,
			);
			setPoolLength(
				typeof activityData.metadata.length === "number"
					? activityData.metadata.length
					: 0,
			);
		}
	}, [activityData]);

	const handleMetadataUpdate = (field: "laps" | "length", value: number) => {
		const currentMetadata =
			activityData.type === ActivityType.SWIM && activityData.metadata
				? activityData.metadata
				: {};
		const newMetadata = { ...currentMetadata, [field]: value };
		void handleEditActivity("metadata", JSON.stringify(newMetadata));
	};

	return (
		<>
			<SectionContainer hasBorder>
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-sm">
						<Clock size={16} className="text-gray-500" />
						<span className="pl-2">
							{formatDateWithTime(
								activityData.timestamp,
								activityData.timezone,
							)}
						</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<Timer size={16} className="text-gray-500" />
						<span className="pl-2">
							{formatDuration(activityData.duration)}
						</span>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<MapPin size={16} className="text-gray-500 min-w-4" />
						<EditableText
							value={locationName}
							onSave={(value) => {
								setLocationName(value);
								if (value !== activityData.locationName) {
									void handleEditActivity("locationName", value);
								}
							}}
							className="h-8"
						/>
					</div>
				</div>
			</SectionContainer>
			{isSwim && (
				<SectionContainer hasBorder>
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm">
							<Waves size={16} className="text-gray-500" />
							<span className="pl-2">Laps:</span>
							<EditableNumber
								value={laps}
								onSave={(value) => {
									setLaps(value);
									handleMetadataUpdate("laps", value);
								}}
								className="h-8"
								min={0}
								step={1}
							/>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<Waves size={16} className="text-gray-500" />
							<span className="pl-2">Pool Length (m):</span>
							<EditableNumber
								value={poolLength}
								onSave={(value) => {
									setPoolLength(value);
									handleMetadataUpdate("length", value);
								}}
								className="h-8"
								min={0}
								step={1}
							/>
						</div>
					</div>
				</SectionContainer>
			)}
		</>
	);
}
