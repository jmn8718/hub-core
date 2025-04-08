import "dotenv/config";
import { createDbClient } from "../client.js";
import { clearData } from "./common.js";

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

	await clearData(client);
	console.log("--- db cleared");
}

run().then(() => {
	console.log("Seeding complete.");
});
