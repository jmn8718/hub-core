import "dotenv/config";
import { createDbClient } from "./client";
import { migrateDb } from "./migrations";

async function run() {
	try {
		const sqliteUrl = process.env.LOCAL_DB || process.env.TURSO_DATABASE_URL;
		if (!sqliteUrl) {
			throw new Error(
				"Missing SQLite database configuration. Set LOCAL_DB or TURSO_DATABASE_URL before running db:migrate.",
			);
		}

		const db = createDbClient({
			dialect: "sqlite",
			url: sqliteUrl,
			authToken: process.env.TURSO_AUTH_TOKEN,
		});
		await migrateDb(db);
		console.log("migrations completed");
	} catch (err) {
		console.error(err);
		process.exitCode = 1;
	}
}

void run();
