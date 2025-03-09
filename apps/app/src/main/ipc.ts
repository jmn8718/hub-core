import { Channels } from "@repo/types";
import { dialog, ipcMain } from "electron";

ipcMain.on("ping", () => console.log("pong"));

ipcMain.handle(
	Channels.FOLDER_GET,
	async (
		_event,
		{
			title,
			defaultPath,
		}: {
			defaultPath: string;
			title: string;
		},
	) => {
		const paths = dialog.showOpenDialogSync({
			defaultPath,
			properties: ["openDirectory"],
			title,
		});
		return paths ? paths[0] : "";
	},
);
