import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, test } from "vitest";
import { createDbClient } from "./client";
import { Db } from "./db";
import { clearData, importData } from "./seed/import";
describe("db", () => {
	const client = createDbClient({
		url: "file:test.sqlite",
	});
	const db = new Db(client);

	beforeAll(async () => {
		await migrate(client, { migrationsFolder: "./drizzle" });
		console.log("migrated db");
		await clearData(client);
		console.log("cleared db");
		await importData(client);
		console.log("imported data");
	});

	test("should get accumulated data", async () => {
		const result = await db.getActivitiesOverview(12);
		// console.log(result);
	});

	test("should get activities with limit", async () => {
		const limit = 3;
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
});
