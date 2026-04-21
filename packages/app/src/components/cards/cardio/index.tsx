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
	showExtendedTextFields?: boolean;
	onActivityRefresh?: () => Promise<void> | void;
}

const DETAIL_ICON_SLOT_CLASS =
	"flex w-5 shrink-0 items-center justify-start text-gray-500";
const DETAIL_ICON_CLASS = "h-4 w-4";

export function CardioCard({
	activity,
	gears,
	showDetailsButton,
	showExtendedTextFields,
	onActivityRefresh,
}: CardioCardProps) {
	return (
		<ActivityCardTemplate
			activity={activity}
			gears={gears}
			showDetailsButton={showDetailsButton}
			showExtendedTextFields={showExtendedTextFields}
			onActivityRefresh={onActivityRefresh}
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
					<div className="flex min-w-0 items-center gap-2 text-sm">
						<span className={DETAIL_ICON_SLOT_CLASS}>
							<Clock size={16} className={DETAIL_ICON_CLASS} />
						</span>
						<span className="min-w-0 break-words">
							{formatDateWithTime(
								activityData.timestamp,
								activityData.timezone,
							)}
						</span>
					</div>
					<div className="flex min-w-0 items-center gap-2 text-sm">
						<span className={DETAIL_ICON_SLOT_CLASS}>
							<Timer size={16} className={DETAIL_ICON_CLASS} />
						</span>
						<span className="min-w-0 break-words">
							{formatDuration(activityData.duration)}
						</span>
					</div>
					<div className="flex min-w-0 items-center gap-2 text-sm">
						<span className={DETAIL_ICON_SLOT_CLASS}>
							<MapPin size={16} className={DETAIL_ICON_CLASS} />
						</span>
						<EditableText
							value={locationName}
							onSave={(value) => {
								setLocationName(value);
								if (value !== activityData.locationName) {
									void handleEditActivity("locationName", value);
								}
							}}
							className="min-w-0 flex-1"
						/>
					</div>
				</div>
			</SectionContainer>
			{isSwim && (
				<SectionContainer hasBorder>
					<div className="space-y-2">
						<div className="flex min-w-0 items-center gap-2 text-sm">
							<Waves size={16} className="shrink-0 text-gray-500" />
							<span className="min-w-0 break-words">Laps:</span>
							<EditableNumber
								value={laps}
								onSave={(value) => {
									setLaps(value);
									handleMetadataUpdate("laps", value);
								}}
								className="min-w-0 flex-1"
								min={0}
								step={1}
							/>
						</div>
						<div className="flex min-w-0 items-center gap-2 text-sm">
							<Waves size={16} className="shrink-0 text-gray-500" />
							<span className="min-w-0 break-words">Pool Length (m):</span>
							<EditableNumber
								value={poolLength}
								onSave={(value) => {
									setPoolLength(value);
									handleMetadataUpdate("length", value);
								}}
								className="min-w-0 flex-1"
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
