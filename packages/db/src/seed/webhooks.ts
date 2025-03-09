import "dotenv/config";
import { createDbClient } from "../client";
import { webhooks } from "../schemas/webhooks";
import { webhooks as webhooksData } from "./data";

async function run() {
	const db = createDbClient(
		process.env.LOCAL_DB
			? {
					url: process.env.LOCAL_DB,
				}
			: {
					url: process.env.TURSO_DATABASE_URL,
					authToken: process.env.TURSO_AUTH_TOKEN,
				},
	);

	await db.insert(webhooks).values(
		webhooksData.map((record) => ({
			...record,
			event_time: record.created_at,
		})),
	);
}

run().then(() => {
	console.log("Seeding complete.");
});
