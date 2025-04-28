import { Db, createDbClient } from "@repo/db";
import { clearData, migrateDb } from "@repo/db/migrations";
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
			getUserSettings: vi.fn().mockImplementation(() => {
				return Promise.resolve({ id: 1 });
			}),
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
	const client = createDbClient({
		url: "file:../../test.sqlite",
		logger: false,
	});
	const db = new Db(client);
	const provider = new ProviderManager(db);

	provider.initializeClient(Providers.GARMIN);

	beforeEach(async () => {
		await migrateDb(client);
		await clearData(client);
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
