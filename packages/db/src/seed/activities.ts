import "dotenv/config";
import { faker } from "@faker-js/faker";
import { ActivityType, GearType } from "@repo/types";
import { createDbClient } from "../client";
import { activities, activityGears, gears } from "../schemas/app";

async function run() {
	const client = createDbClient(
		process.env.LOCAL_DB
			? {
					url: process.env.LOCAL_DB,
				}
			: {
					url: process.env.TURSO_DATABASE_URL,
					authToken: process.env.TURSO_AUTH_TOKEN,
				},
	);

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
	console.log({ gearsData, activitiesData });
	const insertedActivity = activitiesData[0];
	if (insertedActivity) {
		const i = await client.insert(activityGears).values(
			gearsData.map((gearData) => ({
				activityId: insertedActivity.id,
				gearId: gearData.id,
			})),
		);
		console.log({ i });
	} else {
		console.log("no activity data inserted");
	}
}

run().then(() => {
	console.log("Seeding complete.");
});
