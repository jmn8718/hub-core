import { Channels } from "@repo/types";
import { dialog, ipcMain } from "electron";
import { storage } from "../storage.js";

// import other scoped ipc files
import "./db.js";
// import "./providers.js";

// implement common ipc messages
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

ipcMain.handle(
	Channels.STORE_SET,
	async (_event, { key, value }: { key: string; value: string }) => {
		storage.setValue(key, value);
		return value;
	},
);

ipcMain.handle(Channels.STORE_GET, async (_event, { key }: { key: string }) => {
	return storage.getValue(key);
});
