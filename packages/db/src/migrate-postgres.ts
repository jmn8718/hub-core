import "dotenv/config";
import { createDbClient } from "./client";
import { migrateDb } from "./migrations";

function parsePostgresSsl(value: string | undefined) {
	if (!value) return undefined;
	const normalized = value.toLowerCase();
	if (["0", "false", "disable", "off"].includes(normalized)) {
		return false;
	}
	if (["1", "true", "require", "on"].includes(normalized)) {
		return {
			rejectUnauthorized: false,
		};
	}
	return undefined;
}

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
			ssl: parsePostgresSsl(process.env.POSTGRES_SSL),
		});
		await migrateDb(db);
		console.log("postgres migrations completed");
	} catch (err) {
		console.error(err);
		process.exitCode = 1;
	}
}

void run();
