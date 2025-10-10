import { existsSync } from "node:fs";
import { join } from "node:path";
import { getFileExtension } from "@repo/clients";
import { Channels, type Providers, StorageKeys } from "@repo/types";
import { dialog, ipcMain, shell } from "electron";
import { storage } from "../storage.js";

// import other scoped ipc files
import "./activity.js";
import "./db.js";
import "./gear.js";
import "./providers.js";

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

ipcMain.handle(Channels.OPEN_LINK, async (_event, { url }: { url: string }) => {
	shell.openExternal(url);
});

ipcMain.handle(
	Channels.FILE_EXISTS,
	async (
		_event,
		{ provider, activityId }: { provider: Providers; activityId: string },
	) => {
		const downloadsFolder = storage.getValue(
			StorageKeys.DOWNLOAD_FOLDER,
		) as string;
		if (!downloadsFolder) {
			throw new Error("Missing downloads folder");
		}
		const filePath = join(
			downloadsFolder,
			provider.toUpperCase(),
			`${activityId}.${getFileExtension(provider)}`,
		);
		return existsSync(filePath);
	},
);
