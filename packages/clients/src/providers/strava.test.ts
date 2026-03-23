import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Db } from "@repo/db";
import { createTestCacheDb, createTestDb } from "@repo/db/utils";
import { ActivitySubType, Providers } from "@repo/types";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { activities, activitiesData } from "../mocks/strava.js";
import { StravaClient } from "./strava.js";

const stravaMock = vi.hoisted(() => {
	return {
		config: vi.fn(),
		oauth: {
			refreshToken: vi.fn(),
		},
	};
});

vi.mock("strava-v3/index.js", () => ({ default: stravaMock }));

const mockFetch = vi.fn();

globalThis.fetch = mockFetch as unknown as typeof fetch;

const defaultTokenResponse = {
	access_token: "mock-access",
	refresh_token: "new-refresh",
	expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
	token_type: "Bearer",
};
const tokenResponse = (
	overrides?: Partial<
		Awaited<ReturnType<typeof stravaMock.oauth.refreshToken>>
	>,
) => {
	console.log("mocking token response", overrides);
	return {
		...defaultTokenResponse,
		...overrides,
	};
};

const createContext = async () => {
	const cache = await createTestCacheDb({
		clearDb: true,
	});
	const db = await createTestDb({
		clearDb: true,
	});
	const client = new StravaClient(db, cache, {
		clientId: "id",
		clientSecret: "secret",
		redirectUri: "https://example.com/callback",
	});
	return { client, db };
};

describe("strava client connect()", () => {
	let db: Db;
	let client: StravaClient;

	beforeEach(async () => {
		mockFetch.mockReset();
		mockFetch.mockImplementation((url: RequestInfo) => {
			const urlStr = typeof url === "string" ? url : url.url;
			if (urlStr.includes("/athlete/activities")) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(activities),
				} as Response);
			}
			if (urlStr.includes("/activities/")) {
				const activityId = urlStr.split("/").pop() as string;
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(activitiesData[activityId]),
				} as Response);
			}
			return Promise.resolve({
				ok: false,
				json: () => Promise.resolve({}),
			} as Response);
		});
		vi.mocked(stravaMock.oauth.refreshToken).mockReset();
		vi.mocked(stravaMock.config).mockReset();
		vi.mocked(stravaMock.oauth.refreshToken).mockResolvedValue(tokenResponse());
		const context = await createContext();
		db = context.db;
		client = context.client;
	});

	test("persists refreshed tokens when refresh token is provided", async () => {
		await expect(
			client.connect({
				refreshToken: "incoming-refresh",
			}),
		).resolves.not.toThrow();
		expect(vi.mocked(stravaMock.oauth.refreshToken)).toHaveBeenCalledWith(
			"incoming-refresh",
		);
		const token = await db.getProfileToken(Providers.STRAVA);
		expect(token?.refreshToken).toBe(defaultTokenResponse.refresh_token);
		expect(token?.accessToken).toBe(defaultTokenResponse.access_token);
	});

	test("uses stored tokens when refresh token is missing", async () => {
		await db.setProfileToken(Providers.STRAVA, {
			accessToken: "stored-access",
			refreshToken: "stored-refresh",
			expiresAt: Math.floor(Date.now() / 1000) + 3600,
			tokenType: "Bearer",
		});
		await expect(
			client.connect({
				refreshToken: "",
			}),
		).resolves.not.toThrow();
		expect(vi.mocked(stravaMock.oauth.refreshToken)).not.toHaveBeenCalled();
	});

	test("refreshes stored tokens when they are expired", async () => {
		const refreshTokenResponse = {
			access_token: "updated-access",
			refresh_token: "updated-refresh",
		};
		const dbTokenResponse = {
			accessToken: "old-access",
			refreshToken: "stored-refresh",
			expiresAt: Math.floor(Date.now() / 1000) - 120,
			tokenType: "Bearer",
		};
		await db.setProfileToken(Providers.STRAVA, dbTokenResponse);
		vi.mocked(stravaMock.oauth.refreshToken).mockResolvedValueOnce(
			tokenResponse(refreshTokenResponse),
		);
		await expect(
			client.connect({
				refreshToken: "",
			}),
		).resolves.not.toThrow();
		expect(vi.mocked(stravaMock.oauth.refreshToken)).toHaveBeenCalledWith(
			dbTokenResponse.refreshToken,
		);
		const token = await db.getProfileToken(Providers.STRAVA);
		expect(token?.refreshToken).toBe(refreshTokenResponse.refresh_token);
		expect(token?.accessToken).toBe(refreshTokenResponse.access_token);
	});

	test("sync fetches activities and return all the activities", async () => {
		await client.connect({ refreshToken: "token" });
		const result = await client.sync({});
		expect(result).toHaveLength(activities.length);
	});

	activities.forEach((activity, index) => {
		test(`sync with lastTimestamp only fetches newer activities for activity ${index}`, async () => {
			await client.connect({ refreshToken: "token" });
			const lastTimestamp = new Date(activity.start_date).getTime();
			const result = await client.sync({ lastTimestamp });
			expect(result).toHaveLength(index);
		});
	});

	test("sync activity fetches detailed record", async () => {
		await client.connect({ refreshToken: "token" });
		const testActivityId = activities[0].id.toString();
		const result = await client.syncActivity(testActivityId);
		expect(result.activity.providerActivity?.id).toEqual(testActivityId);
	});

	test("imports trainer runs as indoor subtype", async () => {
		await client.connect({ refreshToken: "token" });
		const testActivityId = "17682257287";
		mockFetch.mockImplementation((url: RequestInfo) => {
			const urlStr = typeof url === "string" ? url : url.url;
			if (urlStr.includes(`/activities/${testActivityId}`)) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							resource_state: 2,
							athlete: { id: 5533532, resource_state: 1 },
							name: "Afternoon Run",
							distance: 7050,
							moving_time: 2167,
							elapsed_time: 2167,
							total_elevation_gain: 0,
							type: "Run",
							sport_type: "Run",
							workout_type: null,
							device_name: "COROS PACE 2",
							id: 17682257287,
							start_date: "2026-03-11T08:10:19Z",
							start_date_local: "2026-03-11T17:10:19Z",
							timezone: "(GMT+09:00) Asia/Chita",
							utc_offset: 32400,
							location_city: null,
							location_state: null,
							location_country: null,
							achievement_count: 0,
							kudos_count: 0,
							comment_count: 0,
							athlete_count: 1,
							photo_count: 0,
							map: {
								id: "a17682257287",
								summary_polyline: "",
								resource_state: 2,
							},
							trainer: true,
							commute: false,
							manual: false,
							private: true,
							visibility: "only_me",
							flagged: false,
							gear_id: null,
							start_latlng: [],
							end_latlng: [],
							average_speed: 3.253,
							max_speed: 3.52,
							average_cadence: 81.7,
							has_heartrate: true,
							average_heartrate: 133.3,
							max_heartrate: 149,
							heartrate_opt_out: false,
							display_hide_heartrate_option: true,
							elev_high: 0,
							elev_low: 0,
							upload_id: 18780672933,
							upload_id_str: "18780672933",
							external_id: "475994889845243909.fit",
							from_accepted_tag: false,
							pr_count: 0,
							total_photo_count: 0,
							has_kudoed: false,
						}),
				} as Response);
			}
			if (urlStr.includes("/athlete/activities")) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(activities),
				} as Response);
			}
			if (urlStr.includes("/activities/")) {
				const activityId = urlStr.split("/").pop() as string;
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(activitiesData[activityId]),
				} as Response);
			}
			return Promise.resolve({
				ok: false,
				json: () => Promise.resolve({}),
			} as Response);
		});

		const result = await client.syncActivity(testActivityId);
		expect(result.activity.data.type).toBe("run");
		expect(result.activity.data.subtype).toBe(ActivitySubType.INDOOR);
	});

	test("downloads tcx file for strava activity", async () => {
		await client.connect({ refreshToken: "token" });
		const activityId = activities[0].id.toString();
		const downloadRoot = await mkdtemp(join(tmpdir(), "strava-download-"));
		mockFetch.mockImplementation((url: RequestInfo) => {
			const urlStr = typeof url === "string" ? url : url.url;
			if (
				urlStr.includes(
					`/activities/${activityId}/streams?keys=time%2Clatlng%2Caltitude%2Cdistance%2Cheartrate%2Ccadence%2Cwatts%2Ctemp&key_by_type=true`,
				)
			) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							time: {
								data: [0, 60],
								original_size: 2,
								resolution: "high",
								series_type: "time",
							},
							latlng: {
								data: [
									[37.52, 126.64],
									[37.53, 126.65],
								],
								original_size: 2,
								resolution: "high",
								series_type: "time",
							},
							altitude: {
								data: [12, 13],
								original_size: 2,
								resolution: "high",
								series_type: "time",
							},
							distance: {
								data: [0, 1000],
								original_size: 2,
								resolution: "high",
								series_type: "time",
							},
							heartrate: {
								data: [120, 130],
								original_size: 2,
								resolution: "high",
								series_type: "time",
							},
						}),
				} as Response);
			}
			if (urlStr.includes("/athlete/activities")) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(activities),
				} as Response);
			}
			if (urlStr.includes("/activities/")) {
				const fetchedActivityId = urlStr.split("/").pop() as string;
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(activitiesData[fetchedActivityId]),
				} as Response);
			}
			return Promise.resolve({
				ok: false,
				json: () => Promise.resolve({}),
			} as Response);
		});

		try {
			await client.downloadActivity(activityId, downloadRoot);
			const filePath = join(
				downloadRoot,
				Providers.STRAVA,
				`${activityId}.tcx`,
			);
			const content = await readFile(filePath, "utf-8");
			expect(content).toContain("<TrainingCenterDatabase");
			expect(content).toContain("<Trackpoint>");
			expect(content).toContain("<DistanceMeters>1000</DistanceMeters>");
		} finally {
			await rm(downloadRoot, { recursive: true, force: true });
		}
	});
});
