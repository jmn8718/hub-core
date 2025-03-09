import { faker } from "@faker-js/faker";
import { ActivityType, GearType } from "@repo/types";
import { migrate } from "drizzle-orm/libsql/migrator";
import { beforeAll, describe, expect, test } from "vitest";
import { createDbClient } from "./client";
import { Db } from "./db";
import { activities, activityGears, gears } from "./schemas/app";

describe("db", () => {
	const client = createDbClient({
		url: "file:test_db.sqlite",
	});
	const db = new Db(client);
	migrate(client, { migrationsFolder: "./drizzle" });

	beforeAll(async () => {
		await client.delete(activityGears);
		await client.delete(activities);
		await client.delete(gears);

		const activitiesData = await client
			.insert(activities)
			.values({
				timestamp: faker.date.past().toISOString(),
				startLatitude: 0,
				startLongitude: 0,
				name: faker.string.sample(),
				type: ActivityType.RUN,
				locationCountry: faker.location.country(),
				locationName: faker.location.city(),
				distance: faker.number.float({ min: 10, max: 100 }),
				duration: faker.number.int({ min: 100, max: 500 }),
			})
			.returning();
		const gearsData = await client
			.insert(gears)
			.values([
				{
					type: GearType.INSOLE,
					name: faker.string.alphanumeric(),
					code: faker.string.alphanumeric(),
				},
				{
					type: GearType.SHOES,
					name: faker.string.alphanumeric(),
					code: faker.string.alphanumeric(),
				},
			])
			.returning();
		const insertedActivity = activitiesData[0];
		if (insertedActivity) {
			await client.insert(activityGears).values(
				gearsData.map((gearData) => ({
					activityId: insertedActivity.id,
					gearId: gearData.id,
				})),
			);
		}
	});

	test("should return all the activities", async () => {
		const result = await db.getActivities({});
		console.log(result);
		expect(result.count).eq(1);
		expect(result.data.length).eq(1);
	});
});
