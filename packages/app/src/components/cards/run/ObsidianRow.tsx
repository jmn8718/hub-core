import { formatDate } from "@repo/dates";
// import { Bounce, toast } from 'react-toastify';
import { type DbActivityPopulated, GearType, type IDbGear } from "@repo/types";
import { NotebookPen } from "lucide-react";
import { useState } from "react";
import { useLoading } from "../../../contexts/LoadingContext.js";
import { formatDistance, formatDuration } from "../../../utils/formatters.js";
import IconButton from "../../IconButton.js";

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

	const handleExport = async () => {
		setLocalLoading(true);
		setLoading(true);
		// const result = (await window.electron.ipcRenderer.invoke(
		//   Channels.OBSIDIAN_EXPORT_MANUAL,
		//   {
		//     fileFolderPath: formatDate(data.timestamp, 'YYYY-MM'),
		//     fileName: `${formatDate(data.timestamp, 'YYYY-MM-DD')}.md`,
		//     content: prepareObsidianFile(data, gears),
		//   },
		// )) as ProviderIpcResponse;
		// if (!result.success) {
		//   // handle error
		//   toast.error(result.error, {
		//     transition: Bounce,
		//   });
		// }
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
