import { formatDateWithTime } from "@repo/dates";
import type { DbActivityPopulated, IDbGear } from "@repo/types";
import { ActivityType } from "@repo/types";
import { Clock, HeartPulse, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { SectionContainer } from "../../SectionContainer.js";
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
					isSwim={activity.type === ActivityType.SWIM}
				/>
			)}
		</ActivityCardTemplate>
	);
}

function CardioCardBody({
	activityData,
	isSwim,
}: {
	activityData: DbActivityPopulated;
	isSwim: boolean;
}) {
	const [locationName, setLocationName] = useState(
		activityData.locationName || "",
	);

	useEffect(() => {
		setLocationName(activityData.locationName || "");
	}, [activityData.locationName]);

	return (
		<SectionContainer hasBorder>
			<div className="space-y-2">
				<div className="flex items-center gap-2 text-sm">
					<Clock size={16} className="text-gray-500" />
					<span className="pl-2">
						{formatDateWithTime(activityData.timestamp, activityData.timezone)}
					</span>
				</div>
				<div className="flex items-center gap-2 text-sm">
					{isSwim ? (
						<span className="text-gray-500">🏊</span>
					) : (
						<HeartPulse size={16} className="text-gray-500" />
					)}
					<span>{isSwim ? "Swim session" : "Cardio workout"}</span>
				</div>
				<div className="flex items-center gap-2 text-sm">
					<MapPin size={16} className="text-gray-500 min-w-4" />
					<EditableText
						value={locationName}
						onSave={() => {}}
						className="h-8"
					/>
				</div>
			</div>
		</SectionContainer>
	);
}
