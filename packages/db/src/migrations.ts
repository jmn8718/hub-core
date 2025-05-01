import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/libsql/migrator";
import type { DbClient } from "./client";

export { clearData } from "./seed/common";
export const migrateDb = (client: DbClient) => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const folderPath = join(__dirname, "..", "drizzle");
	console.log("migrations path", folderPath);
	return migrate(client, { migrationsFolder: folderPath });
};
