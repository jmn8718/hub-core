import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Db } from "@repo/db";
import { createTestCacheDb, createTestDb } from "@repo/db/utils";
import {
	ActivitySubType,
	ActivityType,
	GearType,
	Providers,
} from "@repo/types";
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

const activityLapsData: Record<
	string,
	Array<{
		id: number;
		resource_state: number;
		name: string;
		elapsed_time: number;
		moving_time: number;
		start_date: string;
		start_date_local: string;
		distance: number;
		lap_index: number;
		average_heartrate?: number;
		max_heartrate?: number;
	}>
> = {
	"16198895522": [
		{
			id: 900000001,
			resource_state: 2,
			name: "Warm Up",
			elapsed_time: 600,
			moving_time: 590,
			start_date: "2025-10-20T08:55:03Z",
			start_date_local: "2025-10-20T17:55:03Z",
			distance: 2000,
			lap_index: 1,
			average_heartrate: 129.4,
			max_heartrate: 141,
		},
		{
			id: 900000002,
			resource_state: 2,
			name: "Run",
			elapsed_time: 1740,
			moving_time: 1735,
			start_date: "2025-10-20T09:05:03Z",
			start_date_local: "2025-10-20T18:05:03Z",
			distance: 6149.3,
			lap_index: 2,
			average_heartrate: 141.2,
			max_heartrate: 157,
		},
		{
			id: 900000003,
			resource_state: 2,
			name: "Rest",
			elapsed_time: 1143,
			moving_time: 1158,
			start_date: "2025-10-20T09:34:03Z",
			start_date_local: "2025-10-20T18:34:03Z",
			distance: 4000,
			lap_index: 3,
			average_heartrate: 136.8,
			max_heartrate: 148,
		},
	],
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

describe.sequential("strava client connect()", () => {
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
			if (urlStr.endsWith("/athlete")) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							id: 5533532,
							username: "tester",
							resource_state: 3,
							firstname: "Test",
							lastname: "User",
							bio: "",
							city: "",
							state: "",
							country: "",
							sex: "M",
							premium: false,
							summit: false,
							created_at: "",
							updated_at: "",
							badge_type_id: 0,
							weight: 0,
							profile_medium: "",
							profile: "",
							friend: null,
							follower: null,
							blocked: false,
							can_follow: false,
							follower_count: 0,
							friend_count: 0,
							mutual_friend_count: 0,
							athlete_type: 0,
							date_preference: "",
							measurement_preference: "",
							clubs: [],
							postable_clubs_count: 0,
							ftp: null,
							bikes: [
								{
									id: "b5079135",
									primary: true,
									name: "TCR",
									nickname: "Giant TCR",
									resource_state: 2,
									retired: false,
									distance: 12345,
									converted_distance: 12.3,
								},
							],
							shoes: [
								{
									id: "g15141752",
									primary: true,
									name: "Alphafly",
									nickname: "Nike Alphafly",
									resource_state: 2,
									retired: false,
									distance: 54321,
									converted_distance: 54.3,
								},
							],
						}),
				} as Response);
			}
			if (urlStr.includes("/athletes/5533532/gear/shoes")) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve([
							{
								id: 1072381,
								default: false,
								active: true,
								display_name: "Adidas adizero adios 2 adios 2 blue",
								model_name: "adizero adios 2",
								brand_name: "Adidas",
								name: "adios 2 blue",
								total_distance: "40.1",
								description: "",
								notification_distance: 500000,
							},
							{
								id: "g15141752",
								default: true,
								active: true,
								display_name: "Nike Alphafly 3",
								model_name: "Alphafly 3",
								brand_name: "Nike",
								name: "Nike Alphafly",
								total_distance: "54.3",
								description: "",
								notification_distance: 700000,
							},
						]),
				} as Response);
			}
			if (urlStr.includes("/athletes/5533532/gear")) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							id: 30735448,
							display_name: "Nike Pegasus Shield peg-shield",
						}),
				} as Response);
			}
			if (urlStr.endsWith("/bikes")) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							success: true,
							id: 17858335,
							display_name: "tarungi",
						}),
				} as Response);
			}
			if (urlStr.includes("/bikes/17858335")) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ success: true }),
				} as Response);
			}
			if (urlStr.includes("/athletes/5533532/gear/30735448")) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve({ success: true }),
				} as Response);
			}
			if (urlStr.includes("/activities/") && urlStr.endsWith("/laps")) {
				const parts = urlStr.split("/");
				const activityId = parts[parts.length - 2] as string;
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(activityLapsData[activityId] ?? []),
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

	test("refreshes tokens for the scoped external athlete id", async () => {
		const externalId = "5533532";
		const otherExternalId = "9999999";
		await db.setProfileToken(
			Providers.STRAVA,
			{
				accessToken: "scoped-old-access",
				refreshToken: "scoped-refresh",
				expiresAt: Math.floor(Date.now() / 1000) - 120,
				tokenType: "Bearer",
			},
			externalId,
		);
		await db.setProfileToken(
			Providers.STRAVA,
			{
				accessToken: "other-access",
				refreshToken: "other-refresh",
				expiresAt: Math.floor(Date.now() / 1000) + 3600,
				tokenType: "Bearer",
			},
			otherExternalId,
		);

		vi.mocked(stravaMock.oauth.refreshToken).mockResolvedValueOnce(
			tokenResponse({
				access_token: "scoped-new-access",
				refresh_token: "scoped-new-refresh",
			}),
		);

		await client.connect({
			refreshToken: "",
			externalId,
		});

		const scopedToken = await db.getProfileToken(Providers.STRAVA, externalId);
		const otherToken = await db.getProfileToken(
			Providers.STRAVA,
			otherExternalId,
		);

		expect(scopedToken?.accessToken).toBe("scoped-new-access");
		expect(scopedToken?.refreshToken).toBe("scoped-new-refresh");
		expect(otherToken?.accessToken).toBe("other-access");
		expect(otherToken?.refreshToken).toBe("other-refresh");
	});

	test("sync fetches activities and return all the activities", async () => {
		await client.connect({ refreshToken: "token" });
		const result = await client.sync({});
		expect(result).toHaveLength(activities.length);
	});

	test("sync gears fetches bikes and shoes from logged in athlete", async () => {
		await client.connect({ refreshToken: "token" });
		const result = await client.syncGears();

		expect(result).toHaveLength(3);
		expect(result[0]?.providerGear.id).toBe("b5079135");
		expect(result[0]?.data.type).toBe(GearType.BIKE);
		expect(result[1]?.providerGear.id).toBe("g15141752");
		expect(result[1]?.data.type).toBe(GearType.SHOES);
		expect(result[1]?.data.maximumDistance).toBe(700000);
		expect(result[2]?.providerGear.id).toBe("1072381");
		expect(result[2]?.data.type).toBe(GearType.SHOES);
		expect(result[2]?.data.brand).toBe("Adidas");
	});

	test("creates strava shoes through athlete gear endpoint", async () => {
		await client.connect({ refreshToken: "token" });
		const id = await client.createGear({
			id: "local-gear",
			name: "Pegasus Shield",
			code: "peg-shield",
			brand: "Nike",
			type: GearType.SHOES,
			maximumDistance: 650000,
			distance: 0,
			dateBegin: undefined,
			dateEnd: undefined,
			providerConnections: [],
		});

		expect(id).toBe("30735448");

		const matchingCall = mockFetch.mock.calls.find(
			([url, init]) =>
				(typeof url === "string" ? url : url.url).includes(
					"/athletes/5533532/gear",
				) && init?.method === "POST",
		);

		expect(matchingCall).toBeTruthy();
		expect(matchingCall?.[1]?.body).toBe(
			"brandName=Nike&modelName=Pegasus+Shield&name=peg-shield&description=&notification_distance=650000",
		);
	});

	test("creates strava bike through bikes endpoint", async () => {
		await client.connect({ refreshToken: "token" });
		const id = await client.createGear({
			id: "local-bike",
			name: "tarungi",
			code: "tarungi",
			brand: "seoul",
			type: GearType.BIKE,
			maximumDistance: 0,
			distance: 0,
			dateBegin: undefined,
			dateEnd: undefined,
			providerConnections: [],
		});

		expect(id).toBe("17858335");

		const matchingCall = mockFetch.mock.calls.find(
			([url, init]) =>
				(typeof url === "string" ? url : url.url).endsWith("/bikes") &&
				init?.method === "POST",
		);

		expect(matchingCall).toBeTruthy();
		expect(matchingCall?.[1]?.body).toBe(
			"name=tarungi&frame_type=3&weight=0&brand_name=seoul&model_name=tarungi&notes=",
		);
	});

	test("deletes strava shoes through athlete gear endpoint", async () => {
		await client.connect({ refreshToken: "token" });
		await expect(
			client.deleteGear("30735448", {
				id: "local-gear",
				name: "Pegasus Shield",
				code: "peg-shield",
				brand: "Nike",
				type: GearType.SHOES,
				maximumDistance: 650000,
				distance: 0,
				dateBegin: undefined,
				dateEnd: undefined,
				providerConnections: [],
			}),
		).resolves.toBeUndefined();

		const matchingCall = mockFetch.mock.calls.find(
			([url, init]) =>
				(typeof url === "string" ? url : url.url).includes(
					"/athletes/5533532/gear/30735448",
				) && init?.method === "DELETE",
		);

		expect(matchingCall).toBeTruthy();
	});

	test("deletes strava bikes through bikes endpoint", async () => {
		await client.connect({ refreshToken: "token" });
		await expect(
			client.deleteGear("17858335", {
				id: "local-bike",
				name: "tarungi",
				code: "tarungi",
				brand: "seoul",
				type: GearType.BIKE,
				maximumDistance: 0,
				distance: 0,
				dateBegin: undefined,
				dateEnd: undefined,
				providerConnections: [],
			}),
		).resolves.toBeUndefined();

		const matchingCall = mockFetch.mock.calls.find(
			([url, init]) =>
				(typeof url === "string" ? url : url.url).includes("/bikes/17858335") &&
				init?.method === "DELETE",
		);

		expect(matchingCall).toBeTruthy();
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

	test("maps Strava laps into the activity payload", async () => {
		await client.connect({ refreshToken: "token" });
		const result = await client.syncActivity("16198895522");

		expect(result.laps).toHaveLength(3);
		expect(result.laps?.[0]).toMatchObject({
			lapNumber: 1,
			identifier: "Warm Up",
			distance: 2000,
			elapsedTime: 600,
			movingTime: 590,
			averageHeartRate: 129.4,
			maximumHeartRate: 141,
		});
	});

	test("maps running metadata from strava activity details", async () => {
		await client.connect({ refreshToken: "token" });
		const testActivityId = "16198895522";
		const result = await client.syncActivity(testActivityId);
		expect(result.activity.data.type).toBe(ActivityType.RUN);
		const averagePace = (
			result.activity.data.metadata as { averagePace?: number } | undefined
		)?.averagePace;
		expect(averagePace).toBeCloseTo(
			(activitiesData[testActivityId].moving_time /
				activitiesData[testActivityId].distance) *
				1000,
			5,
		);
		expect(result.activity.data.metadata?.averageHeartRate).toBeCloseTo(
			activitiesData[testActivityId].average_heartrate ?? 0,
			5,
		);
		expect(result.activity.data.metadata?.maximumHeartRate).toBe(
			activitiesData[testActivityId].max_heartrate,
		);
	});

	test("maps rounded average_speed values to pace using distance and moving_time", async () => {
		await client.connect({ refreshToken: "token" });
		const testActivityId = "17682257288";
		mockFetch.mockImplementation((url: RequestInfo) => {
			const urlStr = typeof url === "string" ? url : url.url;
			if (urlStr.includes("/activities/") && urlStr.endsWith("/laps")) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve([]),
				} as Response);
			}
			if (urlStr.includes(`/activities/${testActivityId}`)) {
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							resource_state: 2,
							athlete: { id: 5533532, resource_state: 1 },
							name: "Precision Pace Run",
							distance: 10000,
							moving_time: 3040,
							elapsed_time: 3040,
							total_elevation_gain: 0,
							type: "Run",
							sport_type: "Run",
							workout_type: null,
							device_name: "COROS PACE 2",
							id: 17682257288,
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
								id: "a17682257288",
								summary_polyline: "",
								resource_state: 2,
							},
							trainer: false,
							commute: false,
							manual: false,
							private: true,
							visibility: "only_me",
							flagged: false,
							gear_id: null,
							start_latlng: [],
							end_latlng: [],
							average_speed: 3.303,
							max_speed: 3.52,
							average_cadence: 81.7,
							has_heartrate: true,
							average_heartrate: 133.3,
							max_heartrate: 149,
							heartrate_opt_out: false,
							display_hide_heartrate_option: true,
							elev_high: 0,
							elev_low: 0,
							upload_id: 18780672934,
							upload_id_str: "18780672934",
							external_id: "475994889845243910.fit",
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
		const averagePace = (
			result.activity.data.metadata as { averagePace?: number } | undefined
		)?.averagePace;
		expect(averagePace).toBeCloseTo(304, 5);
	});

	test("maps cycling metadata from strava activity details", async () => {
		await client.connect({ refreshToken: "token" });
		const testActivityId = "14917221023";
		const result = await client.syncActivity(testActivityId);
		expect(result.activity.data.type).toBe(ActivityType.BIKE);
		const averageSpeed = (
			result.activity.data.metadata as { averageSpeed?: number } | undefined
		)?.averageSpeed;
		expect(averageSpeed).toBe(activitiesData[testActivityId].average_speed);
		expect(result.activity.data.metadata?.averageHeartRate).toBeUndefined();
		expect(result.activity.data.metadata?.maximumHeartRate).toBeUndefined();
	});

	test("updates strava activity gear with gear_id payload", async () => {
		await client.connect({ refreshToken: "token" });
		await client.linkActivityGear("16198895522", "b5079135");

		const matchingCall = mockFetch.mock.calls.find(
			([url, init]) =>
				(typeof url === "string" ? url : url.url).includes(
					"/activities/16198895522",
				) && init?.method === "PUT",
		);

		expect(matchingCall).toBeTruthy();
		expect(matchingCall?.[1]?.body).toBe(
			JSON.stringify({ gear_id: "b5079135" }),
		);
	});

	test("clears strava activity gear with gear_id none", async () => {
		await client.connect({ refreshToken: "token" });
		await client.unlinkActivityGear("16198895522", "b5079135");

		const matchingCall = mockFetch.mock.calls.find(
			([url, init]) =>
				(typeof url === "string" ? url : url.url).includes(
					"/activities/16198895522",
				) && init?.method === "PUT",
		);

		expect(matchingCall).toBeTruthy();
		expect(matchingCall?.[1]?.body).toBe(JSON.stringify({ gear_id: "none" }));
	});

	test("imports trainer runs as indoor subtype", async () => {
		await client.connect({ refreshToken: "token" });
		const testActivityId = "17682257287";
		mockFetch.mockImplementation((url: RequestInfo) => {
			const urlStr = typeof url === "string" ? url : url.url;
			if (urlStr.includes("/activities/") && urlStr.endsWith("/laps")) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve([]),
				} as Response);
			}
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
