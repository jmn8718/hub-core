import { createTestCacheDb, createTestDb } from "@repo/db/utils";
import { Providers } from "@repo/types";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { activities, activitiesData, gears } from "../mocks/garmin.js";
import { ProviderManager } from "./ProviderManager.js";

vi.mock(import("garmin-connect"), async (importOriginal) => {
	const mod = await importOriginal();
	return {
		...mod,
		GarminConnect: vi.fn().mockReturnValue({
			login: vi.fn().mockImplementation(() => Promise.resolve()),
			exportToken: vi.fn().mockReturnValue({
				oauth1: {
					oauth_token: "oauth1-token",
					oauth_token_secret: "oauth1-secret",
				},
				oauth2: {
					access_token: "access-token",
					refresh_token: "refresh-token",
					token_type: "Bearer",
					expires_in: 3600,
					expires_at: Date.now() + 3600 * 1000,
				},
			}),
			loadToken: vi.fn(),
			getUserSettings: vi.fn().mockImplementation(() => {
				return Promise.resolve({ id: 1 });
			}),
			getUserProfile: vi.fn().mockResolvedValue({ id: 1 }),
			getGears: vi.fn().mockImplementation(() => Promise.resolve(gears)),
			getActivities: vi
				.fn()
				.mockImplementation(() => Promise.resolve(activities)),
			getActivity: vi
				.fn()
				.mockImplementation(({ activityId }: { activityId: string }) =>
					Promise.resolve(activitiesData[activityId]),
				),
			getActivityGear: vi.fn().mockImplementation(() => Promise.resolve(gears)),
		}),
	};
});

describe("provider manager", () => {
	let provider: ProviderManager;
	let db: Awaited<ReturnType<typeof createTestDb>>;

	beforeEach(async () => {
		db = await createTestDb({
			clearDb: true,
		});
		const cacheDB = await createTestCacheDb({
			clearDb: true,
		});
		provider = new ProviderManager(db, cacheDB);
		provider.initializeClient({
			provider: Providers.GARMIN,
		});
	});

	test("should sync gear", async () => {
		await provider.connect(Providers.GARMIN, {
			username: "user1",
			password: "password2",
		});
		const result = await provider.syncGears(Providers.GARMIN);
		expect(result.length).to.eq(gears.length);

		const dbGear = await db.getGears({});
		expect(dbGear.count).to.eq(2);
	});

	test("should sync activities and gear", async () => {
		await provider.connect(Providers.GARMIN, {
			username: "user1",
			password: "password2",
		});
		const result = await provider.sync(Providers.GARMIN);
		expect(result.length).to.eq(gears.length);

		const dbGear = await db.getGears({});
		expect(dbGear.count).to.eq(2);
	});
});
