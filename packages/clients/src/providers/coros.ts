import { dayjs } from "@repo/dates";
import type { IInsertActivityPayload, IInsertGearPayload } from "@repo/db";
import {
	ActivitySubType,
	ActivityType,
	type IDbActivity,
	Providers,
} from "@repo/types";
import { type ActivityData, CorosApi } from "coros-connect";
import pMap from "p-map";
import type { Client } from "./Client.js";

const EXPORT_FILE_EXTENSION = "fit";

function mapActivityDetails(activity: ActivityData, id: string): IDbActivity {
	return {
		id,
		timestamp: new Date(
			Math.floor(activity.summary.startTimestamp / 100) * 1000,
		).toISOString(),
		name: activity.summary.name || "",
		distance: Math.round(activity.summary.distance / 100),
		duration: Math.round(activity.summary.workoutTime / 100),
		manufacturer: activity.deviceList[0]?.name || "",
		locationName: "",
		locationCountry: "",
		startLatitude:
			(activity.lapList[0]?.lapItemList[0]?.startGpsLat || 0) / 10000000,
		startLongitude:
			(activity.lapList[0]?.lapItemList[0]?.startGpsLon || 0) / 10000000,
		isEvent: 0,
		type: ActivityType.RUN,
		subtype: ActivitySubType.EASY_RUN,
	};
}

export class CorosClient implements Client {
	private _client: CorosApi;

	private _signedIn = false;

	private _userId = "";

	private _lastTokenRefreshed: Date | undefined;

	public static PROVIDER = Providers.COROS;

	constructor() {
		this._client = new CorosApi({
			email: "",
			password: "",
		});
		this._signedIn = false;
	}

	async connect({
		username,
		password,
	}: { username: string; password: string }) {
		try {
			const result = await this._client.login(username, password);
			this._userId = result.userId;
			this._lastTokenRefreshed = new Date();
			this._signedIn = true;
		} catch (error) {
			this._signedIn = false;
			console.error(error);
			throw error;
		}
	}

	private async fetchRunningActivities({
		activitiesToFetch = 2,
		from,
		to,
	}: {
		activitiesToFetch?: number;
		from?: Date;
		to?: Date;
	}) {
		let keepFetching = true;
		// coros starts on page 1
		let page = 1;
		const data: Awaited<
			ReturnType<typeof this._client.getActivitiesList>
		>["dataList"] = [];

		do {
			const activities = await this._client.getActivitiesList({
				page,
				size: activitiesToFetch,
				from,
				to,
			});
			if (activities?.dataList) {
				const activitiesList = activities.dataList.filter(
					({ sportType }) => sportType === 100 || sportType === 101,
				);
				data.push(...activitiesList);
				console.debug(CorosClient.PROVIDER, {
					count: activities.count,
					pageNumber: activities.pageNumber,
					totalPage: activities.totalPage,
				});
				console.debug(CorosClient.PROVIDER, { page, dataLength: data.length });
				keepFetching = activities.dataList.length === activitiesToFetch;
				page += 1;
			} else {
				keepFetching = false;
			}
		} while (keepFetching);
		return data;
	}

	private getActivities(lastDate?: string) {
		// add 1 day because coros filter by day precision
		const from = lastDate ? dayjs(lastDate).add(1, "day").toDate() : undefined;
		return this.fetchRunningActivities({
			// if we have a from point, check few by few,
			// and if there is no from then we want to fetch all
			activitiesToFetch: from ? 5 : 100,
			from,
		});
	}

	getActivity(id: string) {
		return this._client.getActivityDetails(id);
	}

	public syncActivity(activityId: string): Promise<IInsertActivityPayload> {
		return this.getActivity(activityId).then((activity) => {
			const data = mapActivityDetails(activity, activityId);
			return {
				activity: {
					data,
					providerActivity: {
						id: activityId,
						provider: CorosClient.PROVIDER,
						original: data.manufacturer.toLowerCase().includes("COROS"),
						timestamp: data.timestamp,
						// at the moment it does not store all the raw data as it includes a lot of data
						data: "{}", // JSON.stringify(activity),
					},
				},
			};
		});
	}

	async sync({
		lastTimestamp,
	}: {
		lastTimestamp?: string;
	}): Promise<IInsertActivityPayload[]> {
		const newActivities = await this.getActivities(lastTimestamp);
		console.log(
			`${CorosClient.PROVIDER}: ${newActivities.length} new activities from ${lastTimestamp || "now"}`,
		);
		if (newActivities.length === 0) {
			return [];
		}
		return pMap(
			newActivities,
			async (activity) => this.syncActivity(activity.labelId),
			{
				concurrency: 1,
			},
		);
	}

	async syncGears(): Promise<IInsertGearPayload[]> {
		throw new Error("Not supported");
	}

	async linkActivityGear(activityId: string, gearId: string) {
		throw new Error("Not supported");
	}

	async unlinkActivityGear(activityId: string, gearId: string) {
		throw new Error("Not supported");
	}
}
