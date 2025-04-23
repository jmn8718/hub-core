import { formatDateWithTime } from "@repo/dates";
import {
	AppType,
	type DbActivityPopulated,
	GearType,
	type IDbGear,
	Providers,
	StorageKeys,
} from "@repo/types";
import {
	Clock,
	Footprints,
	MapIcon,
	MapPin,
	Pencil,
	Route,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Bounce, toast } from "react-toastify";
import {
	useDataClient,
	useLoading,
	useStore,
	useTheme,
} from "../../../contexts/index.js";
import { formatDistance, formatDuration } from "../../../utils/formatters.js";
import ActivityTypeIcon from "../../ActivityTypeIcon.js";
import { Box } from "../../Box.js";
import { SectionContainer } from "../../SectionContainer.js";
import { EditableText } from "../../forms/EditableText.js";
import GearSelector from "./GearSelector.js";
import ObsidianRow from "./ObsidianRow.js";
import ProviderRow from "./ProviderRow.js";

interface RunningCardProps {
	activity: DbActivityPopulated;
	gears: IDbGear[];
}

export function RunningCard({ activity, gears }: RunningCardProps) {
	const { isDarkMode } = useTheme();
	const { type, client } = useDataClient();
	const { store } = useStore();
	const { setLocalLoading } = useLoading();
	const [activityData, setActivityData] =
		useState<DbActivityPopulated>(activity);

	const [activityName, setActivityName] = useState(activityData.name || "");
	const [locationName, setLocationName] = useState(
		activityData.locationName || "",
	);
	const [locationCountry, setLocationCountry] = useState(
		activityData.locationCountry || "",
	);
	const [activityNotes, setActivityNotes] = useState(activityData.notes || "");

	useEffect(() => {
		setActivityName(activityData.name || "");
		setLocationName(activityData.locationName || "");
		setLocationCountry(activityData.locationCountry || "");
		setActivityNotes(activityData.notes || "");
	}, [activityData]);

	const refreshActivity = async () => {
		const result = await client.getActivity(activityData.id);
		if (result.success) {
			if (result.data) setActivityData(result.data);
		} else {
			toast.error(result.error, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}
	};

	const handleGearSelect = (type: GearType) => async (gearId: string) => {
		setLocalLoading(true);
		const result = await client.providerGearLink(activityData.id, gearId);
		if (result.success) {
			refreshActivity();
		}
		setTimeout(() => {
			setLocalLoading(false);
		}, 250);
	};

	const handleGearRemove = (type: GearType) => async (gearId: string) => {
		setLocalLoading(true);
		const result = await client.providerGearUnlink(activityData.id, gearId);
		if (result.success) {
			refreshActivity();
		}
		setTimeout(() => {
			setLocalLoading(false);
		}, 250);
	};

	const handleEditActivity = async (
		activityId: string,
		field: string,
		value: string,
	) => {
		setLocalLoading(true);
		const result = await client.editActivity(activityId, { [field]: value });
		if (!result.success) {
			// handle error
			toast.error(result.error, {
				hideProgressBar: false,
				closeOnClick: false,
				transition: Bounce,
			});
		}
		refreshActivity();
		setTimeout(() => {
			setLocalLoading(false);
		}, 250);
	};

	const handleNotesChange = (newNotes: string) => {
		setActivityNotes(newNotes);
		if (newNotes !== activityData.notes) {
			handleEditActivity(activityData.id, "notes", newNotes);
		}
	};
	const handleNameChange = (newName: string) => {
		setActivityName(newName);
		if (newName !== activityData.name) {
			handleEditActivity(activityData.id, "name", newName);
		}
	};

	const handleLocationNameChange = (newLocationName: string) => {
		setLocationName(newLocationName);
		if (newLocationName !== activityData.locationName) {
			handleEditActivity(activityData.id, "locationName", newLocationName);
		}
	};
	const handleLocationCountryChange = (newLocationCountry: string) => {
		setLocationCountry(newLocationCountry);
		if (newLocationCountry !== activityData.locationCountry) {
			handleEditActivity(
				activityData.id,
				"locationCountry",
				newLocationCountry,
			);
		}
	};

	const garminConnection = activityData.connections.find(
		(connection) => connection.provider === Providers.GARMIN,
	);
	const corosConnection = activityData.connections.find(
		(connection) => connection.provider === Providers.COROS,
	);
	const shoeGear = activityData.gears.find(
		(gear) => gear.type === GearType.SHOES,
	);
	const insoleGear = activityData.gears.find(
		(gear) => gear.type === GearType.INSOLE,
	);

	return (
		<Box>
			<SectionContainer hasBorder>
				<div className="flex justify-between items-start">
					<div className="space-y-2">
						<div className="flex items-center gap-4">
							<ActivityTypeIcon type={activityData.type} />
							<EditableText
								value={activityName}
								onSave={handleNameChange}
								className="text-xl font-semibold h-8"
								placeholder="Enter activity name..."
							/>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<Clock size={16} className="text-gray-500" />
							<span className="pl-2">
								{formatDateWithTime(activityData.timestamp)}
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
				<div className="grid grid-cols-2 gap-4">
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
			<SectionContainer
				hasBorder
				className="flex justify-between items-center space-y-0"
			>
				<SectionContainer>
					<ProviderRow
						activityId={activity.id}
						provider={Providers.GARMIN}
						hasConnection={!!garminConnection}
						connectionId={garminConnection?.id}
						isOriginalSource={!!garminConnection?.original}
						hasBeenExported={!!corosConnection}
						refreshData={refreshActivity}
					/>
					<ProviderRow
						activityId={activity.id}
						provider={Providers.COROS}
						hasConnection={!!corosConnection}
						connectionId={corosConnection?.id}
						isOriginalSource={!!corosConnection?.original}
						hasBeenExported={!!garminConnection}
						refreshData={refreshActivity}
					/>
				</SectionContainer>
				{type === AppType.DESKTOP &&
					!store[StorageKeys.OBSIDIAN_DISABLED] &&
					store[StorageKeys.OBSIDIAN_FOLDER] && (
						<ObsidianRow data={activityData} gears={gears} />
					)}
			</SectionContainer>
			<SectionContainer>
				<div className="flex items-center gap-2">
					<Pencil size={16} className="text-gray-500" />
					<span
						className={`text-sm ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}
					>
						Notes
					</span>
				</div>
				<EditableText
					value={activityNotes}
					onSave={handleNotesChange}
					className="w-full"
					placeholder="Enter activity notes..."
					useTextArea
				/>
			</SectionContainer>
		</Box>
	);
}
