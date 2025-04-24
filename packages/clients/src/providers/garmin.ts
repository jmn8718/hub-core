import { isBefore } from "@repo/dates";
import type { IInsertActivityPayload, IInsertGearPayload } from "@repo/db";
import {
	ActivitySubType,
	ActivityType,
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
import type { Client } from "./Client.js";

const localCache: Record<string, Gear[]> = {};

function mapActivity({
	isActivityDetails,
	activity,
}:
	| { isActivityDetails: true; activity: IActivityDetails }
	| { isActivityDetails: false; activity: IActivity }): IDbActivity {
	const manufacturer = isActivityDetails
		? activity.metadataDTO.manufacturer
		: activity.manufacturer;
	const isManual = isActivityDetails
		? activity.metadataDTO.manualActivity
		: activity.manualActivity;
	const deviceId = isActivityDetails
		? activity.metadataDTO.deviceMetaDataDTO.deviceId
		: activity.deviceId;
	return {
		id: activity.activityId.toString(),
		timestamp: new Date(
			isActivityDetails
				? activity.summaryDTO.startTimeLocal
				: activity.beginTimestamp,
		).toISOString(),
		name: activity.activityName || "",
		distance: Math.round(
			isActivityDetails ? activity.summaryDTO.distance : activity.distance,
		),
		duration: Math.round(
			isActivityDetails ? activity.summaryDTO.duration : activity.duration,
		),
		manufacturer:
			manufacturer ||
			(isManual || deviceId.toString() !== "0" ? "garmin" : "coros"),
		locationName: activity.locationName || "",
		locationCountry: "",
		startLatitude:
			(isActivityDetails
				? activity.summaryDTO.startLatitude
				: activity.startLatitude) || 0,
		startLongitude:
			(isActivityDetails
				? activity.summaryDTO.startLongitude
				: activity.startLongitude) || 0,
		isEvent: 0,
		type: ActivityType.RUN,
		subtype: ActivitySubType.EASY_RUN,
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

	constructor() {
		this._client = new GarminConnect({
			username: "",
			password: "",
		});
		this._signedIn = false;
	}

	async connect({
		username,
		password,
	}: { username: string; password: string }) {
		try {
			await this._client.login(username, password);
			this._lastTokenRefreshed = new Date();
			this._signedIn = true;
		} catch (error) {
			this._signedIn = false;
			console.error(error);
			throw error;
		}
	}

	private populateActivityGear(activityId: number) {
		const cacheValue = localCache[activityId.toString()];
		if (cacheValue) {
			return Promise.resolve(cacheValue);
		}
		console.debug(
			`${GarminClient.PROVIDER}: fetching activity gear ${activityId}`,
		);
		return this._client.getActivityGear(activityId.toString()).then((gears) => {
			localCache[activityId.toString()] = gears;
			return gears;
		});
	}

	private fetchRunningActivities(activitiesToFetch = 2, start = 0) {
		console.debug(
			`${GarminClient.PROVIDER}: fetching activities ${activitiesToFetch} ${start}`,
		);
		return this._client.getActivities(
			start,
			activitiesToFetch,
			GarminActivityType.Running,
		);
	}

	private async getActivities({
		size = 3,
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

	getActivity(id: string) {
		return this._client.getActivity({
			activityId: Number(id),
		});
	}

	public async syncActivity(
		activityId: string,
	): Promise<IInsertActivityPayload> {
		const activity = await this.getActivity(activityId);
		if (!activity) {
			throw new Error(`Missing activity ${activityId}`);
		}
		const gears = await this.populateActivityGear(activity.activityId);
		const dbActivity = mapActivity({ isActivityDetails: true, activity });
		return {
			activity: {
				data: dbActivity,
				providerActivity: {
					id: dbActivity.id,
					provider: GarminClient.PROVIDER,
					original: dbActivity.manufacturer.toLowerCase().includes("GARMIN"),
					timestamp: dbActivity.timestamp,
					// at the moment it does not store all the raw data as it includes a lot of data
					data: "{}", // JSON.stringify(activity),
				},
			},
			gears: gears.map((currentGear) => mapGear(currentGear)),
		};
	}

	async sync({
		id,
		lastTimestamp,
	}: {
		id?: string;
		lastTimestamp?: string;
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
		return pMap(
			newActivities,
			(activity) => this.syncActivity(activity.activityId.toString()),
			{
				concurrency: 1,
			},
		);
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
}
