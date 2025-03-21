import { Channels } from "@repo/types";
import { ipcMain } from "electron";
import { db } from "../db.js";

ipcMain.handle(
	Channels.DB_OVERVIEW,
	async (
		_event,
		{
			limit,
		}: {
			limit?: number;
		},
	) => {
		return db.getActivitiesOverview(limit);
	},
);
