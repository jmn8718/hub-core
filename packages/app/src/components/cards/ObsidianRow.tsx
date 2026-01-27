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

const prepareObsidianRunningFile = (
	data: DbActivityPopulated,
	gears: IDbGear[],
) => {
	const shoeGear = data.gears.find((gear) => gear.type === GearType.SHOES);
	const insoleGear = data.gears.find((gear) => gear.type === GearType.INSOLE);
	const insole = gears.find(({ id }) => id === insoleGear?.id);
	const shoe = gears.find(({ id }) => id === shoeGear?.id);
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
		`  - ${data.locationName.toLowerCase() || "cheongra"}`,
		`  - ${data.locationCountry.toLowerCase() || "korea"}`,
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

const prepareObsidianSwimmingFile = (data: DbActivityPopulated) => {
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
		`  - ${data.locationName.toLowerCase() || "cheongra"}`,
		`  - ${data.locationCountry.toLowerCase() || "korea"}`,
		"---",
	];
};

const prepareObsidianCyclingFile = (
	data: DbActivityPopulated,
	gears: IDbGear[],
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
		`  - ${data.locationName.toLowerCase() || "cheongra"}`,
		`  - ${data.locationCountry.toLowerCase() || "korea"}`,
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

const prepareObsidianGymFile = (data: DbActivityPopulated) => {
	return [
		"---",
		`date: ${formatDate(new Date(data.timestamp), { format: "YYYY-MM-DDTHH:mm:ss", timezone: data.timezone })}`,
		`time: ${formatDuration(data.duration)}`,
		data.subtype ? `type: ${data.subtype}` : "",
		"tags:",
		"  - gym",
		`  - ${data.locationName.toLowerCase() || "cheongra"}`,
		`  - ${data.locationCountry.toLowerCase() || "korea"}`,
		"---",
		"\n# WORKOUT",
		data.notes || "-",
	];
};

const generateContent = (
	data: DbActivityPopulated,
	gears: IDbGear[],
): string[] => {
	switch (data.type) {
		case ActivityType.RUN:
			return prepareObsidianRunningFile(data, gears);
		case ActivityType.SWIM:
			return prepareObsidianSwimmingFile(data);
		case ActivityType.BIKE:
			return prepareObsidianCyclingFile(data, gears);
		case ActivityType.GYM:
			return prepareObsidianGymFile(data);
		default:
			return [];
	}
};

const prepareContent = (data: DbActivityPopulated, gears: IDbGear[]) => {
	const content = generateContent(data, gears);
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
		setLocalLoading(true);
		setLoading(true);
		const content = prepareContent(data, gears);

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
