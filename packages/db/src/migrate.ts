import "dotenv/config";
import { createDbClient, getDbClientConfigFromEnv } from "./client";
import { migrateDb } from "./migrations";

async function run() {
	try {
		const db = createDbClient(getDbClientConfigFromEnv(process.env));
		await migrateDb(db);
		console.log("migrations completed");
	} catch (err) {
		console.error(err);
	}
}

run();
