import { formatDate } from "@repo/dates";
// import { Bounce, toast } from 'react-toastify';
import { type DbActivityPopulated, GearType, type IDbGear, StorageKeys } from "@repo/types";
import { NotebookPen } from "lucide-react";
import { useState } from "react";
import { Bounce, toast } from "react-toastify";
import { useLoading } from "../../../contexts/LoadingContext.js";
import { formatDistance, formatDuration } from "../../../utils/formatters.js";
import IconButton from "../../IconButton.js";
import { useDataClient, useStore } from "../../../contexts/index.js";

interface ObsidianRowProps {
	data: DbActivityPopulated;
	gears: IDbGear[];
}

const prepareObsidianFile = (data: DbActivityPopulated, gears: IDbGear[]) => {
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
		`type: ${data.subtype}`,
		"tags:",
		` - ${data.type}`,
		data.locationName && `  - ${data.locationName.toLowerCase()}`,
		data.locationCountry && `  - ${data.locationCountry.toLowerCase()}`,
		"---",
		"",
		"## REVIEW",
		data.notes || "-",
	]
		.filter((row) => row.length)
		.join("\n");
};

// eslint-disable-next-line react/function-component-definition
const ObsidianRow: React.FC<ObsidianRowProps> = ({ data, gears }) => {
	const { setLocalLoading } = useLoading();
	const [loading, setLoading] = useState(false);
	const { client } = useDataClient();
		const { getValue } = useStore();

	const handleExport = async () => {
		const obsidianDisabled = await getValue<string>(StorageKeys.OBSIDIAN_DISABLED);
		if (obsidianDisabled === 'true') return
		const obsidianFolder = await getValue<string>(StorageKeys.OBSIDIAN_FOLDER);
		if (!obsidianFolder) return;
		setLocalLoading(true);
		setLoading(true);
		const result = await client.exportActivityObsidian({
			folderPath: `${obsidianFolder}/${formatDate(data.timestamp,{format:'YYYY-MM'})}`,
			fileName: formatDate(data.timestamp, {format:'YYYY-MM-DD'}),
			fileFormat: 'md',
			content: prepareObsidianFile(data, gears),
		})
		if (!result.success) {
			toast.error(result.error, {
				transition: Bounce,
			});
		} else {
			toast.success("Activity exported", {
				transition: Bounce,
			});
		}
		setLoading(false);
		setLocalLoading(false);
	};

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
