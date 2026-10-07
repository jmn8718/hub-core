import { existsSync } from "node:fs";
import { join } from "node:path";
import { getFileExtension } from "@repo/clients";
import { Channels, type Providers, StorageKeys } from "@repo/types";
import { dialog, ipcMain, shell } from "electron";
import {
	initializeCorosClient,
	initializeGarminClient,
	initializeStravaClient,
} from "../client.js";
import { storage } from "../storage.js";
import { requireConfiguredFolder } from "./folders.js";
import { assertSafeSegment, isExternalHttpUrl } from "./guards.js";

// import other scoped ipc files
import "./activity.js";
import "./db.js";
import "./gear.js";
import "./providers.js";
import "./sync.js";

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

		if (key === StorageKeys.COROS_CREDENTIALS) {
			await initializeCorosClient();
		} else if (key === StorageKeys.GARMIN_CREDENTIALS) {
			await initializeGarminClient();
		} else if (key === StorageKeys.STRAVA_CREDENTIALS) {
			await initializeStravaClient();
		}
		return value;
	},
);

ipcMain.handle(Channels.STORE_GET, async (_event, { key }: { key: string }) => {
	return storage.getValue(key);
});

ipcMain.handle(Channels.OPEN_LINK, async (_event, { url }: { url: string }) => {
	// Only web links leave the app; file:, smb: or custom schemes are refused.
	if (typeof url !== "string" || !isExternalHttpUrl(url)) {
		throw new Error("Only http(s) links can be opened");
	}
	await shell.openExternal(url);
});

ipcMain.handle(
	Channels.FILE_EXISTS,
	async (
		_event,
		{ provider, activityId }: { provider: Providers; activityId: string },
	) => {
		const downloadsFolder = requireConfiguredFolder(
			StorageKeys.DOWNLOAD_FOLDER,
			"downloads",
		);
		const filePath = join(
			downloadsFolder,
			provider.toUpperCase(),
			`${assertSafeSegment(activityId, "activity id")}.${getFileExtension(provider)}`,
		);
		return existsSync(filePath);
	},
);
