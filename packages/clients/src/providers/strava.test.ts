import type { Db } from "@repo/db";
import { createTestCacheDb, createTestDb } from "@repo/db/utils";
import { Providers } from "@repo/types";
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
});
