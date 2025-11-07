import "dotenv/config";
import { ActivityType } from "@repo/types";
import { and, eq, sql } from "drizzle-orm";
import pMap from "p-map";
import { createDbClient } from "../client.js";
import { activities } from "../schemas/app.js";

async function run() {
	const client = createDbClient(
		process.env.LOCAL_DB
			? {
					url: process.env.LOCAL_DB,
					logger: false,
				}
			: {
					url: process.env.TURSO_DATABASE_URL,
					authToken: process.env.TURSO_AUTH_TOKEN,
					logger: false,
				},
	);

	const matches = await client
		.select({
			id: activities.id,
			name: activities.name,
		})
		.from(activities)
		.where(
			and(
				eq(activities.type, ActivityType.OTHER),
				sql`lower(${activities.name}) like '%ride%'`,
			),
		);

	if (matches.length === 0) {
		console.log("No activities found matching criteria.");
		return;
	}

	console.log(`Found ${matches.length} activities. Updating to BIKE type...`);
	await pMap(
		matches,
		async ({ id, name }) => {
			await client
				.update(activities)
				.set({ type: ActivityType.BIKE })
				.where(eq(activities.id, id));
			console.log(`Updated ${name ?? id} to BIKE`);
		},
		{ concurrency: 1 },
	);
	console.log("Update complete.");
}

run().catch((error) => {
	console.error("Failed to update ride activities:", error);
	process.exit(1);
});
