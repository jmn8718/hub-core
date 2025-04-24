import "dotenv/config";
import { createDbClient } from "./client";
import { migrateDb } from "./migrations";

async function run() {
	try {
		const url = process.env.LOCAL_DB || process.env.TURSO_DATABASE_URL || "";
		const db = createDbClient({
			url,
			authToken: !process.env.LOCAL_DB
				? process.env.TURSO_AUTH_TOKEN
				: undefined,
		});
		await migrateDb(db);
		console.log("migrations completed");
	} catch (err) {
		console.error(err);
	}
}

run();
