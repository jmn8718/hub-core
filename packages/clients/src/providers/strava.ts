import { isAfter, isBefore } from "@repo/dates";
import type {
	CacheDb,
	Db,
	IInsertActivityPayload,
	IInsertGearPayload,
} from "@repo/db";
import {
	ActivitySubType,
	ActivityType,
	type ApiCredentials,
	type DbActivityPopulated,
	FileExtensions,
	type IDbActivity,
	Providers,
	type StravaActivity,
	type StravaClientOptions,
} from "@repo/types";
import strava from "strava-v3/index.js";
import { type Client, generateActivityFilePath } from "./Client.js";
import { Base } from "./base.js";

const API_URL = "https://www.strava.com/api/v3";

function normalizeTimezone(timezone?: string | null): string {
	if (!timezone) return "Etc/UTC";
	const cleaned = timezone.replace(/\([^)]*\)\s*/g, "").trim();
	return cleaned || "Etc/UTC";
}

function mapActivityType(type: string, title: string): ActivityType {
	let defaultType = ActivityType.OTHER;
	if (title.toLowerCase().includes("run")) {
		defaultType = ActivityType.RUN;
	} else if (
		title.toLowerCase().includes("bike") ||
		title.toLowerCase().includes("ride")
	) {
		defaultType = ActivityType.BIKE;
	} else if (title.toLowerCase().includes("hike")) {
		defaultType = ActivityType.HIKE;
	}
	switch (type.toLowerCase()) {
		case "run":
			return ActivityType.RUN;
		case "ride":
			return ActivityType.BIKE;
		case "hike":
			return ActivityType.HIKE;
		default:
			return defaultType;
	}
}

function mapActivitySubtype(type: string): ActivitySubType {
	switch (type) {
		case "race":
			return ActivitySubType.ROAD;
		default:
			return ActivitySubType.EASY_RUN;
	}
}

function mapActivity(activity: StravaActivity): IDbActivity {
	const timezone = normalizeTimezone(activity.timezone);
	const type = mapActivityType(activity.type, activity.name);
	const subtype =
		type === ActivityType.RUN
			? mapActivitySubtype(activity.sport_type)
			: undefined;
	return {
		id: activity.id.toString(),
		timestamp: new Date(activity.start_date).getTime(),
		timezone,
		name: activity.name,
		distance: activity.distance,
		duration: activity.moving_time,
		manufacturer: activity.device_name || "",
		locationCountry: activity.location_country || "",
		locationName: activity.location_city || "",
		startLatitude: activity.start_latlng[0] || 0,
		startLongitude: activity.start_latlng[1] || 0,
		isEvent: activity.workout_type ? 1 : 0,
		type,
		subtype,
	};
}

export class StravaClient extends Base implements Client {
	private readonly _provider = Providers.STRAVA;

	private readonly _client: typeof strava.default;

	private _refreshToken: string | null = null;
	private _auth: strava.RefreshTokenResponse | null = null;

	public static PROVIDER = Providers.STRAVA;

	public static EXTENSION = FileExtensions.FIT;

	constructor(db: Db, cache: CacheDb, config: StravaClientOptions) {
		super(db, cache);
		// @ts-expect-error type issue with strava-v3
		// it says strava is a namespace but it is actually an object
		this._client = strava;
		this._client.config({
			access_token: config.accessToken || "",
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uri: config.redirectUri || "",
		});
	}

	private _notImplemented(): never {
		throw new Error("Strava client not implemented yet.");
	}

	private getAccessToken(refresh = false): Promise<string> {
		if (!this._refreshToken) {
			return Promise.reject(new Error("No refresh token available"));
		}
		if (
			!refresh &&
			this._auth?.expires_at &&
			isBefore(this._auth.expires_at * 1000 - 60000, Date.now())
		) {
			console.log("---- using cached access token ----");
			return Promise.resolve(
				`${this._auth.token_type} ${this._auth.access_token}`,
			);
		}
		console.log("---- requesting new access token from refresh token ----");
		return this._client.oauth
			.refreshToken(this._refreshToken)
			.then((response) => {
				if (!response.access_token) {
					throw new Error("Failed to refresh Strava access token");
				}
				if (response.refresh_token !== this._refreshToken) {
					this._refreshToken = response.refresh_token;
				}
				this._auth = response;
				return `${response.token_type} ${response.access_token}`;
			});
	}
	private _request<T>(url: string, options: RequestInit = {}): Promise<T> {
		return this.getAccessToken()
			.then((accessToken) =>
				fetch(`${API_URL}${url}`, {
					...options,
					headers: {
						Authorization: accessToken,
					},
				}),
			)
			.then((res) => {
				if (!res.ok) {
					console.error(res);
					throw new Error("Failed to fetch");
				}
				return res.json();
			});
	}

	async connect(params: ApiCredentials): Promise<void> {
		if (params.refreshToken !== this._refreshToken) {
			this._refreshToken = params.refreshToken;
		}
		await this.getAccessToken(true);
	}

	private fetchRunningActivities(
		params: {
			page?: number;
			per_page?: number;
			before?: number;
			after?: number;
		} = {},
	) {
		const { page = 1, per_page = 30, before, after } = params;
		console.debug(
			`${StravaClient.PROVIDER}: fetching activities ${page} ${per_page}`,
		);
		const query = new URLSearchParams({
			page: page.toString(),
			per_page: per_page.toString(),
			...(before && { before: before.toString() }),
			...(after && { after: after.toString() }),
		});
		return this._request<StravaActivity[]>(
			`/athlete/activities?${query.toString()}`,
		);
	}

	async sync(params: {
		id?: string;
		lastTimestamp?: number;
	}): Promise<IInsertActivityPayload[]> {
		const perPage = 50;
		const after = params.lastTimestamp
			? Math.floor(params.lastTimestamp / 1000)
			: undefined;
		const activities: StravaActivity[] = [];
		let page = 1;
		let keepFetching = true;
		while (keepFetching) {
			const response = await this.fetchRunningActivities({
				page,
				per_page: perPage,
				after,
			});
			if (response.length === 0) break;
			activities.push(...response);
			if (response.length < perPage) {
				keepFetching = false;
			} else {
				page += 1;
			}
		}

		const filteredActivities = params.lastTimestamp
			? activities.filter((activity) =>
					isAfter(params.lastTimestamp || 0, activity.start_date),
				)
			: activities;

		console.log(
			`${StravaClient.PROVIDER}: ${filteredActivities.length} new activities fetched (${activities.length} total fetched pages: ${page})`,
		);

		if (filteredActivities.length === 0) return [];

		return Promise.all(
			filteredActivities.map(async (activity) => {
				const dbActivity = mapActivity(activity);
				await this._cache.set<StravaActivity>(
					this._provider,
					"activity",
					dbActivity.id,
					activity,
				);
				return {
					activity: {
						data: dbActivity,
						providerActivity: {
							id: dbActivity.id,
							provider: StravaClient.PROVIDER,
							original: !(
								dbActivity.manufacturer.toLowerCase().includes("garmin") ||
								dbActivity.manufacturer.toLowerCase().includes("coros")
							),
							timestamp: dbActivity.timestamp,
							data: "{}",
						},
					},
				};
			}),
		);
	}

	async syncActivity(activityId: string): Promise<IInsertActivityPayload> {
		const activity = await this.getActivity(activityId);
		if (!activity) {
			throw new Error(`Missing activity ${activityId}`);
		}
		try {
			const dbActivity = mapActivity(activity);
			return {
				activity: {
					data: dbActivity,
					providerActivity: {
						id: dbActivity.id,
						provider: StravaClient.PROVIDER,
						original: dbActivity.manufacturer.toLowerCase().includes("garmin"),
						timestamp: dbActivity.timestamp,
						// at the moment it does not store all the raw data as it includes a lot of data
						data: "{}", // JSON.stringify(activity),
					},
				},
			};
		} catch (err) {
			console.error({
				activity,
			});
			throw err;
		}
	}

	async syncGears(): Promise<IInsertGearPayload[]> {
		this._notImplemented();
	}

	async linkActivityGear(_activityId: string, _gearId: string): Promise<void> {
		this._notImplemented();
	}

	async unlinkActivityGear(
		_activityId: string,
		_gearId: string,
	): Promise<void> {
		this._notImplemented();
	}

	async getActivity(id: string) {
		const cacheValue = await this._cache.get<StravaActivity>(
			this._provider,
			"activity",
			id,
		);
		if (cacheValue) return cacheValue;

		const data = await this._request<StravaActivity>(`/activities/${id}`);
		if (data) {
			this._cache.set<StravaActivity>(this._provider, "activity", id, data);
		}
		return data;
	}

	async createManualActivity(_data: DbActivityPopulated): Promise<string> {
		this._notImplemented();
	}

	async downloadActivity(
		_activityId: string,
		_downloadPath: string,
	): Promise<void> {
		this._notImplemented();
	}

	async uploadActivity(_filePath: string): Promise<string> {
		this._notImplemented();
	}

	generateActivityFilePath(downloadPath: string, activityId: string): string {
		return generateActivityFilePath(
			downloadPath,
			this._provider,
			activityId,
			StravaClient.EXTENSION,
		);
	}

	async gearStatusUpdate(_params: {
		providerUuid: string;
		status: "active" | "retired";
		dateEnd?: Date;
	}): Promise<void> {
		this._notImplemented();
	}
}
