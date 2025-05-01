import { Channels, type Providers } from "@repo/types";
import { ipcMain } from "electron";
import { manager } from "../client.js";

ipcMain.handle(
	Channels.ACTIVITY_UPLOAD_FILE,
	async (
		_event,
		params: {
			provider: Providers;
			providerActivityId: string;
			target: Providers;
		},
	) => {
		return manager.uploadActivityFile(params);
	},
);

ipcMain.handle(
	Channels.ACTIVITY_DOWNLOAD_FILE,
	async (
		_event,
		params: {
			provider: Providers;
			providerActivityId: string;
		},
	) => {
		return manager.downloadActivityFile(params);
	},
);

ipcMain.handle(
	Channels.ACTIVITY_EXPORT_MANUAL,
	async (
		_event,
		params: {
			activityId: string;
			target: Providers;
		},
	) => {
		return manager.exportActivityManual(params);
	},
);
