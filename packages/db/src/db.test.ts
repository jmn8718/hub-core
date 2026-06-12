import "dotenv/config";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ActivitySubType, ActivityType, Providers } from "@repo/types";
import { sql } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import { createDbClient } from "./client";
import { Db } from "./db";
import { migrateDb } from "./migrations";
import { clearData, importData } from "./tests/utils";

async function ensureActivityLapsTable(
	client: ReturnType<typeof createDbClient>,
) {
	await client.run(
		sql.raw(`CREATE TABLE IF NOT EXISTS "activity_laps" (
			"id" text PRIMARY KEY NOT NULL,
			"activity_id" text NOT NULL,
			"lap_number" integer NOT NULL,
			"identifier" text DEFAULT '' NOT NULL,
			"distance" real DEFAULT 0 NOT NULL,
			"elapsed_time" integer DEFAULT 0 NOT NULL,
			"moving_time" integer DEFAULT 0 NOT NULL,
			"average_heart_rate" real,
			"maximum_heart_rate" real,
			"user_id" text,
			"updated_at" text NOT NULL,
			"deleted_at" text,
			FOREIGN KEY ("activity_id") REFERENCES "activities"("id")
		)`),
	);
}

describe("db", () => {
	let testDbDir: string | null = null;
	let client!: ReturnType<typeof createDbClient>;
	let db!: Db;

	let activityId = "";
	let gearId = "";

	beforeAll(async () => {
		let testDbUrl = process.env.LOCAL_TEST_DB;
		if (!testDbUrl) {
			testDbDir = await mkdtemp(join(tmpdir(), "hub-core-test-db-"));
			testDbUrl = `file:${join(testDbDir, "test.sqlite")}`;
		}
		client = createDbClient({
			url: testDbUrl,
			logger: false,
		});
		db = new Db(client);

		await migrateDb(client).catch(console.error);
		await ensureActivityLapsTable(client);
		console.log("migrated db");
		await clearData(client);
		console.log("cleared db");
		await importData(client);
		console.log("imported data");

		const activities = await db.getActivities({ limit: 1 });
		expect(activities.data.length).eq(1);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		activityId = activities.data[0]!.id;
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		gearId = activities.data[0]!.gears[0]!.id;
	});

	afterAll(async () => {
		if (!process.env.LOCAL_TEST_DB && testDbDir) {
			await rm(testDbDir, { recursive: true, force: true });
		}
	});

	beforeEach(() => {
		// tell vitest we use mocked time
		vi.useFakeTimers();
	});

	afterEach(() => {
		// restoring date after each test run
		vi.useRealTimers();
	});

	test("should get all accumulated data", async () => {
		const date = new Date(2024, 11, 15, 0);
		vi.setSystemTime(date);

		const result = await db.getActivitiesOverview();
		expect(result.length).eq(12);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[1]!.distance).eq(22388);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[2]!.distance).eq(1514);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[5]!.distance).eq(8181);

		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[1]!.month).eq("2024 11");
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[2]!.month).eq("2024 10");
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[5]!.month).eq("2024 07");

		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[1]!.count).eq(2);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[2]!.count).eq(1);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[5]!.count).eq(1);
	});

	test("should get limited accumulated data", async () => {
		const date = new Date(2024, 11, 15);
		vi.setSystemTime(date);

		const result = await db.getActivitiesOverview(4);
		expect(result.length).eq(4);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[1]!.distance).eq(22388);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[2]!.distance).eq(1514);

		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[1]!.month).eq("2024 11");
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[2]!.month).eq("2024 10");

		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[1]!.count).eq(2);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[2]!.count).eq(1);
	});

	test("should get weekly overview data", async () => {
		const date = new Date(2024, 11, 15);
		vi.setSystemTime(date);

		const result = await db.getWeeklyActivitiesOverview();
		expect(result.length).eq(4);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[0]!.weekStart).eq("2024-12-09");
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result[1]!.weekStart).eq("2024-12-02");
		// ensure numeric values
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(typeof result[0]!.distance).eq("number");
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(typeof result[0]!.duration).eq("number");
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(typeof result[0]!.activeDays).eq("number");
	});

	test("should bucket weekly overview by activity local timezone", async () => {
		const isolatedDbDir = await mkdtemp(join(tmpdir(), "hub-core-weekly-db-"));
		const isolatedDbUrl = `file:${join(isolatedDbDir, "test.sqlite")}`;
		const isolatedClient = createDbClient({
			url: isolatedDbUrl,
			logger: false,
		});
		const isolatedDb = new Db(isolatedClient);

		try {
			await migrateDb(isolatedClient);
			await ensureActivityLapsTable(isolatedClient);

			await isolatedDb.insertActivity({
				activity: {
					data: {
						name: "Monday Morning China Run",
						timestamp: new Date("2026-05-25T22:10:00.000Z").getTime(),
						timezone: "Asia/Shanghai",
						distance: 10010,
						duration: 3029,
						manufacturer: "manual",
						device: "manual",
						locationName: "Chaoyang",
						locationCountry: "China",
						type: ActivityType.RUN,
						subtype: ActivitySubType.EASY_RUN,
						notes: "",
						insight: "",
						description: "",
						metadata: "{}",
						isEvent: 0,
						startLatitude: 0,
						startLongitude: 0,
					},
				},
			});

			await isolatedDb.insertActivity({
				activity: {
					data: {
						name: "Sunday Morning China Run",
						timestamp: new Date("2026-05-23T22:09:00.000Z").getTime(),
						timezone: "Asia/Shanghai",
						distance: 10710,
						duration: 3235,
						manufacturer: "manual",
						device: "manual",
						locationName: "Chaoyang",
						locationCountry: "China",
						type: ActivityType.RUN,
						subtype: ActivitySubType.EASY_RUN,
						notes: "",
						insight: "",
						description: "",
						metadata: "{}",
						isEvent: 0,
						startLatitude: 0,
						startLongitude: 0,
					},
				},
			});

			vi.setSystemTime(new Date("2026-05-27T12:00:00.000Z"));

			const result = await isolatedDb.getWeeklyActivitiesOverview({
				limit: 2,
			});
			const currentWeek = result.find(
				(entry) => entry.weekStart === "2026-05-25",
			);
			const previousWeek = result.find(
				(entry) => entry.weekStart === "2026-05-18",
			);

			expect(currentWeek).toBeDefined();
			expect(currentWeek?.distance).eq(10010);
			expect(currentWeek?.duration).eq(3029);
			expect(currentWeek?.activeDays).eq(1);

			expect(previousWeek).toBeDefined();
			expect(previousWeek?.distance).eq(10710);
			expect(previousWeek?.duration).eq(3235);
			expect(previousWeek?.activeDays).eq(1);
		} finally {
			await rm(isolatedDbDir, { recursive: true, force: true });
		}
	});

	test("should anchor weekly overview to the selected target week", async () => {
		const date = new Date("2024-12-15T12:00:00.000Z");
		vi.setSystemTime(date);

		const result = await db.getWeeklyActivitiesOverview({
			limit: 2,
			targetWeekStart: "2024-12-02",
		});

		expect(result.length).eq(2);
		expect(result[0]?.weekStart).eq("2024-12-02");
		expect(result[1]?.weekStart).eq("2024-11-25");
	});

	test("should include sunday workouts in the anchored target week", async () => {
		const isolatedDbDir = await mkdtemp(
			join(tmpdir(), "hub-core-week-end-db-"),
		);
		const isolatedDbUrl = `file:${join(isolatedDbDir, "test.sqlite")}`;
		const isolatedClient = createDbClient({
			url: isolatedDbUrl,
			logger: false,
		});
		const isolatedDb = new Db(isolatedClient);

		try {
			await migrateDb(isolatedClient);
			await ensureActivityLapsTable(isolatedClient);

			await isolatedDb.insertActivity({
				activity: {
					data: {
						name: "Sunday Evening Seoul Run",
						timestamp: new Date("2026-06-07T09:00:00.000Z").getTime(),
						timezone: "Asia/Seoul",
						distance: 8170,
						duration: 2442,
						manufacturer: "manual",
						device: "manual",
						locationName: "Seoul",
						locationCountry: "South Korea",
						type: ActivityType.RUN,
						subtype: ActivitySubType.EASY_RUN,
						notes: "",
						insight: "",
						description: "",
						metadata: "{}",
						isEvent: 0,
						startLatitude: 0,
						startLongitude: 0,
					},
				},
			});

			const result = await isolatedDb.getWeeklyActivitiesOverview({
				limit: 1,
				targetWeekStart: "2026-06-01",
			});

			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({
				weekStart: "2026-06-01",
				distance: 8170,
				duration: 2442,
				activeDays: 1,
			});
		} finally {
			await rm(isolatedDbDir, { recursive: true, force: true });
		}
	});

	test("should get daily overview data for range", async () => {
		const result = await db.getDailyActivitiesOverview({
			startDate: "2024-11-01",
			endDate: "2024-11-07",
		});

		expect(result.length).eq(7);
		const dayOne = result[0];
		const daySix = result[5];
		expect(dayOne?.date).eq("2024-11-01");
		expect(dayOne?.distance).eq(11694);
		expect(dayOne?.duration).eq(3062);
		expect(dayOne?.count).eq(1);
		expect(daySix?.date).eq("2024-11-06");
		expect(daySix?.distance).eq(10694);
		expect(daySix?.duration).eq(3061);
	});

	test("should bucket daily overview by activity local timezone", async () => {
		const isolatedDbDir = await mkdtemp(join(tmpdir(), "hub-core-daily-db-"));
		const isolatedDbUrl = `file:${join(isolatedDbDir, "test.sqlite")}`;
		const isolatedClient = createDbClient({
			url: isolatedDbUrl,
			logger: false,
		});
		const isolatedDb = new Db(isolatedClient);

		try {
			await migrateDb(isolatedClient);
			await ensureActivityLapsTable(isolatedClient);

			await isolatedDb.insertActivity({
				activity: {
					data: {
						name: "Beijing Midnight Run",
						timestamp: new Date("2026-05-25T16:10:00.000Z").getTime(),
						timezone: "Asia/Shanghai",
						distance: 10010,
						duration: 3029,
						manufacturer: "manual",
						device: "manual",
						locationName: "Chaoyang",
						locationCountry: "China",
						type: ActivityType.RUN,
						subtype: ActivitySubType.EASY_RUN,
						notes: "",
						insight: "",
						description: "",
						metadata: "{}",
						isEvent: 0,
						startLatitude: 0,
						startLongitude: 0,
					},
				},
			});

			const result = await isolatedDb.getDailyActivitiesOverview({
				startDate: "2026-05-23",
				endDate: "2026-05-26",
			});

			expect(result).toHaveLength(4);
			expect(result[0]).toMatchObject({
				date: "2026-05-23",
				distance: 0,
				duration: 0,
				count: 0,
			});
			expect(result[3]).toMatchObject({
				date: "2026-05-26",
				distance: 10010,
				duration: 3029,
				count: 1,
			});
		} finally {
			await rm(isolatedDbDir, { recursive: true, force: true });
		}
	});

	test("should get activities with limit", async () => {
		const limit = 2;
		const result = await db.getActivities({ limit });
		if (result.data.length >= limit) {
			expect(result.data.length).eq(limit);
			expect(result.cursor).not.eq("");
		} else {
			expect(result.data.length).eq(result.count);
		}
	});

	test("should get all activities", async () => {
		const result = await db.getActivities({});
		expect(result.data.length).eq(result.count);
		expect(result.cursor).eq("");
	});

	test("should get running activities without attached gear", async () => {
		const baseActivity = {
			name: "No Gear Activity",
			timezone: "Asia/Seoul",
			distance: 5000,
			duration: 1800,
			manufacturer: "manual",
			device: "manual",
			locationName: "",
			locationCountry: "",
			startLatitude: 0,
			startLongitude: 0,
			notes: "",
			metadata: {},
			isEvent: 0 as const,
		};

		await db.insertActivity({
			activity: {
				data: {
					...baseActivity,
					timestamp: Date.now(),
					type: ActivityType.RUN,
					subtype: ActivitySubType.EASY_RUN,
				},
			},
		});
		await db.insertActivity({
			activity: {
				data: {
					...baseActivity,
					name: "Bike No Gear Activity",
					timestamp: Date.now() + 1,
					type: ActivityType.BIKE,
				},
			},
		});

		const result = await db.getActivities({
			withoutGear: 1,
		});

		expect(result.data.length).toBeGreaterThan(0);
		expect(
			result.data.every((activity) => activity.type === ActivityType.RUN),
		).toBe(true);
		expect(result.data.every((activity) => activity.gears.length === 0)).toBe(
			true,
		);
		expect(
			result.data.some((activity) => activity.name === "No Gear Activity"),
		).toBe(true);
		expect(
			result.data.some((activity) => activity.name === "Bike No Gear Activity"),
		).toBe(false);
	});

	test("should get one activity", async () => {
		const result = await db.getActivity(activityId);
		expect(result?.id).eq(activityId);
		expect(result?.laps).toEqual([]);
	});

	test("should persist and read activity laps", async () => {
		const createdActivityId = await db.insertActivity({
			activity: {
				data: {
					name: "Lap Session",
					timestamp: Date.now() + 10,
					timezone: "Asia/Seoul",
					distance: 10000,
					duration: 2400,
					manufacturer: "COROS",
					device: "COROS PACE 2",
					locationName: "",
					locationCountry: "",
					type: ActivityType.RUN,
					subtype: ActivitySubType.EASY_RUN,
					notes: "",
					insight: "",
					description: "",
					metadata: {},
					isEvent: 0,
					startLatitude: 0,
					startLongitude: 0,
				},
				providerActivity: {
					id: "strava-lap-session",
					provider: Providers.STRAVA,
					original: false,
					timestamp: Date.now() + 10,
					data: "{}",
				},
			},
			laps: [
				{
					lapNumber: 1,
					identifier: "Warm Up",
					distance: 2000,
					elapsedTime: 620,
					movingTime: 610,
					averageHeartRate: 128.5,
					maximumHeartRate: 141,
				},
				{
					lapNumber: 2,
					identifier: "Run",
					distance: 8000,
					elapsedTime: 1780,
					movingTime: 1770,
					averageHeartRate: 146.2,
					maximumHeartRate: 163,
				},
			],
		});

		const result = await db.getActivity(createdActivityId);
		expect(result?.laps).toHaveLength(2);
		expect(result?.laps[0]).toMatchObject({
			lapNumber: 1,
			identifier: "Warm Up",
			distance: 2000,
			elapsedTime: 620,
			movingTime: 610,
			averageHeartRate: 128.5,
			maximumHeartRate: 141,
		});
		expect(result?.laps[1]?.identifier).toBe("Run");
	});

	test("should edit a stored lap identifier", async () => {
		const createdActivityId = await db.insertActivity({
			activity: {
				data: {
					name: "Editable Lap Session",
					timestamp: Date.now() + 11,
					timezone: "Asia/Seoul",
					distance: 4000,
					duration: 1200,
					manufacturer: "COROS",
					device: "COROS PACE 2",
					locationName: "",
					locationCountry: "",
					type: ActivityType.RUN,
					subtype: ActivitySubType.EASY_RUN,
					notes: "",
					insight: "",
					description: "",
					metadata: {},
					isEvent: 0,
					startLatitude: 0,
					startLongitude: 0,
				},
			},
			laps: [
				{
					lapNumber: 1,
					identifier: "Warm Up",
					distance: 4000,
					elapsedTime: 1200,
					movingTime: 1190,
				},
			],
		});

		const before = await db.getActivity(createdActivityId);
		const lapId = before?.laps[0]?.id;
		expect(lapId).toBeTruthy();
		if (!lapId) {
			throw new Error("Expected lap id");
		}

		await db.editActivityLap(lapId, {
			identifier: "Threshold",
		});

		const after = await db.getActivity(createdActivityId);
		expect(after?.laps[0]?.identifier).toBe("Threshold");
	});

	test("should replace activity laps when a refreshed payload provides a new lap set", async () => {
		const providerActivityId = "strava-lap-refresh";
		const timestamp = Date.now() + 20;
		const firstActivityId = await db.insertActivity({
			activity: {
				data: {
					name: "Lap Refresh",
					timestamp,
					timezone: "Asia/Seoul",
					distance: 5000,
					duration: 1500,
					manufacturer: "COROS",
					device: "COROS PACE 2",
					locationName: "",
					locationCountry: "",
					type: ActivityType.RUN,
					subtype: ActivitySubType.EASY_RUN,
					notes: "",
					insight: "",
					description: "",
					metadata: {},
					isEvent: 0,
					startLatitude: 0,
					startLongitude: 0,
				},
				providerActivity: {
					id: providerActivityId,
					provider: Providers.STRAVA,
					original: false,
					timestamp,
					data: "{}",
				},
			},
			laps: [
				{
					lapNumber: 1,
					identifier: "Warm Up",
					distance: 1000,
					elapsedTime: 300,
					movingTime: 295,
				},
			],
		});

		const secondActivityId = await db.insertActivity({
			activity: {
				data: {
					name: "Lap Refresh",
					timestamp,
					timezone: "Asia/Seoul",
					distance: 5000,
					duration: 1500,
					manufacturer: "COROS",
					device: "COROS PACE 2",
					locationName: "",
					locationCountry: "",
					type: ActivityType.RUN,
					subtype: ActivitySubType.EASY_RUN,
					notes: "",
					insight: "",
					description: "",
					metadata: {},
					isEvent: 0,
					startLatitude: 0,
					startLongitude: 0,
				},
				providerActivity: {
					id: providerActivityId,
					provider: Providers.STRAVA,
					original: false,
					timestamp,
					data: "{}",
				},
			},
			laps: [
				{
					lapNumber: 1,
					identifier: "Speed",
					distance: 2000,
					elapsedTime: 540,
					movingTime: 535,
				},
				{
					lapNumber: 2,
					identifier: "Rest",
					distance: 3000,
					elapsedTime: 960,
					movingTime: 950,
				},
			],
		});

		expect(secondActivityId).toBe(firstActivityId);

		const result = await db.getActivity(firstActivityId);
		expect(result?.laps).toHaveLength(2);
		expect(result?.laps.map((lap) => lap.identifier)).toEqual([
			"Speed",
			"Rest",
		]);
	});

	test("should get gears with distance", async () => {
		const result = await db.getGears({});
		expect(result.count).to.eq(3);
		expect(result.data.length).to.eq(3);

		// validate distance
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result.data[0]!.distance).to.eq(13208);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result.data[1]!.distance).to.eq(23902);
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		expect(result.data[2]!.distance).to.eq(8181);
	});

	test("should get all gear connections", async () => {
		const connections = await db.getGearConnections(gearId);
		expect(connections.length).eq(1);
	});

	test("should get all gear linked to an activity", async () => {
		const result = await db.getActivityProvider(activityId, Providers.GARMIN);
		expect(result.length).eq(1);
	});

	test("should allow relinking a provider activity after the previous activity is soft-deleted", async () => {
		const provider = await db.getActivityProvider(activityId, Providers.GARMIN);
		const providerActivityId = provider[0]?.activityId;
		expect(providerActivityId).toBeTruthy();
		if (!providerActivityId) {
			throw new Error("Expected seeded provider activity");
		}

		await db.deleteActivity(activityId);

		const created = await db.createActivity({
			name: "Relink target",
			type: ActivityType.GYM,
			timestamp: new Date("2026-05-15T09:00:00.000Z").toISOString(),
			timezone: "Asia/Seoul",
			durationSeconds: 1800,
		});

		await expect(
			db.linkActivityConnection(created.id, providerActivityId),
		).resolves.toBeUndefined();

		const linkedActivity =
			await db.getActivityByProviderActivityId(providerActivityId);
		expect(linkedActivity?.id).toBe(created.id);
	});

	test("should export sync rows deterministically", async () => {
		const rows = await db.exportSyncRows({
			table: "activities",
			limit: 2,
			offset: 0,
		});

		expect(rows.length).eq(2);
		expect(typeof rows[0]?.id).eq("string");
		expect(typeof rows[1]?.id).eq("string");
		expect(String(rows[0]?.id) <= String(rows[1]?.id)).toBe(true);
	});

	test("should resolve the same internal app user for the same auth identity", async () => {
		const first = await db.getOrCreateAppUser({
			provider: "supabase",
			providerUserId: "supabase-user-1",
			email: "runner@example.com",
			displayName: "Runner One",
		});
		const second = await db.getOrCreateAppUser({
			provider: "supabase",
			providerUserId: "supabase-user-1",
			email: "runner@example.com",
			displayName: "Runner One",
		});

		expect(first.userId).eq(second.userId);
		expect(first.created).toBe(true);
		expect(second.created).toBe(false);
	});

	test("should create and complete a sync session while upserting rows", async () => {
		const resolvedUser = await db.getOrCreateAppUser({
			provider: "supabase",
			providerUserId: "sync-user-1",
			email: "sync-user-1@example.com",
		});
		const sync = await db.createSyncSession({
			userId: resolvedUser.userId,
			clientId: "desktop-test",
			schemaVersion: "1",
		});
		const activitySyncId = uuidv7();

		const pushed = await db.pushSyncRows({
			userId: resolvedUser.userId,
			syncSessionId: sync.syncSessionId,
			table: "activities",
			batchIndex: 0,
			rows: [
				{
					id: activitySyncId,
					name: "Synced Activity",
					timestamp: 1_700_000_000_000,
					timezone: "Asia/Seoul",
					distance: 1234,
					duration: 567,
					manufacturer: "sync",
					device: "sync",
					locationName: "",
					locationCountry: "",
					type: ActivityType.OTHER,
					subtype: null,
					notes: "",
					insight: "",
					description: "",
					metadata: "{}",
					isEvent: 0,
					startLatitude: 0,
					startLongitude: 0,
				},
			],
		});

		expect(pushed.processed).eq(1);
		expect(pushed.totalRows).eq(1);

		const syncedActivity = await db.getActivity(activitySyncId);
		expect(syncedActivity?.name).eq("Synced Activity");

		const completed = await db.finishSyncSession({
			userId: resolvedUser.userId,
			syncSessionId: sync.syncSessionId,
		});
		expect(completed.status).eq("completed");
		expect(completed.totalRows).eq(1);
	});

	test("should pull and apply sync rows and persist sync state", async () => {
		const resolvedUser = await db.getOrCreateAppUser({
			provider: "supabase",
			providerUserId: "sync-user-2",
			email: "sync-user-2@example.com",
		});
		const sync = await db.createSyncSession({
			userId: resolvedUser.userId,
			clientId: "desktop-test",
			schemaVersion: "2",
		});
		const activitySyncId = uuidv7();

		await db.pushSyncRows({
			userId: resolvedUser.userId,
			syncSessionId: sync.syncSessionId,
			table: "activities",
			batchIndex: 0,
			rows: [
				{
					id: activitySyncId,
					name: "Remote Activity",
					timestamp: 1_700_000_000_123,
					timezone: "Asia/Seoul",
					distance: 9999,
					duration: 123,
					manufacturer: "remote",
					device: "remote",
					locationName: "",
					locationCountry: "",
					type: ActivityType.OTHER,
					subtype: null,
					notes: "",
					insight: "",
					description: "",
					metadata: "{}",
					isEvent: 0,
					startLatitude: 0,
					startLongitude: 0,
				},
			],
		});

		const pulled = await db.pullSyncRows({
			userId: resolvedUser.userId,
			syncSessionId: sync.syncSessionId,
			table: "activities",
			limit: 10,
			offset: 0,
		});
		expect(pulled.rows.length).gte(1);

		const applied = await db.applySyncRows({
			table: "activities",
			rows: pulled.rows,
		});
		expect(applied).eq(pulled.rows.length);

		const state = await db.upsertSyncState({
			userId: resolvedUser.userId,
			lastSyncSessionId: sync.syncSessionId,
			lastSchemaVersion: "2",
			lastSyncedAt: "2026-05-11T00:00:00.000Z",
			lastPushCompletedAt: "2026-05-11T00:00:00.000Z",
			lastPullCompletedAt: "2026-05-11T00:00:00.000Z",
		});
		expect(state.userId).eq(resolvedUser.userId);
		expect(state.lastSchemaVersion).eq("2");
		expect(state.lastSyncSessionId).eq(sync.syncSessionId);
	});
});
