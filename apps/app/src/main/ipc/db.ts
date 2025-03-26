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

ipcMain.handle(
	Channels.DB_ACTIVITIES,
	async (_event, params: { limit?: number; cursor?: string }) => {
		return db.getActivities(params);
	},
);

ipcMain.handle(
	Channels.DB_GEAR,
	async (
		_event,
		params: {
			cursor?: string;
			limit?: number;
			offset?: number;
		},
	) => {
		return db.getGears(params);
	},
);
