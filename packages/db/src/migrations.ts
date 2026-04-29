import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate as migrateLibsql } from "drizzle-orm/libsql/migrator";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import {
	type DbClient,
	type PostgresDbClient,
	type SqliteDbClient,
	getDbClientDialect,
} from "./client";

export { clearData } from "./tests/utils";
export const migrateDb = (client: DbClient) => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const dialect = getDbClientDialect(client);
	const folderPath = join(
		__dirname,
		"..",
		dialect === "postgres" ? "drizzle-postgres" : "drizzle",
	);
	console.log("migrations path", folderPath);
	return dialect === "postgres"
		? migratePostgres(client as unknown as PostgresDbClient, {
				migrationsFolder: folderPath,
			})
		: migrateLibsql(client as unknown as SqliteDbClient, {
				migrationsFolder: folderPath,
			});
};
