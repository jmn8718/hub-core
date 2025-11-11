import "dotenv/config";
import { createDbClient } from "../client.js";
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

	const data = await db.select().from(webhooks);

	console.log(data);
}

run().then(() => {
	console.log("export webhooks data complete.");
});
