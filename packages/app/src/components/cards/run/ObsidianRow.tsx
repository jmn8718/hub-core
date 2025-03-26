// import { Bounce, toast } from 'react-toastify';
import {
	ActivitySubType,
	type DbActivityPopulated,
	type IDbGear,
} from "@repo/types";
import { NotebookPen } from "lucide-react";
import { useState } from "react";
import { useLoading } from "../../../contexts/LoadingContext.js";
import { formatDate } from "../../../utils/date.js";
import { formatDistance, formatDuration } from "../../../utils/formatters.js";
import IconButton from "../../IconButton.js";

interface ObsidianRowProps {
	data: DbActivityPopulated;
	gears: IDbGear[];
}

const prepareObsidianFile = (data: DbActivityPopulated, gears: IDbGear[]) => {
	const insole = gears.find(({ id }) => id === data.insoleId);
	const shoe = gears.find(({ id }) => id === data.shoeId);
	return [
		"---",
		`date: ${formatDate(data.timestamp, "YYYY-MM-DDTHH:mm:ss")}`,
		`time: ${formatDuration(data.duration)}`,
		`distance: ${formatDistance(data.distance, false)}`,
		`shoes: ${shoe?.code ?? ""}`,
		`insole: ${insole?.code ?? ""}`,
		`type: ${data.subtype || ActivitySubType.EASY_RUN}`,
		"tags:",
		"  - running",
		`  - ${data.locationName.toLowerCase() || "cheongra"}`,
		`  - ${data.locationCountry.toLowerCase() || "korea"}`,
		"---",
		"",
		"## REVIEW",
		data.notes || "-",
	].join("\n");
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
