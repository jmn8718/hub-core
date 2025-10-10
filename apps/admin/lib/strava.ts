import { writeFileSync } from "node:fs";
import type { StravaActivity, StravaAthlete } from "@/types/strava";
import strava from "strava-v3";

const API_URL = "https://www.strava.com/api/v3";
class StravaClient {
	private readonly _client: typeof strava;
	private _token: string | null = null;
	private readonly _toDisk: boolean;
	constructor() {
		this._client = strava;
		this._client.config({
			access_token: "",
			client_id: process.env.STRAVA_CLIENT_ID,
			client_secret: process.env.STRAVA_CLIENT_SECRET,
			redirect_uri: `${process.env.NEXT_PUBLIC_DOMAIN}/strava/oauth`,
		});
		this._toDisk = process.env.STRAVA_TO_DISK === "true";
	}

	get client() {
		return this._client;
	}

	get token() {
		return this._token;
	}

	setToken(token: string) {
		this._token = token;
		this._client.client(token);
		this._client.config({
			access_token: token,
			client_id: process.env.STRAVA_CLIENT_ID,
			client_secret: process.env.STRAVA_CLIENT_SECRET,
			redirect_uri: `${process.env.NEXT_PUBLIC_DOMAIN}/strava/oauth`,
		});
	}

	getActivities(
		params: {
			page?: number;
			per_page?: number;
			before?: number;
			after?: number;
		} = {},
	) {
		if (!this._token) {
			throw new Error("Strava token not set");
		}
		const { page = 1, per_page = 30, before, after } = params;
		const query = new URLSearchParams({
			page: page.toString(),
			per_page: per_page.toString(),
			...(before && { before: before.toString() }),
			...(after && { after: after.toString() }),
		});
		const url = `${API_URL}/athlete/activities?${query.toString()}`;
		return fetch(url, {
			headers: {
				Authorization: `Bearer ${this._token}`,
			},
		})
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch activities");
				return res.json();
			})
			.then((data) => {
				if (this._toDisk) {
					writeFileSync(
						`./activities-${query.toString()}.json`,
						JSON.stringify(data, null, 2),
					);
				}
				return data as StravaActivity[];
			});
	}

	getActivityById(id: string | number) {
		if (!this._token) {
			throw new Error("Strava token not set");
		}
		const url = `${API_URL}/activities/${id}`;
		return fetch(url, {
			headers: {
				Authorization: `Bearer ${this._token}`,
			},
		})
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch activity");
				return res.json();
			})
			.then((data) => {
				if (this._toDisk) {
					writeFileSync(`./activity-${id}.json`, JSON.stringify(data, null, 2));
				}
				return data as StravaActivity;
			});
	}

	getAthlete() {
		if (!this._token) {
			throw new Error("Strava token not set");
		}
		const url = `${API_URL}/athlete`;
		return fetch(url, {
			headers: {
				Authorization: `Bearer ${this._token}`,
			},
		})
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch athlete");
				return res.json();
			})
			.then((data) => {
				if (this._toDisk) {
					writeFileSync("./athlete.json", JSON.stringify(data, null, 2));
				}
				return data as StravaAthlete;
			});
	}

	getAthleteStats(athleteId: string | number) {
		if (!this._token) {
			throw new Error("Strava token not set");
		}
		const url = `${API_URL}/athletes/${athleteId}/stats`;
		return fetch(url, {
			headers: {
				Authorization: `Bearer ${this._token}`,
			},
		})
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch athlete stats");
				return res.json();
			})
			.then((data) => {
				if (this._toDisk) {
					writeFileSync("./stats.json", JSON.stringify(data, null, 2));
				}
				return data;
			});
	}
}

export default new StravaClient();
