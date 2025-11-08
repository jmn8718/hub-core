import { createTestCacheDb } from "@repo/db/utils";
import { describe, expect, beforeEach, vi, test } from "vitest";
import { activities, activitiesData } from "../mocks/strava.js";
import { StravaClient } from "./strava.js";

vi.mock("strava-v3/index.js", () => {
	return {
		default: {
			config: vi.fn(),
			oauth: {
				refreshToken: vi.fn().mockResolvedValue({
					access_token: "mock-access",
					refresh_token: "new-refresh",
					expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
					token_type: "Bearer",
				}),
			},
		},
	};
});

const mockFetch = vi.fn();

globalThis.fetch = mockFetch as unknown as typeof fetch;

describe("strava client", () => {
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

		const cache = await createTestCacheDb();
		client = new StravaClient(cache, {
			clientId: "1234",
			clientSecret: "567890",
		});
	});

	test("connects with refresh token", async () => {
		await expect(
			client.connect({
				refreshToken: "123789456",
			}),
		).resolves.not.toThrow();
	});

	test("sync fetches activities", async () => {
		await client.connect({ refreshToken: "token" });
		const result = await client.sync({});
		expect(result).toHaveLength(activities.length);
	});

	test("sync activity fetches detailed record", async () => {
		await client.connect({ refreshToken: "token" });
		const result = await client.syncActivity(activities[0].id.toString());
		expect(result.activity.data.id).toEqual(activities[0].id.toString());
	});
});
