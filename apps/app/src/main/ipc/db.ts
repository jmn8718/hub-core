import {
	type ActivitySubType,
	type ActivityType,
	Channels,
	type IActivityCreateInput,
	type IGearCreateInput,
	type IInbodyCreateInput,
	type IInbodyUpdateInput,
	type InbodyType,
} from "@repo/types";
import { ipcMain } from "electron";
import { manager } from "../client.js";
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
	Channels.DB_WEEKLY_OVERVIEW,
	async (
		_event,
		{
			limit,
		}: {
			limit?: number;
		},
	) => {
		return db.getWeeklyActivitiesOverview(limit);
	},
);

ipcMain.handle(
	Channels.DB_DAILY_OVERVIEW,
	async (
		_event,
		{
			startDate,
			endDate,
			periodType,
			periodCount,
		}: {
			startDate?: string;
			endDate?: string;
			periodType?: "days" | "weeks" | "months";
			periodCount?: number;
		},
	) => {
		return db.getDailyActivitiesOverview({
			startDate,
			endDate,
			periodType,
			periodCount,
		});
	},
);

ipcMain.handle(
	Channels.DB_ACTIVITIES,
	async (
		_event,
		params: {
			limit?: number;
			cursor?: string;
			offset?: number;
			type?: ActivityType;
			subtype?: ActivitySubType;
			startDate?: string;
			endDate?: string;
			search?: string;
			isEvent?: 0 | 1;
		},
	) => {
		return db.getActivities(params);
	},
);

ipcMain.handle(Channels.DB_ACTIVITY, async (_event, activityId: string) => {
	return db.getActivity(activityId);
});

ipcMain.handle(
	Channels.DB_ACTIVITY_CREATE,
	async (_event, params: { data: unknown }) => {
		return db.createActivity(params.data as IActivityCreateInput);
	},
);

ipcMain.handle(
	Channels.DB_ACTIVITY_DELETE,
	async (_event, params: { activityId: string }) => {
		return db.deleteActivity(params.activityId);
	},
);

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
				type?: ActivityType;
				subtype?: ActivitySubType;
				isEvent?: 0 | 1;
			};
		},
	) => {
		return db.editActivity(params.activityId, params.data).then(() => {
			const updates: Promise<void>[] = [];
			if (typeof params.data.notes !== "undefined") {
				updates.push(
					manager.updateActivityNotes({
						activityId: params.activityId,
						notes: params.data.notes ?? null,
					}),
				);
			}
			if (typeof params.data.name !== "undefined") {
				updates.push(
					manager.updateActivityName({
						activityId: params.activityId,
						name: params.data.name ?? null,
					}),
				);
			}
			if (updates.length === 0) return undefined;
			return Promise.all(updates).then(() => undefined);
		});
	},
);

ipcMain.handle(
	Channels.DB_ACTIVITY_CONNECTION_LINK,
	async (
		_event,
		params: { activityId: string; providerActivityId: string },
	) => {
		return db.linkActivityConnection(
			params.activityId,
			params.providerActivityId,
		);
	},
);

ipcMain.handle(
	Channels.DB_ACTIVITY_CONNECTION_UNLINK,
	async (
		_event,
		params: { activityId: string; providerActivityId: string },
	) => {
		return db.unlinkActivityConnection(
			params.activityId,
			params.providerActivityId,
		);
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
	Channels.DB_GEAR_CREATE,
	async (_event, params: IGearCreateInput) => {
		return db.createGear(params);
	},
);

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

ipcMain.handle(
	Channels.DB_INBODY_DATA,
	async (
		_event,
		params: {
			type: InbodyType;
		},
	) => {
		return db.getInbodyData(params);
	},
);

ipcMain.handle(
	Channels.DB_INBODY_CREATE,
	async (_event, params: IInbodyCreateInput) => {
		return db.createInbodyData(params);
	},
);

ipcMain.handle(
	Channels.DB_INBODY_UPDATE,
	async (_event, params: IInbodyUpdateInput) => {
		return db.updateInbodyData(params);
	},
);
