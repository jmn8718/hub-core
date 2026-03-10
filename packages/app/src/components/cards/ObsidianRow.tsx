import { formatDate } from "@repo/dates";
import {
	ActivityType,
	type DbActivityPopulated,
	GearType,
	type IDbGear,
	StorageKeys,
} from "@repo/types";
import { NotebookPen } from "lucide-react";
import { useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useLoading } from "../../contexts/LoadingContext.js";
import { useDataClient, useStore } from "../../contexts/index.js";
import { formatDistance, formatDuration } from "../../utils/formatters.js";
import { generateExternalLink } from "../../utils/providers.js";
import IconButton from "../IconButton.js";

interface ObsidianRowProps {
	data: DbActivityPopulated;
	gears: IDbGear[];
}

type ObsidianDefaults = {
	defaultCity?: string;
	defaultCountry?: string;
};

const resolveLocationTag = (
	locationValue: string | undefined,
	fallbackValue?: string,
) => {
	const preferred = locationValue?.trim();
	if (preferred) return preferred.toLowerCase();
	const fallback = fallbackValue?.trim();
	if (fallback) return fallback.toLowerCase();
	return "";
};

const prepareObsidianRunningFile = (
	data: DbActivityPopulated,
	gears: IDbGear[],
	defaults: ObsidianDefaults,
) => {
	const shoeGear = data.gears.find((gear) => gear.type === GearType.SHOES);
	const insoleGear = data.gears.find((gear) => gear.type === GearType.INSOLE);
	const insole = gears.find(({ id }) => id === insoleGear?.id);
	const shoe = gears.find(({ id }) => id === shoeGear?.id);
	const locationName = resolveLocationTag(
		data.locationName,
		defaults.defaultCity,
	);
	const locationCountry = resolveLocationTag(
		data.locationCountry,
		defaults.defaultCountry,
	);
	return [
		"---",
		`date: ${formatDate(new Date(data.timestamp), { format: "YYYY-MM-DDTHH:mm:ss", timezone: data.timezone })}`,
		`time: ${formatDuration(data.duration)}`,
		`distance: ${formatDistance(data.distance, false)}`,
		`shoes: ${shoe?.code ?? ""}`,
		`insole: ${insole?.code ?? ""}`,
		data.subtype ? `type: ${data.subtype}` : "",
		"tags:",
		"  - running",
		locationName ? `  - ${locationName}` : "",
		locationCountry ? `  - ${locationCountry}` : "",
		"---",
		data.connections.length > 0
			? [
					"\n## CONNECTIONS",
					...data.connections.map(
						(connection) =>
							`- [${connection.provider}](${generateExternalLink(connection.provider, connection.id)})`,
					),
				].join("\n")
			: "",
		"\n## REVIEW",
		data.notes || "-",
	];
};

const prepareObsidianSwimmingFile = (
	data: DbActivityPopulated,
	defaults: ObsidianDefaults,
) => {
	const swimMetadata =
		data.type === ActivityType.SWIM && data.metadata
			? data.metadata
			: undefined;
	const laps =
		swimMetadata && typeof swimMetadata.laps === "number"
			? swimMetadata.laps
			: 0;
	const poolLength =
		swimMetadata && typeof swimMetadata.length === "number"
			? swimMetadata.length
			: 0;
	return [
		"---",
		`date: ${formatDate(new Date(data.timestamp), { format: "YYYY-MM-DDTHH:mm:ss", timezone: data.timezone })}`,
		`time: ${formatDuration(data.duration)}`,
		`length: ${poolLength}`,
		`laps: ${laps}`,
		data.subtype ? `type: ${data.subtype}` : "",
		"tags:",
		"  - swim",
		`  - ${resolveLocationTag(data.locationName, defaults.defaultCity)}`,
		`  - ${resolveLocationTag(data.locationCountry, defaults.defaultCountry)}`,
		"---",
	];
};

const prepareObsidianCyclingFile = (
	data: DbActivityPopulated,
	gears: IDbGear[],
	defaults: ObsidianDefaults,
) => {
	const bikeGear = data.gears.find((gear) => gear.type === GearType.BIKE);
	const bike = gears.find(({ id }) => id === bikeGear?.id);
	return [
		"---",
		`date: ${formatDate(new Date(data.timestamp), { format: "YYYY-MM-DDTHH:mm:ss", timezone: data.timezone })}`,
		`time: ${formatDuration(data.duration)}`,
		`distance: ${formatDistance(data.distance, false)}`,
		`bike: ${bike?.code ?? ""}`,
		data.subtype ? `type: ${data.subtype}` : "",
		"tags:",
		"  - cycling",
		`  - ${resolveLocationTag(data.locationName, defaults.defaultCity)}`,
		`  - ${resolveLocationTag(data.locationCountry, defaults.defaultCountry)}`,
		"---",
		data.connections.length > 0
			? [
					"\n## CONNECTIONS",
					...data.connections.map(
						(connection) =>
							`- [${connection.provider}](${generateExternalLink(connection.provider, connection.id)})`,
					),
				].join("\n")
			: "",
		"\n## REVIEW",
		data.notes || "-",
	];
};

const prepareObsidianGymFile = (
	data: DbActivityPopulated,
	defaults: ObsidianDefaults,
) => {
	return [
		"---",
		`date: ${formatDate(new Date(data.timestamp), { format: "YYYY-MM-DDTHH:mm:ss", timezone: data.timezone })}`,
		`time: ${formatDuration(data.duration)}`,
		data.subtype ? `type: ${data.subtype}` : "",
		"tags:",
		"  - gym",
		`  - ${resolveLocationTag(data.locationName, defaults.defaultCity)}`,
		`  - ${resolveLocationTag(data.locationCountry, defaults.defaultCountry)}`,
		"---",
		"\n# WORKOUT",
		data.notes || "-",
	];
};

const generateContent = (
	data: DbActivityPopulated,
	gears: IDbGear[],
	defaults: ObsidianDefaults,
): string[] => {
	switch (data.type) {
		case ActivityType.RUN:
			return prepareObsidianRunningFile(data, gears, defaults);
		case ActivityType.SWIM:
			return prepareObsidianSwimmingFile(data, defaults);
		case ActivityType.BIKE:
			return prepareObsidianCyclingFile(data, gears, defaults);
		case ActivityType.GYM:
			return prepareObsidianGymFile(data, defaults);
		default:
			return [];
	}
};

const prepareContent = (
	data: DbActivityPopulated,
	gears: IDbGear[],
	defaults: ObsidianDefaults,
) => {
	const content = generateContent(data, gears, defaults);
	return content.filter((row) => row.length).join("\n");
};

const SUPPORTED_ACTIVITY_TYPES = [
	ActivityType.RUN,
	ActivityType.SWIM,
	ActivityType.BIKE,
	ActivityType.GYM,
];

// eslint-disable-next-line react/function-component-definition
const ObsidianRow: React.FC<ObsidianRowProps> = ({ data, gears }) => {
	const { setLocalLoading } = useLoading();
	const [loading, setLoading] = useState(false);
	const { client } = useDataClient();
	const { getValue } = useStore();

	const handleExport = async () => {
		const obsidianDisabled = await getValue<string>(
			StorageKeys.OBSIDIAN_DISABLED,
		);
		if (obsidianDisabled === "true") return;
		const obsidianFolder = await getValue<string>(StorageKeys.OBSIDIAN_FOLDER);
		if (!obsidianFolder) return;
		const defaultCity = await getValue<string>(StorageKeys.DEFAULT_CITY);
		const defaultCountry = await getValue<string>(StorageKeys.DEFAULT_COUNTRY);
		setLocalLoading(true);
		setLoading(true);
		const content = prepareContent(data, gears, {
			defaultCity,
			defaultCountry,
		});

		if (content.length > 0) {
			const result = await client.exportActivityObsidian({
				folderPath: `${obsidianFolder}/${formatDate(data.timestamp, { format: "YYYY-MM" })}`,
				fileName: formatDate(data.timestamp, { format: "YYYY-MM-DD" }),
				fileFormat: "md",
				content,
			});
			if (!result.success) {
				toast.error(result.error, {
					transition: Bounce,
				});
			} else {
				toast.success("Activity exported", {
					transition: Bounce,
				});
			}
		} else {
			toast.info("No export available for this activity type", {
				transition: Bounce,
			});
		}
		setLoading(false);
		setLocalLoading(false);
	};

	// at the moment only running activities are supported
	if (!SUPPORTED_ACTIVITY_TYPES.includes(data.type)) return null;
	return (
		<IconButton
			icon={<NotebookPen size={16} />}
			label="Manual upload"
			onClick={handleExport}
			disabled={loading}
		/>
	);
};

export default ObsidianRow;
