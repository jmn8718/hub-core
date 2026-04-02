import { writeFile } from "node:fs/promises";
import { formatDate, isAfter, isBefore } from "@repo/dates";
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

type StravaStream<T> = {
	data: T[];
	original_size: number;
	resolution: string;
	series_type: string;
};

type StravaActivityStreams = Partial<{
	time: StravaStream<number>;
	latlng: StravaStream<[number, number]>;
	altitude: StravaStream<number>;
	distance: StravaStream<number>;
	heartrate: StravaStream<number>;
	cadence: StravaStream<number>;
	watts: StravaStream<number>;
	temp: StravaStream<number>;
}>;

function normalizeTimezone(timezone?: string | null): string {
	if (!timezone) return "Etc/UTC";
	const cleaned = timezone.replace(/\([^)]*\)\s*/g, "").trim();
	return cleaned || "Etc/UTC";
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
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
		case "swim":
			return ActivityType.SWIM;
		case "workout":
			return ActivityType.GYM;
		default:
			return defaultType;
	}
}

function mapManualActivityType(type: ActivityType): string {
	switch (type) {
		case ActivityType.RUN:
			return "Run";
		case ActivityType.BIKE:
			return "Ride";
		case ActivityType.HIKE:
			return "Hike";
		case ActivityType.SWIM:
			return "Swim";
		case ActivityType.GYM:
		case ActivityType.CARDIO:
			return "Workout";
		default:
			throw new Error(`Activity type: ${type} not supported for manual upload`);
	}
}

function mapActivitySubtype(activity: StravaActivity): ActivitySubType {
	if (activity.trainer) {
		return ActivitySubType.INDOOR;
	}
	switch (activity.sport_type.toLowerCase()) {
		case "race":
			return ActivitySubType.ROAD;
		default:
			return ActivitySubType.EASY_RUN;
	}
}

function buildMetadataForActivity(
	type: ActivityType,
	activity: StravaActivity,
): ActivityMetadata | undefined {
	const metadata: Record<string, number> = {};
	if (type === ActivityType.RUN && activity.average_speed > 0) {
		metadata.averagePace = 1000 / activity.average_speed;
	}
	if (type === ActivityType.BIKE && activity.average_speed > 0) {
		metadata.averageSpeed = activity.average_speed;
	}
	if (activity.average_heartrate && activity.average_heartrate > 0) {
		metadata.averageHeartRate = activity.average_heartrate;
	}
	if (activity.max_heartrate && activity.max_heartrate > 0) {
		metadata.maximumHeartRate = activity.max_heartrate;
	}
	return Object.keys(metadata).length > 0
		? (metadata as ActivityMetadata)
		: undefined;
}

function mapTcxSport(type: ActivityType): string {
	switch (type) {
		case ActivityType.BIKE:
			return "Biking";
		case ActivityType.HIKE:
			return "Hiking";
		case ActivityType.SWIM:
			return "Other";
		case ActivityType.GYM:
		case ActivityType.CARDIO:
		case ActivityType.OTHER:
			return "Other";
		case ActivityType.RUN:
			return "Running";
		default:
			return "Running";
	}
}

function buildTcxContent(
	activity: StravaActivity,
	type: ActivityType,
	streams: StravaActivityStreams,
): string {
	const startDate = new Date(activity.start_date);
	const timeStream = streams.time?.data ?? [];
	const latLngStream = streams.latlng?.data ?? [];
	const altitudeStream = streams.altitude?.data ?? [];
	const distanceStream = streams.distance?.data ?? [];
	const heartRateStream = streams.heartrate?.data ?? [];
	const cadenceStream = streams.cadence?.data ?? [];
	const wattsStream = streams.watts?.data ?? [];
	const tempStream = streams.temp?.data ?? [];
	const streamLength = Math.max(
		timeStream.length,
		latLngStream.length,
		altitudeStream.length,
		distanceStream.length,
		heartRateStream.length,
		cadenceStream.length,
		wattsStream.length,
		tempStream.length,
	);
	const totalDistance = distanceStream.at(-1) ?? activity.distance ?? 0;
	const maximumHeartRate =
		heartRateStream.length > 0
			? Math.max(...heartRateStream)
			: (activity.max_heartrate ?? 0);

	const trackpoints =
		streamLength > 0
			? Array.from({ length: streamLength }, (_, index) => {
					const secondsOffset = timeStream[index] ?? index;
					const timestamp = new Date(
						startDate.getTime() + secondsOffset * 1000,
					).toISOString();
					const latlng = latLngStream[index];
					const altitude = altitudeStream[index];
					const distance = distanceStream[index];
					const heartRate = heartRateStream[index];
					const cadence = cadenceStream[index];
					const watts = wattsStream[index];
					const temperature = tempStream[index];

					return [
						"          <Trackpoint>",
						`            <Time>${timestamp}</Time>`,
						latlng
							? [
									"            <Position>",
									`              <LatitudeDegrees>${latlng[0]}</LatitudeDegrees>`,
									`              <LongitudeDegrees>${latlng[1]}</LongitudeDegrees>`,
									"            </Position>",
								].join("\n")
							: "",
						typeof altitude === "number"
							? `            <AltitudeMeters>${altitude}</AltitudeMeters>`
							: "",
						typeof distance === "number"
							? `            <DistanceMeters>${distance}</DistanceMeters>`
							: "",
						typeof heartRate === "number"
							? [
									"            <HeartRateBpm>",
									`              <Value>${Math.round(heartRate)}</Value>`,
									"            </HeartRateBpm>",
								].join("\n")
							: "",
						typeof cadence === "number"
							? `            <Cadence>${Math.round(cadence)}</Cadence>`
							: "",
						typeof watts === "number" || typeof temperature === "number"
							? [
									"            <Extensions>",
									'              <TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2">',
									typeof watts === "number"
										? `                <Watts>${Math.round(watts)}</Watts>`
										: "",
									typeof temperature === "number"
										? `                <Temp>${Math.round(temperature)}</Temp>`
										: "",
									"              </TPX>",
									"            </Extensions>",
								]
									.filter(Boolean)
									.join("\n")
							: "",
						"          </Trackpoint>",
					]
						.filter(Boolean)
						.join("\n");
				}).join("\n")
			: [
					"          <Trackpoint>",
					`            <Time>${startDate.toISOString()}</Time>`,
					"          </Trackpoint>",
				].join("\n");

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2 http://www.garmin.com/xmlschemas/TrainingCenterDatabasev2.xsd">',
		"  <Activities>",
		`    <Activity Sport=\"${mapTcxSport(type)}\">`,
		`      <Id>${startDate.toISOString()}</Id>`,
		`      <Lap StartTime="${startDate.toISOString()}">`,
		`        <TotalTimeSeconds>${activity.elapsed_time}</TotalTimeSeconds>`,
		`        <DistanceMeters>${totalDistance}</DistanceMeters>`,
		`        <MaximumSpeed>${activity.max_speed ?? 0}</MaximumSpeed>`,
		"        <Calories>0</Calories>",
		`        <AverageHeartRateBpm><Value>${Math.round(activity.average_heartrate ?? 0)}</Value></AverageHeartRateBpm>`,
		`        <MaximumHeartRateBpm><Value>${Math.round(maximumHeartRate)}</Value></MaximumHeartRateBpm>`,
		"        <Intensity>Active</Intensity>",
		"        <TriggerMethod>Manual</TriggerMethod>",
		"        <Track>",
		trackpoints,
		"        </Track>",
		"      </Lap>",
		`      <Notes>${escapeXml(activity.name)}</Notes>`,
		"    </Activity>",
		"  </Activities>",
		'  <Author xsi:type="Application_t">',
		"    <Name>hub-core</Name>",
		"  </Author>",
		"</TrainingCenterDatabase>",
	].join("\n");
}

function mapActivity(activity: StravaActivity): IDbActivity {
	const timezone = normalizeTimezone(activity.timezone);
	const type = mapActivityType(activity.type, activity.name);
	const subtype =
		type === ActivityType.RUN ? mapActivitySubtype(activity) : undefined;
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
		metadata: buildMetadataForActivity(type, activity),
		type,
		subtype,
	};
}

export class StravaClient extends Base implements Client {
	private readonly _provider = Providers.STRAVA;

	private readonly _client: typeof strava.default;

	private _refreshToken: string | null = null;
	private _auth: {
		access_token: string;
		refresh_token: string;
		expires_at: number;
		token_type: string;
	} | null = null;

	public static PROVIDER = Providers.STRAVA;

	public static EXTENSION = FileExtensions.TCX;

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

	private async getAccessToken(): Promise<string> {
		// if we do not have auth object, try to get it from the db
		if (!this._refreshToken || !this._auth) {
			const dbToken = await this.getTokenFromDb(this._provider);
			if (dbToken) {
				this._refreshToken = dbToken.refreshToken;
				this._auth = {
					access_token: dbToken.accessToken,
					refresh_token: dbToken.refreshToken,
					expires_at: dbToken.expiresAt,
					token_type: dbToken.tokenType,
				};
			}
		}
		if (!this._refreshToken) {
			return Promise.reject(new Error("No refresh token available"));
		}
		if (
			this._auth?.expires_at &&
			isBefore(new Date(), this._auth.expires_at * 1000 - 60000)
		) {
			return Promise.resolve(
				`${this._auth.token_type} ${this._auth.access_token}`,
			);
		}
		const newToken = await this._client.oauth.refreshToken(this._refreshToken);
		await this.setTokenOnDb(this._provider, {
			accessToken: newToken.access_token,
			refreshToken: newToken.refresh_token,
			expiresAt: newToken.expires_at,
			tokenType: newToken.token_type,
		});
		this._refreshToken = newToken.refresh_token;
		this._auth = {
			access_token: newToken.access_token,
			refresh_token: newToken.refresh_token,
			expires_at: newToken.expires_at,
			token_type: newToken.token_type,
		};
		await this.getTokenFromDb(this._provider).then(console.debug);
		return `${this._auth.token_type} ${this._auth.access_token}`;
	}

	private _request<T>(url: string, options: RequestInit = {}): Promise<T> {
		return this.getAccessToken()
			.then((accessToken) =>
				fetch(`${API_URL}${url}`, {
					...options,
					headers: {
						...(options.headers ?? {}),
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
			this._auth = null;
		}
		await this.getAccessToken();
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
					isAfter(activity.start_date, params.lastTimestamp || 0),
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

	async getActivity(id: string, options?: { force?: boolean }) {
		if (!options?.force) {
			const cacheValue = await this._cache.get<StravaActivity>(
				this._provider,
				"activity",
				id,
			);
			if (cacheValue) return cacheValue;
		}

		const data = await this._request<StravaActivity>(`/activities/${id}`);
		if (data) {
			this._cache.set<StravaActivity>(this._provider, "activity", id, data);
		}
		return data;
	}

	async createManualActivity(data: DbActivityPopulated): Promise<string> {
		const activityType = mapManualActivityType(data.type);
		const startDateLocal = formatDate(data.timestamp, {
			format: "YYYY-MM-DDTHH:mm:ss",
			timezone: data.timezone || undefined,
		});
		const payload = new URLSearchParams({
			name: data.name || "Manual activity",
			type: activityType,
			start_date_local: startDateLocal,
			elapsed_time: Math.max(1, Math.round(data.duration)).toString(),
			description: data.notes || "",
		});

		if (data.distance > 0) {
			payload.set("distance", Math.round(data.distance).toString());
		}

		const created = await this._request<StravaActivity>("/activities", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: payload.toString(),
		});
		return created.id.toString();
	}

	async downloadActivity(
		activityId: string,
		downloadPath: string,
	): Promise<void> {
		const filePath = this.generateActivityFilePath(downloadPath, activityId);
		const activity = await this.getActivity(activityId);
		const type = mapActivityType(activity.type, activity.name);
		const query = new URLSearchParams({
			keys: [
				"time",
				"latlng",
				"altitude",
				"distance",
				"heartrate",
				"cadence",
				"watts",
				"temp",
			].join(","),
			key_by_type: "true",
		});
		const streams = await this._request<StravaActivityStreams>(
			`/activities/${activityId}/streams?${query.toString()}`,
		);
		const content = buildTcxContent(activity, type, streams);
		await writeFile(filePath, content, "utf-8");
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

	private updateActivity(
		activityId: string,
		body: { description?: string; name?: string },
	): Promise<void> {
		return this._request<StravaActivity>(`/activities/${activityId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			// https://developers.strava.com/docs/reference/#api-models-UpdatableActivity
			body: JSON.stringify(body),
		}).then(() => undefined);
	}

	updateActivityNotes(
		activityId: string,
		notes?: string | null,
	): Promise<void> {
		return this.updateActivity(activityId, {
			description: notes ?? "",
		});
	}

	updateActivityName(activityId: string, name?: string | null): Promise<void> {
		return this.updateActivity(activityId, {
			name: name ?? "",
		});
	}
}
