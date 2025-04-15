import "dotenv/config";
import { createDbClient } from "../client.js";
import { webhooks } from "../schemas/webhooks.js";
import { webhooks as webhooksData } from "../mocks/index.js";

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
			owner_id: record.owner_id.toString(),
			object_id: record.object_id.toString(),
			subscription_id: record.subscription_id.toString(),
			event_time: record.created_at,
		})),
	);
}

run().then(() => {
	console.log("Seeding complete.");
});
