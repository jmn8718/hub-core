import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Channels, type Providers, StorageKeys } from "@repo/types";
import { ipcMain } from "electron";
import { manager } from "../client.js";
import { requireConfiguredFolder } from "./folders.js";
import { assertInsideFolder, assertSafeSegment } from "./guards.js";

ipcMain.handle(
	Channels.ACTIVITY_UPLOAD_FILE,
	async (
		_event,
		params: {
			provider: Providers;
			providerActivityId: string;
			target: Providers;
			downloadPath?: string;
		},
	) => {
		// Files are only ever read from the configured downloads folder,
		// whatever path the renderer sends along.
		return manager.uploadActivityFile({
			...params,
			downloadPath: requireConfiguredFolder(
				StorageKeys.DOWNLOAD_FOLDER,
				"downloads",
			),
		});
	},
);

ipcMain.handle(
	Channels.ACTIVITY_DOWNLOAD_FILE,
	async (
		_event,
		params: {
			provider: Providers;
			providerActivityId: string;
			downloadPath?: string;
		},
	) => {
		return manager.downloadActivityFile({
			...params,
			downloadPath: requireConfiguredFolder(
				StorageKeys.DOWNLOAD_FOLDER,
				"downloads",
			),
		});
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
			// The note must land inside the configured vault, with a plain file
			// name: no separators, traversal or odd extensions from the renderer.
			const vault = requireConfiguredFolder(
				StorageKeys.OBSIDIAN_FOLDER,
				"Obsidian",
			);
			const folderPath = assertInsideFolder(
				params.folderPath,
				vault,
				"Export folder",
			);
			const fileName = assertSafeSegment(params.fileName, "file name");
			if (!/^[a-z0-9]{1,8}$/i.test(params.fileFormat)) {
				throw new Error("Invalid file format");
			}
			if (!existsSync(folderPath)) {
				mkdirSync(folderPath, { recursive: true });
			}
			// "wx" creates the file exclusively: it fails instead of following a
			// symbolic link or overwriting, so collisions move to the next index.
			let index = 1;
			while (true) {
				const suffix = index === 1 ? "" : `_${index}`;
				const filePath = join(
					folderPath,
					`${fileName}${suffix}.${params.fileFormat}`,
				);
				try {
					writeFileSync(filePath, params.content, {
						encoding: "utf-8",
						flag: "wx",
					});
					break;
				} catch (error) {
					if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
					index += 1;
					if (index > 1000) throw new Error("Too many notes with this name");
				}
			}
			return {
				success: true,
			};
		} catch (error: unknown) {
			console.error("Error exporting to Obsidian", error);
			return {
				success: false,
				error: (error as Error).message,
			};
		}
	},
);
