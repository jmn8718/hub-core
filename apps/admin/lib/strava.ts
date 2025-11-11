import { writeFileSync } from "node:fs";
import type Db from "@/lib/db";
import type { StravaActivity, StravaAthlete } from "@/types/strava";
import { isAfter } from "@repo/dates";
import { eq, profiles } from "@repo/db";
import { LRUCache } from "lru-cache";
import strava from "strava-v3";

const cache = new LRUCache({
	max: 500, // Maximum number of items in the cache
	ttl: 1000 * 60 * 5, // Time to live for each item in milliseconds (5 minutes)
});
const API_URL = "https://www.strava.com/api/v3";
class StravaClient {
	private readonly _client: typeof strava;
	private readonly _db: typeof Db;
	private readonly _toDisk: boolean;

	constructor(db: typeof Db) {
		this._client = strava;
		this._client.config({
			access_token: "",
			client_id: process.env.STRAVA_CLIENT_ID,
			client_secret: process.env.STRAVA_CLIENT_SECRET,
			redirect_uri: `${process.env.NEXT_PUBLIC_DOMAIN}/strava/oauth`,
		});
		this._toDisk = process.env.STRAVA_TO_DISK === "true";
		this._db = db;
	}

	get client() {
		return this._client;
	}

	private async validateUserTokenWithDd(userId: string) {
		const cacheKey = `db-profile-${userId}`;
		let userProfile: {
			accessToken: string;
			refreshToken: string;
			tokenType: string;
			expiresAt: number;
		};
		if (cache.has(cacheKey)) {
			const cachedProfile = cache.get(cacheKey);
			userProfile = JSON.parse(cachedProfile as string);
		} else {
			const profile = await this._db
				.select({
					accessToken: profiles.accessToken,
					refreshToken: profiles.refreshToken,
					tokenType: profiles.tokenType,
					expiresAt: profiles.expiresAt,
				})
				.from(profiles)
				.where(eq(profiles.id, userId))
				.limit(1);

			if (!profile[0]) {
				throw new Error("No profile found");
			}

			cache.set(cacheKey, JSON.stringify(profile[0]));
			userProfile = profile[0];
		}
		let userAccessToken = userProfile.accessToken;
		if (isAfter(new Date(), new Date(userProfile.expiresAt * 1000 - 60000))) {
			const refresh = await this._client.oauth.refreshToken(
				userProfile.refreshToken,
			);
			await this._db
				.update(profiles)
				.set({
					expiresAt: refresh.expires_at,
					refreshToken: refresh.refresh_token,
					accessToken: refresh.access_token,
					tokenType: refresh.token_type,
				})
				.where(eq(profiles.id, userId));
			userAccessToken = refresh.access_token;
		}
		return userAccessToken;
	}

	async getActivities(
		userId: string,
		params: {
			page?: number;
			per_page?: number;
			before?: number;
			after?: number;
		} = {},
	) {
		const cacheKey = `activities-${userId}-${JSON.stringify(params)}`;
		if (cache.has(cacheKey)) {
			const cachedActivities = cache.get(cacheKey);
			return JSON.parse(cachedActivities as string) as StravaActivity[];
		}
		const token = await this.validateUserTokenWithDd(userId);
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
				Authorization: `Bearer ${token}`,
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
				cache.set(cacheKey, JSON.stringify(data));
				return data as StravaActivity[];
			});
	}

	async getActivityById(userId: string, id: string | number) {
		const cacheKey = `activity-${userId}-${id}`;
		if (cache.has(cacheKey)) {
			const cachedActivity = cache.get(cacheKey);
			return JSON.parse(cachedActivity as string) as StravaActivity;
		}
		const token = await this.validateUserTokenWithDd(userId);
		const url = `${API_URL}/activities/${id}`;
		return fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
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
				cache.set(cacheKey, JSON.stringify(data));
				return data as StravaActivity;
			});
	}

	async getAthlete(userId: string) {
		const cacheKey = `athlete-${userId}`;
		if (cache.has(cacheKey)) {
			const cachedAthlete = cache.get(cacheKey);
			return JSON.parse(cachedAthlete as string) as StravaAthlete;
		}
		const token = await this.validateUserTokenWithDd(userId);
		const url = `${API_URL}/athlete`;
		return fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
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
				cache.set(cacheKey, JSON.stringify(data));
				return data as StravaAthlete;
			});
	}

	async getAthleteStats(userId: string, athleteId: string | number) {
		const cacheKey = `athlete-stats-${athleteId}`;
		if (cache.has(cacheKey)) {
			const cachedStats = cache.get(cacheKey);
			return JSON.parse(cachedStats as string);
		}
		const token = await this.validateUserTokenWithDd(userId);
		const url = `${API_URL}/athletes/${athleteId}/stats`;
		return fetch(url, {
			headers: {
				Authorization: `Bearer ${token}`,
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
				cache.set(cacheKey, JSON.stringify(data));
				return data;
			});
	}
}

export default StravaClient;
