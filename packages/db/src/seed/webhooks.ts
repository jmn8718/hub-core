import "dotenv/config";
import { createDbClient } from "../client.js";
import { cloudWebhooksData } from "../mocks/webhooks.js";
import { webhooks } from "../schemas/webhooks.js";

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

	await db.delete(webhooks);
	console.log("--------- Cleared webhooks table ---------");

	await db.insert(webhooks).values(
		cloudWebhooksData.map((record) => ({
			...record,
			id: record.id,
			owner_id: record.owner_id.toString(),
			object_id: record.object_id.toString(),
			subscription_id: record.subscription_id.toString(),
			event_time: record.created_at,
		})),
	);
	console.log("--------- Seeded webhooks table ---------");
}

run().then(() => {
	console.log("Seeding complete.");
});
