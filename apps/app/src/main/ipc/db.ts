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

ipcMain.handle(Channels.DB_ACTIVITY, async (_event, activityId: string) => {
	return db.getActivity(activityId);
});

ipcMain.handle(
	Channels.DB_ACTIVITY_EDIT,
	async (
		_event,
		params: {
			activityId: string;
			data: {
				locationName?: string;
				locationCountry?: string;
				name?: string;
				notes?: string;
			};
		},
	) => {
		return db.editActivity(params.activityId, params.data);
	},
);

ipcMain.handle(
	Channels.DB_GEARS,
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

ipcMain.handle(Channels.DB_GEAR, async (_event, gearId: string) => {
	return db.getGear(gearId);
});

ipcMain.handle(
	Channels.DB_GEAR_EDIT,
	async (
		_event,
		params: {
			gearId: string;
			data: {
				dateEnd?: string;
				code?: string;
				name?: string;
				maximumDistance?: string;
			};
		},
	) => {
		return db.editGear(params.gearId, params.data);
	},
);
