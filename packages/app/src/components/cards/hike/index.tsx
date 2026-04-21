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
	showExtendedTextFields?: boolean;
	onActivityRefresh?: () => Promise<void> | void;
}

const DETAIL_ICON_SLOT_CLASS =
	"flex w-5 shrink-0 items-center justify-start text-gray-500";
const DETAIL_ICON_CLASS = "h-4 w-4";

export function HikeCard({
	activity,
	gears,
	showDetailsButton,
	showExtendedTextFields,
	onActivityRefresh,
}: HikeCardProps) {
	return (
		<ActivityCardTemplate
			activity={activity}
			gears={gears}
			showDetailsButton={showDetailsButton}
			showExtendedTextFields={showExtendedTextFields}
			onActivityRefresh={onActivityRefresh}
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
				<div className="flex min-w-0 items-center gap-2 text-sm">
					<span className={DETAIL_ICON_SLOT_CLASS}>
						<Clock size={16} className={DETAIL_ICON_CLASS} />
					</span>
					<span className="min-w-0 break-words">
						{formatDateWithTime(activityData.timestamp, activityData.timezone)}
					</span>
				</div>
				<div className="flex min-w-0 items-center gap-2 text-sm">
					<span className={DETAIL_ICON_SLOT_CLASS}>
						<MapPin size={16} className={DETAIL_ICON_CLASS} />
					</span>
					<EditableText
						value={locationName}
						onSave={handleLocationNameChange}
						className="min-w-0 flex-1"
					/>
				</div>
				<div className="flex min-w-0 items-center gap-2 text-sm">
					<span className={DETAIL_ICON_SLOT_CLASS}>
						<MapIcon size={16} className={DETAIL_ICON_CLASS} />
					</span>
					<EditableText
						value={locationCountry}
						onSave={handleLocationCountryChange}
						className="min-w-0 flex-1"
					/>
				</div>
				<div className="flex min-w-0 items-center gap-2 text-sm">
					<span className={DETAIL_ICON_SLOT_CLASS}>
						<Route size={16} className={DETAIL_ICON_CLASS} />
					</span>
					<span className="min-w-0 break-words">
						{formatDistance(activityData.distance)} •{" "}
						{formatDuration(activityData.duration)}
					</span>
				</div>
			</div>
		</SectionContainer>
	);
}
