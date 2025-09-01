import { Channels, type Providers } from "@repo/types";
import { ipcMain } from "electron";
import { manager } from "../client.js";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

ipcMain.handle(
	Channels.ACTIVITY_UPLOAD_FILE,
	async (
		_event,
		params: {
			provider: Providers;
			providerActivityId: string;
			target: Providers;
			downloadPath: string;
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
			downloadPath: string;
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

ipcMain.handle(
	Channels.ACTIVITY_EXPORT_OBSIDIAN,
	async (
		_event,
		params: {
			folderPath: string;
			fileName: string;
			content: string;
			fileFormat: string;
		},
	) => {
		try {
			if (!existsSync(params.folderPath)) {
				mkdirSync(params.folderPath, { recursive: true } );
			}
			let filePath = join(params.folderPath, `${params.fileName}.${params.fileFormat}`);
			// start at 1, so if it exists, we want to have index 2
			let index = 1;
			while (existsSync(filePath)) {
				index += 1;
				filePath = join(params.folderPath, `${params.fileName}_${index}.${params.fileFormat}`);
			}
			writeFileSync(filePath, params.content, {
				encoding: 'utf-8',
			});
			return {
				success: true
			}
		} catch(error: unknown) {
			console.error("Error exporting to Obsidian", error);
			return {
        success: false,
        error: (error as Error).message,
      };
		}
	},
);
