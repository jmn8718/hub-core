import type { IInsertActivityPayload } from "@repo/db";
import {
	ActivitySubType,
	ActivityType,
	type IDbActivity,
	Providers,
} from "@repo/types";
import { type ActivityData, CorosApi } from "coros-connect";
import dayjs from "dayjs";
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
				console.debug(
					CorosClient.PROVIDER,
					activities.count,
					activities.pageNumber,
					activities.totalPage,
				);
				console.debug(CorosClient.PROVIDER, page, data.length);
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
			activitiesToFetch: 100,
			from,
		});
	}

	getActivity(id: string) {
		return this._client.getActivityDetails(id);
	}

	public async syncActivity(
		activityId: string,
	): Promise<IInsertActivityPayload> {
		const activity = await this.getActivity(activityId);
		const data = mapActivityDetails(activity, activityId);
		return {
			data,
			providerData: {
				id: activityId,
				provider: CorosClient.PROVIDER,
				original: data.manufacturer.toLowerCase().includes("coros"),
				timestamp: data.timestamp,
				data: JSON.stringify(activity),
			},
		};
	}

	async sync(lastTimestamp?: string): Promise<IInsertActivityPayload[]> {
		const newActivities = await this.getActivities(lastTimestamp);

		if (newActivities.length === 0) {
			console.log(
				`${CorosClient.PROVIDER}: no new activities from ${lastTimestamp}`,
			);
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
}
