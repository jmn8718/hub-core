import { formatDateWithTime } from "@repo/dates";
import { type DbActivityPopulated, GearType, type IDbGear } from "@repo/types";
import { Clock, Footprints, MapIcon, MapPin, Route } from "lucide-react";
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
import GearSelector from "./GearSelector.js";

interface RunningCardProps {
	activity: DbActivityPopulated;
	gears: IDbGear[];
	showDetailsButton?: boolean;
}

export function RunningCard({
	activity,
	gears,
	showDetailsButton,
}: RunningCardProps) {
	return (
		<ActivityCardTemplate
			activity={activity}
			gears={gears}
			showDetailsButton={showDetailsButton}
		>
			{(context) => <RunningCardBody context={context} gears={gears} />}
		</ActivityCardTemplate>
	);
}

interface RunningBodyProps {
	context: ActivityCardTemplateRenderProps;
	gears: IDbGear[];
}

function RunningCardBody({ context, gears }: RunningBodyProps) {
	const { activityData, handleEditActivity, refreshActivity } = context;
	const { isDarkMode } = useTheme();
	const { client } = useDataClient();
	const { setLocalLoading } = useLoading();
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

	const handleGearSelect = (type: GearType) => async (gearId: string) => {
		setLocalLoading(true);
		const result = await client.providerGearLink(activityData.id, gearId);
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

	const handleGearRemove = (type: GearType) => async (gearId: string) => {
		setLocalLoading(true);
		const result = await client.providerGearUnlink(activityData.id, gearId);
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

	const shoeGear = activityData.gears.find(
		(gear) => gear.type === GearType.SHOES,
	);
	const insoleGear = activityData.gears.find(
		(gear) => gear.type === GearType.INSOLE,
	);

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
			<SectionContainer hasBorder>
				<div className="flex items-center gap-2">
					<Footprints size={16} className="text-gray-500" />
					<span
						className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Gear
					</span>
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<GearSelector
						activityDate={activityData.timestamp}
						type={GearType.SHOES}
						availableGear={gears}
						selectedGearId={shoeGear?.id}
						onSelect={handleGearSelect(GearType.SHOES)}
						onRemove={handleGearRemove(GearType.SHOES)}
					/>
					<GearSelector
						activityDate={activityData.timestamp}
						type={GearType.INSOLE}
						availableGear={gears}
						selectedGearId={insoleGear?.id}
						onSelect={handleGearSelect(GearType.INSOLE)}
						onRemove={handleGearRemove(GearType.INSOLE)}
					/>
				</div>
			</SectionContainer>
		</>
	);
}
