import { formatDateWithTime } from "@repo/dates";
import {
	ActivitySubType,
	type DbActivityPopulated,
	type IDbGear,
} from "@repo/types";
import { Clock, MapIcon, MapPin, Route } from "lucide-react";
import { useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import {
	useDataClient,
	useLoading,
	useTheme,
} from "../../../contexts/index.js";
import { formatDistance, formatDuration } from "../../../utils/formatters.js";
import { SectionContainer } from "../../SectionContainer.js";
import { EditableText } from "../../forms/EditableText.js";
import { ActivityCardTemplate } from "../ActivityCardTemplate.js";
import type { ActivityCardTemplateRenderProps } from "../ActivityCardTemplate.js";

interface BikeCardProps {
	activity: DbActivityPopulated;
	gears: IDbGear[];
}

export function BikeCard({ activity, gears }: BikeCardProps) {
	return (
		<ActivityCardTemplate activity={activity} gears={gears}>
			{(context) => <BikeCardBody context={context} />}
		</ActivityCardTemplate>
	);
}

function BikeCardBody({
	context,
}: {
	context: ActivityCardTemplateRenderProps;
}) {
	const { isDarkMode } = useTheme();
	const { activityData, handleEditActivity, refreshActivity } = context;
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
	const [locationName, setLocationName] = useState(
		activityData.locationName || "",
	);
	const [locationCountry, setLocationCountry] = useState(
		activityData.locationCountry || "",
	);
	const [selectedSubtype, setSelectedSubtype] = useState<ActivitySubType | "">(
		(activityData.subtype as ActivitySubType) || "",
	);

	useEffect(() => {
		setLocationName(activityData.locationName || "");
		setLocationCountry(activityData.locationCountry || "");
		setSelectedSubtype((activityData.subtype as ActivitySubType) || "");
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

	const hasSubtypeChanged =
		(selectedSubtype || "") !== (activityData.subtype || "");

	const handleSubtypeUpdate = async () => {
		if (!hasSubtypeChanged) return;
		setLocalLoading(true);
		const payload: { subtype?: ActivitySubType } = {};
		if (selectedSubtype) payload.subtype = selectedSubtype;
		const result = await client.editActivity(activityData.id, payload);
		if (!result.success) {
			toast.error(result.error, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		} else {
			await refreshActivity();
		}
		setTimeout(() => {
			setLocalLoading(false);
		}, 250);
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
			<SectionContainer hasBorder className="space-y-3">
				<div className="text-sm font-medium">Subtype</div>
				<div className="flex flex-col gap-2 md:flex-row md:items-center">
					<select
						className="rounded border border-gray-300 bg-transparent px-3 py-2 text-sm"
						value={selectedSubtype}
						onChange={(event) =>
							setSelectedSubtype(event.target.value as ActivitySubType | "")
						}
					>
						{["", ...Object.values(ActivitySubType)].map((option) => (
							<option key={option || "none"} value={option}>
								{option || "None"}
							</option>
						))}
					</select>
					<button
						type="button"
						onClick={handleSubtypeUpdate}
						disabled={!hasSubtypeChanged}
						className="rounded border border-blue-500 px-4 py-2 text-sm font-medium text-blue-600 disabled:border-gray-300 disabled:text-gray-400"
					>
						Apply subtype
					</button>
				</div>
			</SectionContainer>
		</>
	);
}
