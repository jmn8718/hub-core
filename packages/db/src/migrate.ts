import "dotenv/config";
import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { type DbClient, createDbClient } from "./client.js";

const migrateDb = (client: DbClient) => {
	const folderPath = join(__filename, "..", "drizzle");
	console.log("migrations path", folderPath);
	return migrate(client, { migrationsFolder: folderPath });
};

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
