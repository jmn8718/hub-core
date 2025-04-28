import { Providers } from "@repo/types";
import { migrate } from "drizzle-orm/libsql/migrator";
import {
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
import { clearData, importData } from "./seed/common";

describe("db", () => {
	const client = createDbClient({
		url: "file:../../test.sqlite",
		logger: false,
	});
	const db = new Db(client);

	let activityId = "";
	let gearId = "";

	beforeAll(async () => {
		await migrate(client, { migrationsFolder: "./drizzle" }).catch(
			console.error,
		);
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

	test("should get one activity", async () => {
		const result = await db.getActivity(activityId);
		expect(result?.id).eq(activityId);
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
});
