import { formatDateWithTime } from "@repo/dates";
import type { DbActivityPopulated, IDbGear } from "@repo/types";
import { Clock, MapIcon, MapPin, Mountain, Route } from "lucide-react";
import { useEffect, useState } from "react";
import { formatDistance, formatDuration } from "../../../utils/formatters.js";
import { SectionContainer } from "../../SectionContainer.js";
import { EditableText } from "../../forms/EditableText.js";
import { ActivityCardTemplate } from "../ActivityCardTemplate.js";
import type { ActivityCardTemplateRenderProps } from "../ActivityCardTemplate.js";

interface HikeCardProps {
	activity: DbActivityPopulated;
	gears: IDbGear[];
	showDetailsButton?: boolean;
}

export function HikeCard({
	activity,
	gears,
	showDetailsButton,
}: HikeCardProps) {
	return (
		<ActivityCardTemplate
			activity={activity}
			gears={gears}
			showDetailsButton={showDetailsButton}
		>
			{(context) => <HikeCardBody context={context} />}
		</ActivityCardTemplate>
	);
}

function HikeCardBody({
	context,
}: { context: ActivityCardTemplateRenderProps }) {
	const { activityData, handleEditActivity } = context;
	const [locationName, setLocationName] = useState(
		activityData.locationName || "",
	);
	const [locationCountry, setLocationCountry] = useState(
		activityData.locationCountry || "",
	);

	useEffect(() => {
		setLocationName(activityData.locationName || "");
		setLocationCountry(activityData.locationCountry || "");
	}, [activityData]);

	const handleLocationNameChange = (value: string) => {
		setLocationName(value);
		if (value !== activityData.locationName) {
			void handleEditActivity("locationName", value);
		}
	};
	const handleLocationCountryChange = (value: string) => {
		setLocationCountry(value);
		if (value !== activityData.locationCountry) {
			void handleEditActivity("locationCountry", value);
		}
	};

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
					<MapPin size={16} className="text-gray-500 min-w-4" />
					<EditableText
						value={locationName}
						onSave={handleLocationNameChange}
						className="h-8"
					/>
				</div>
				<div className="flex items-center gap-2 text-sm">
					<MapIcon size={16} className="text-gray-500 min-w-4" />
					<EditableText
						value={locationCountry}
						onSave={handleLocationCountryChange}
						className="h-8"
					/>
				</div>
				<div className="flex items-center gap-2 text-sm">
					<Route size={16} className="text-gray-500" />
					<span className="pl-2">
						{formatDistance(activityData.distance)} •{" "}
						{formatDuration(activityData.duration)}
					</span>
				</div>
			</div>
		</SectionContainer>
	);
}
