import "dotenv/config";
import { createDbClient } from "./client";
import { migrateDb } from "./migrations";

async function run() {
	try {
		if (!process.env.POSTGRES_URL) {
			throw new Error(
				"Missing POSTGRES_URL. Set POSTGRES_URL before running db:migrate:postgres.",
			);
		}

		const db = createDbClient({
			dialect: "postgres",
			url: process.env.POSTGRES_URL,
		});
		await migrateDb(db);
		console.log("postgres migrations completed");
	} catch (err) {
		console.error(err);
		process.exitCode = 1;
	}
}

void run();
