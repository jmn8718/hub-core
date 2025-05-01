import { formatDate, isBefore } from "@repo/dates";
import type { IInsertActivityPayload, IInsertGearPayload } from "@repo/db";
import {
	ActivitySubType,
	ActivityType,
	type DbActivityPopulated,
	FileExtensions,
	GearType,
	type IDbActivity,
	Providers,
} from "@repo/types";
import {
	ActivityType as GarminActivityType,
	GarminConnect,
	type Gear,
	type IActivity,
	type IActivityDetails,
} from "garmin-connect";
import pMap from "p-map";
import pQueue from "p-queue";
import type { Client } from "./Client.js";
import type { Cache } from "./cache.js";

function mapActivityType(type: ActivityType) {
	if (type === ActivityType.RUN) return "running";
	if (type === ActivityType.SWIM) return "lap_swimming";
	throw new Error(`Activity type: ${type} not supported for manual upload`);
}

function mapActivity({
	activity,
}: { activity: IActivityDetails }): IDbActivity {
	const manufacturer = activity.metadataDTO.manufacturer;
	const isManual = activity.metadataDTO.manualActivity;
	const deviceId = activity.metadataDTO.deviceMetaDataDTO.deviceId || "";
	const type =
		activity.activityTypeDTO.typeKey === "running"
			? ActivityType.RUN
			: ActivityType.OTHER;
	const subtype =
		type === ActivityType.RUN
			? activity.eventTypeDTO.typeKey === "race"
				? ActivitySubType.ROAD
				: ActivitySubType.EASY_RUN
			: undefined;
	return {
		id: activity.activityId.toString(),
		timestamp: new Date(activity.summaryDTO.startTimeGMT).getTime(),
		timezone: activity.timeZoneUnitDTO.timeZone,
		name: activity.activityName || "",
		distance: Math.round(activity.summaryDTO.distance),
		duration: Math.round(activity.summaryDTO.duration),
		manufacturer:
			manufacturer ||
			(isManual || deviceId.toString() !== "0" ? "garmin" : "coros") ||
			"",
		locationName: activity.locationName || "",
		locationCountry: "",
		startLatitude: activity.summaryDTO.startLatitude || 0,
		startLongitude: activity.summaryDTO.startLongitude || 0,
		isEvent: activity.eventTypeDTO.typeKey === "race" ? 1 : 0,
		type,
		subtype,
	};
}

function mapGearType(gearTypeName: Gear["gearTypeName"]): GearType {
	switch (gearTypeName) {
		case "Shoes":
			return GearType.SHOES;
		case "Other":
			return GearType.INSOLE;
		case "Bike":
			return GearType.BIKE;
		default:
			return GearType.OTHER;
	}
}

function mapGear(gear: Gear): IInsertGearPayload {
	const codeName = gear.displayName || gear.customMakeModel || "n/a";
	const code = codeName.toLowerCase().replaceAll(" ", "-");
	return {
		providerGear: {
			id: gear.uuid.toString(),
			provider: GarminClient.PROVIDER,
			data: JSON.stringify(gear),
		},
		data: {
			name: gear.customMakeModel || gear.displayName || "",
			code,
			dateBegin: gear.dateBegin,
			dateEnd: gear.dateEnd || undefined,
			maximumDistance: gear.maximumMeters || 0,
			type: mapGearType(gear.gearTypeName),
			brand: gear.gearMakeName || "n/a",
		},
	};
}

export class GarminClient implements Client {
	private _client: GarminConnect;

	private _signedIn = false;

	private _userId = "";

	private _lastTokenRefreshed: Date | undefined;

	public static PROVIDER = Providers.GARMIN;

	public static EXTENSION = FileExtensions.TCX;

	private _queue = new pQueue({ concurrency: 4 });

	private _cache: Cache;

	constructor(cache: Cache) {
		this._client = new GarminConnect({
			username: "",
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
			await this._client.login(username, password);
			this._lastTokenRefreshed = new Date();
			this._signedIn = true;
			console.log(`${GarminClient.PROVIDER}: client connected`);
		} catch (error) {
			this._signedIn = false;
			console.error(error);
			throw error;
		}
	}

	private populateActivityGear(activityId: number) {
		const cacheKey = `garmin_gears_${activityId}`;

		const cacheValue =
			this._cache.get<Awaited<ReturnType<typeof this._client.getActivityGear>>>(
				cacheKey,
			);
		if (cacheValue) return Promise.resolve(cacheValue);

		console.debug(
			`${GarminClient.PROVIDER}: fetching activity gear ${activityId}`,
		);
		return this._client.getActivityGear(activityId.toString()).then((gears) => {
			this._cache.set(cacheKey, gears);
			return gears;
		});
	}

	private fetchRunningActivities(activitiesToFetch = 2, start = 0) {
		const cacheKey = `garmin_activities_list_${formatDate(new Date(), { format: "YYYY-MM-DD" })}_${start}_${activitiesToFetch}`;

		const cacheValue =
			this._cache.get<Awaited<ReturnType<typeof this._client.getActivities>>>(
				cacheKey,
			);
		if (cacheValue) return Promise.resolve(cacheValue);

		console.debug(
			`${GarminClient.PROVIDER}: fetching activities ${activitiesToFetch} ${start}`,
		);

		return this._client
			.getActivities(start, activitiesToFetch, GarminActivityType.Running)
			.then((data) => {
				this._cache.set(cacheKey, data);
				return data;
			});
	}

	private async getActivities({
		size = 2,
		lastId,
	}: {
		size?: number;
		lastId?: string;
	}) {
		console.debug(
			`${GarminClient.PROVIDER}: fetching activities with size ${size}, and ${lastId}`,
		);
		// add 1 day because coros filter by day precision
		let page = 0;
		let keepFetching = true;
		const data: IActivity[] = [];
		do {
			const activities = await this.fetchRunningActivities(size, page * size);
			const lastIdIndex = lastId
				? activities.findIndex(
						(activity) => activity.activityId.toString() === lastId,
					)
				: -1;
			const newActivities =
				lastIdIndex === -1 ? activities : activities.slice(0, lastIdIndex);
			console.debug(
				`${GarminClient.PROVIDER}: new activities ${newActivities.length} from ${lastIdIndex}`,
			);

			data.push(...newActivities);
			keepFetching = lastIdIndex === -1 && newActivities.length === size;
			page += 1;
			console.debug(
				GarminClient.PROVIDER,
				keepFetching,
				lastIdIndex !== -1,
				newActivities.length !== size,
			);
		} while (keepFetching);
		return data;
	}

	async getActivity(id: string) {
		const cacheKey = `garmin_activity_${id}`;
		const cacheValue =
			this._cache.get<Awaited<ReturnType<typeof this._client.getActivity>>>(
				cacheKey,
			);
		if (cacheValue) return cacheValue;
		const data = await this._client.getActivity({
			activityId: Number(id),
		});
		if (data) {
			this._cache.set(cacheKey, data);
		}
		return data;
	}

	public async syncActivity(
		activityId: string,
	): Promise<IInsertActivityPayload> {
		const activity = await this.getActivity(activityId);
		if (!activity) {
			throw new Error(`Missing activity ${activityId}`);
		}
		try {
			const dbActivity = mapActivity({ activity });
			const gears = await this.populateActivityGear(activity.activityId);
			return {
				activity: {
					data: dbActivity,
					providerActivity: {
						id: dbActivity.id,
						provider: GarminClient.PROVIDER,
						original: dbActivity.manufacturer.toLowerCase().includes("garmin"),
						timestamp: dbActivity.timestamp,
						// at the moment it does not store all the raw data as it includes a lot of data
						data: "{}", // JSON.stringify(activity),
					},
				},
				gears: gears.map((currentGear) => mapGear(currentGear)),
			};
		} catch (err) {
			console.error({
				activity,
			});
			throw err;
		}
	}

	async sync({
		id,
		lastTimestamp,
	}: {
		id?: string;
		lastTimestamp?: number;
	}): Promise<IInsertActivityPayload[]> {
		const newActivities = await this.getActivities({
			size: id ? 3 : 100,
			lastId: id,
		});
		console.log(
			`${GarminClient.PROVIDER}: ${newActivities.length} new activities from ${lastTimestamp || "now"}`,
		);
		if (newActivities.length === 0 || !newActivities[0]) {
			return [];
		}

		if (
			lastTimestamp &&
			isBefore(lastTimestamp, newActivities[0].beginTimestamp)
		) {
			console.log(
				`${GarminClient.PROVIDER}: up to date data [${lastTimestamp} | ${new Date(newActivities[0].beginTimestamp).toISOString()}]`,
			);
			return [];
		}
		const results = await pMap(newActivities, (activity) =>
			this._queue
				.add(() => this.syncActivity(activity.activityId.toString()))
				.catch((err) => {
					console.error(err);
				}),
		);
		return results.filter((value) => !!value) as IInsertActivityPayload[];
	}

	syncGears(): Promise<IInsertGearPayload[]> {
		return this._client
			.getUserSettings()
			.then((settings) => this._client.getGears(settings.id))
			.then((gears) => gears.map((currentGear) => mapGear(currentGear)));
	}

	async linkActivityGear(activityId: string, gearId: string) {
		await this._client.linkActivityGear(gearId, Number(activityId));
	}

	async unlinkActivityGear(activityId: string, gearId: string) {
		await this._client.unlinkActivityGear(gearId, Number(activityId));
	}

	createManualActivity(originalActivity: DbActivityPopulated): Promise<string> {
		const activityType = mapActivityType(originalActivity.type);
		return this._client
			.addActivity({
				activityName: originalActivity.name,
				description: originalActivity.notes ?? "",
				accessControlRuleDTO: {
					typeId: 2,
					typeKey: "private",
				},
				activityTypeDTO: {
					typeKey: activityType,
				},
				eventTypeDTO: {
					typeKey: "uncategorized",
				},
				metadataDTO: {
					associatedCourseId: null,
					autoCalcCalories: true,
					videoUrl: null,
				},
				summaryDTO: {
					averageHR: null,
					averagePower: null,
					averageRunCadence: null,
					averageTemperature: null,
					bmrCalories: 38,
					calories: 0,
					distance: originalActivity.distance,
					duration: originalActivity.duration,
					elapsedDuration: null,
					elevationGain: null,
					elevationLoss: null,
					endLatitude: null,
					endLongitude: null,
					maxElevation: null,
					minElevation: null,
					maxHR: null,
					maxRunCadence: null,
					maxTemperature: null,
					minTemperature: null,
					movingDuration: null,
					// @ts-expect-error
					startTimeLocal: null,
					startTimeGMT: new Date(originalActivity.timestamp).toISOString(),
					startLatitude: originalActivity.startLatitude,
					startLongitude: originalActivity.startLongitude,
					...(activityType === "lap_swimming"
						? {
								numberOfActiveLengths: 80,
								poolLength: 25,
								unitOfPoolLength: {
									unitKey: "meter",
								},
							}
						: {}),
				},
				timeZoneUnitDTO: {
					unitKey: originalActivity.timezone,
				},
			})
			.then((newActivity) => newActivity.activityId.toString());
	}
}
