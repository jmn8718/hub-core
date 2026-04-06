import { dayjs } from "@repo/dates";
import type {
	CacheDb,
	Db,
	IInsertActivityPayload,
	IInsertGearPayload,
} from "@repo/db";
import {
	type ActivityMetadata,
	ActivitySubType,
	ActivityType,
	type DbActivityPopulated,
	FileExtensions,
	type IDbActivity,
	type LoginCredentials,
	Providers,
} from "@repo/types";
import { type ActivityData, CorosApi, downloadFile } from "coros-connect";
import pMap from "p-map";
import pQueue from "p-queue";
import { type Client, generateActivityFilePath } from "./Client.js";
import { Base } from "./base.js";

type CorosActivityDetails = Omit<
	ActivityData,
	"frequencyList" | "graphList" | "gpsLightDuration" | "pauseList"
>;

function mapActivityType(sportType: number): ActivityType {
	switch (sportType) {
		case 100:
		case 101:
		case 102:
		case 103:
			return ActivityType.RUN;
		case 104:
		case 900:
			return ActivityType.HIKE;
		case 200:
		case 201:
		case 202:
		case 203:
		case 204:
		case 205:
		case 299:
			return ActivityType.BIKE;
		case 300:
		case 301:
			return ActivityType.SWIM;
		case 400:
		case 401:
			return ActivityType.CARDIO;
		case 402:
			return ActivityType.GYM;
		default:
			return ActivityType.OTHER;
	}
}

function mapActivitySubtype(
	activityType: ActivityType,
	sportType: number,
): ActivitySubType | undefined {
	if (activityType !== ActivityType.RUN) return undefined;
	return sportType === 101 ? ActivitySubType.INDOOR : ActivitySubType.EASY_RUN;
}

function mapDownloadSportType(sportType?: number): string | undefined {
	if (sportType === undefined) return undefined;
	switch (sportType) {
		case 100:
		case 101:
		case 102:
		case 103:
		case 104:
		case 200:
		case 201:
		case 202:
		case 203:
		case 204:
		case 205:
		case 299:
		case 300:
		case 301:
			return sportType.toString();
		default:
			return undefined;
	}
}

function mapDbActivityToCorosSportType(
	activity?:
		| Pick<DbActivityPopulated, "type" | "subtype">
		| { type: string | null; subtype?: string | null }
		| null,
): string | undefined {
	if (!activity?.type) return undefined;
	switch (activity.type) {
		case ActivityType.RUN:
			return activity.subtype === ActivitySubType.INDOOR ? "101" : "100";
		case ActivityType.BIKE:
			return "200";
		case ActivityType.SWIM:
			return "300";
		case ActivityType.HIKE:
			return "104";
		case ActivityType.CARDIO:
			return "400";
		case ActivityType.GYM:
			return "402";
		default:
			return undefined;
	}
}

function buildMetadataForActivity(params: {
	type: ActivityType;
	distance: number;
	duration: number;
	averageSpeed?: number | null;
	averageHeartRate?: number | null;
	maximumHeartRate?: number | null;
}): ActivityMetadata | undefined {
	const metadata: Record<string, number> = {};
	const averageSpeed =
		params.averageSpeed || (params.distance || 0) / (params.duration || 1);
	if (params.type === ActivityType.RUN) {
		metadata.averagePace = averageSpeed;
	}
	if (params.type === ActivityType.BIKE) {
		metadata.averageSpeed = averageSpeed;
	}
	if (params.averageHeartRate && params.averageHeartRate > 0) {
		metadata.averageHeartRate = params.averageHeartRate;
	}
	if (params.maximumHeartRate && params.maximumHeartRate > 0) {
		metadata.maximumHeartRate = params.maximumHeartRate;
	}
	return Object.keys(metadata).length > 0
		? (metadata as ActivityMetadata)
		: undefined;
}

function mapActivity(activity: CorosActivityDetails, id: string): IDbActivity {
	const type = mapActivityType(activity.summary.sportType);
	const subtype = mapActivitySubtype(type, activity.summary.sportType);
	const distance = Math.round((activity.summary.distance ?? 0) / 100);
	const duration = Math.round((activity.summary.workoutTime ?? 0) / 100);
	return {
		id,
		timestamp: new Date(
			Math.floor(activity.summary.startTimestamp / 100) * 1000,
		).getTime(),
		timezone: "Etc/UTC",
		name: activity.summary.name || "",
		distance,
		duration,
		manufacturer: activity.deviceList[0]?.name || "",
		locationName: "",
		locationCountry: "",
		startLatitude:
			(activity.lapList[0]?.lapItemList[0]?.startGpsLat || 0) / 10000000,
		startLongitude:
			(activity.lapList[0]?.lapItemList[0]?.startGpsLon || 0) / 10000000,
		isEvent: 0,
		metadata: buildMetadataForActivity({
			type,
			distance,
			duration,
			averageSpeed: activity.summary.avgMoveSpeed ?? activity.summary.avgSpeed,
			averageHeartRate: activity.summary.avgHr,
			maximumHeartRate: activity.summary.maxHr,
		}),
		type,
		subtype,
	};
}

export class CorosClient extends Base implements Client {
	private readonly _provider = Providers.COROS;

	private _client: CorosApi;

	private _signedIn = false;

	private _userId = "";

	private _lastTokenRefreshed: Date | undefined;

	public static PROVIDER = Providers.COROS;

	public static EXTENSION = FileExtensions.FIT;

	private _queue = new pQueue({ concurrency: 3 });

	constructor(db: Db, cache: CacheDb) {
		super(db, cache);
		this._client = new CorosApi({
			email: "",
			password: "",
		});
		this._signedIn = false;
	}

	async connect({ username, password }: LoginCredentials) {
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

	private _fetchActivities({
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
		console.debug(
			`${CorosClient.PROVIDER}: fetching activities ${page} ${size} ${from} ${to}`,
		);

		return this._client.getActivitiesList({
			page,
			size,
			from,
			to,
		});
	}

	private async fetchActivities({
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
			const activities = await this._fetchActivities({
				page,
				size: activitiesToFetch,
				from,
				to,
			});
			if (activities?.dataList) {
				data.push(...activities.dataList);
				console.debug(CorosClient.PROVIDER, {
					count: activities.count,
					pageNumber: activities.pageNumber,
					totalPage: activities.totalPage,
				});
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
		return this.fetchActivities({
			// if we have a from point, check few by few,
			// and if there is no from then we want to fetch all
			activitiesToFetch: from ? 5 : 100,
			from,
		});
	}

	async getActivity(
		id: string,
		options?: { force?: boolean; sportType?: string | number },
	) {
		if (!options?.force) {
			const cacheValue = await this._cache.get<CorosActivityDetails>(
				this._provider,
				"activity",
				id,
			);
			if (cacheValue) return cacheValue;
		}
		const { frequencyList, graphList, gpsLightDuration, pauseList, ...data } =
			await this._client.getActivityDetails(
				id,
				options?.sportType ? options.sportType.toString() : undefined,
			);
		if (data) {
			this._cache.set<CorosActivityDetails>(
				this._provider,
				"activity",
				id,
				data,
			);
		}
		return data;
	}

	public syncActivity(
		activityId: string,
		sportType?: string | number,
	): Promise<IInsertActivityPayload> {
		return this.getActivity(activityId, { sportType }).then((activity) => {
			const data = mapActivity(activity, activityId);
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
				.add(() => this.syncActivity(activity.labelId, activity.sportType))
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

	async downloadActivity(
		activityId: string,
		downloadPath: string,
	): Promise<void> {
		const dbActivity =
			await this._db.getActivityByProviderActivityId(activityId);
		const sportTypeFromDb = mapDbActivityToCorosSportType(dbActivity ?? null);
		const activity = await this.getActivity(activityId, {
			sportType: sportTypeFromDb,
		});
		const sportType =
			sportTypeFromDb ?? mapDownloadSportType(activity.summary.sportType);
		return this._client
			.getActivityDownloadFile({
				activityId,
				fileType: CorosClient.EXTENSION,
				sportType,
			})
			.then((fileUrl) => {
				const filePath = this.generateActivityFilePath(
					downloadPath,
					activityId,
				);
				return downloadFile({
					filePath,
					fileUrl,
				});
			});
	}

	async uploadActivity(filePath: string): Promise<string> {
		if (!this._userId) {
			const user = await this._client.getAccount();
			this._userId = user.userId;
		}
		return this._client
			.uploadActivityFile(filePath, this._userId)
			.then((response) => response.data.id);
	}

	generateActivityFilePath(downloadPath: string, activityId: string) {
		return generateActivityFilePath(
			downloadPath,
			CorosClient.PROVIDER,
			activityId,
			CorosClient.EXTENSION,
		);
	}

	async gearStatusUpdate(_params: {
		profileId: string;
		providerUuid: string;
		status: "active" | "retired";
		dateEnd?: Date;
	}) {
		throw new Error("Not supported");
	}

	async updateActivityNotes(_activityId: string, _notes?: string | null) {
		// TODO implement when coros-connect supports it
		return;
	}

	async updateActivityName(activityId: string, name?: string | null) {
		await this._client.updateActivityName({
			labelId: activityId,
			name: name ?? "",
		});
	}
}
