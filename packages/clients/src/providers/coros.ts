import { dayjs, formatDate } from "@repo/dates";
import type { IInsertActivityPayload, IInsertGearPayload } from "@repo/db";
import {
	ActivitySubType,
	ActivityType,
	FileExtensions,
	type IDbActivity,
	Providers,
} from "@repo/types";
import { type ActivityData, CorosApi } from "coros-connect";
import pMap from "p-map";
import pQueue from "p-queue";
import type { Client } from "./Client.js";
import type { Cache } from "./cache.js";

function mapActivityDetails(activity: ActivityData, id: string): IDbActivity {
	return {
		id,
		timestamp: new Date(
			Math.floor(activity.summary.startTimestamp / 100) * 1000,
		).getTime(),
		timezone: "Etc/UTC",
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

	public static EXTENSION = FileExtensions.FIT;

	private _queue = new pQueue({ concurrency: 3 });

	private _cache: Cache;

	constructor(cache: Cache) {
		this._client = new CorosApi({
			email: "",
			password: "",
		});
		this._signedIn = false;
		this._cache = cache;
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
			console.log(`${CorosClient.PROVIDER}: client connected`);
		} catch (error) {
			this._signedIn = false;
			console.error(error);
			throw error;
		}
	}

	private _fetchRunningActivities({
		page,
		size,
		from,
		to,
	}: {
		page: number;
		size: number;
		from?: Date;
		to?: Date;
	}) {
		const cacheKey = `coros_activities_list_${formatDate(new Date(), { format: "YYYY-MM-DD" })}_${page}_${size}`;

		const cacheValue =
			this._cache.get<
				Awaited<ReturnType<typeof this._client.getActivitiesList>>
			>(cacheKey);
		if (cacheValue) return Promise.resolve(cacheValue);

		console.debug(
			`${CorosClient.PROVIDER}: fetching activities ${page} ${size} ${from} ${to}`,
		);

		return this._client
			.getActivitiesList({
				page,
				size,
				from,
				to,
			})
			.then((data) => {
				this._cache.set(cacheKey, data);
				return data;
			});
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
			const activities = await this._fetchRunningActivities({
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

	private getActivities(lastDate?: number) {
		// add 1 day because coros filter by day precision
		const from = lastDate ? dayjs(lastDate).add(1, "day").toDate() : undefined;
		return this.fetchRunningActivities({
			// if we have a from point, check few by few,
			// and if there is no from then we want to fetch all
			activitiesToFetch: from ? 5 : 100,
			from,
		});
	}

	async getActivity(id: string) {
		const cacheKey = `coros_activity_${id}`;
		const cacheValue =
			this._cache.get<
				Awaited<ReturnType<typeof this._client.getActivityDetails>>
			>(cacheKey);
		if (cacheValue) return cacheValue;
		const data = await this._client.getActivityDetails(id);
		if (data) {
			this._cache.set(cacheKey, data);
		}
		return data;
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
						original: data.manufacturer.toLowerCase().includes("coros"),
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
		lastTimestamp?: number;
	}): Promise<IInsertActivityPayload[]> {
		const newActivities = await this.getActivities(lastTimestamp);
		console.log(
			`${CorosClient.PROVIDER}: ${newActivities.length} new activities from ${lastTimestamp || "now"}`,
		);
		if (newActivities.length === 0) {
			return [];
		}
		const results = await pMap(newActivities, async (activity) =>
			this._queue
				.add(() => this.syncActivity(activity.labelId))
				.catch((err) => {
					console.error(err);
				}),
		);
		return results.filter((value) => !!value) as IInsertActivityPayload[];
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

	async createManualActivity(): Promise<string> {
		throw new Error("Not supported");
	}
}
