import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { migrate as migrateLibsql } from "drizzle-orm/libsql/migrator";
import { migrate as migratePostgres } from "drizzle-orm/node-postgres/migrator";
import {
	type DbClient,
	type PostgresDbClient,
	type SqliteDbClient,
	getDbClientDialect,
} from "./client";

export { clearData } from "./tests/utils";

async function backfillSqliteUpdatedAt(client: SqliteDbClient) {
	const statements = [
		`UPDATE "activities"
		 SET "updated_at" = COALESCE(datetime("timestamp" / 1000, 'unixepoch'), CURRENT_TIMESTAMP)
		 WHERE "updated_at" IS NULL`,
		`UPDATE "provider_activities"
		 SET "updated_at" = COALESCE(datetime("timestamp" / 1000, 'unixepoch'), CURRENT_TIMESTAMP)
		 WHERE "updated_at" IS NULL`,
		`UPDATE "activities_connection"
		 SET "updated_at" = COALESCE(
		 	(SELECT "updated_at" FROM "activities" WHERE "activities"."id" = "activities_connection"."activity_id"),
		 	(SELECT "updated_at" FROM "provider_activities" WHERE "provider_activities"."id" = "activities_connection"."provider_activity_id"),
		 	CURRENT_TIMESTAMP
		 )
		 WHERE "updated_at" IS NULL`,
		`UPDATE "gears"
		 SET "updated_at" = COALESCE(NULLIF("date_begin", ''), NULLIF("date_end", ''), CURRENT_TIMESTAMP)
		 WHERE "updated_at" IS NULL`,
		`UPDATE "provider_gears"
		 SET "updated_at" = CURRENT_TIMESTAMP
		 WHERE "updated_at" IS NULL`,
		`UPDATE "gears_connection"
		 SET "updated_at" = COALESCE(
		 	(SELECT "updated_at" FROM "gears" WHERE "gears"."id" = "gears_connection"."gear_id"),
		 	(SELECT "updated_at" FROM "provider_gears" WHERE "provider_gears"."id" = "gears_connection"."provider_gear_id"),
		 	CURRENT_TIMESTAMP
		 )
		 WHERE "updated_at" IS NULL`,
		`UPDATE "activity_gears"
		 SET "updated_at" = COALESCE(
		 	(SELECT "updated_at" FROM "activities" WHERE "activities"."id" = "activity_gears"."activity_id"),
		 	(SELECT "updated_at" FROM "gears" WHERE "gears"."id" = "activity_gears"."gear_id"),
		 	CURRENT_TIMESTAMP
		 )
		 WHERE "updated_at" IS NULL`,
		`UPDATE "inbody"
		 SET "updated_at" = COALESCE(NULLIF("created_at", ''), NULLIF("date", ''), CURRENT_TIMESTAMP)
		 WHERE "updated_at" IS NULL`,
	];

	for (const statement of statements) {
		try {
			await client.run(sql.raw(statement));
		} catch (error) {
			const message =
				(error as Error).message ||
				(error as { cause?: Error }).cause?.message ||
				"";
			const causeMessage = (error as { cause?: Error }).cause?.message || "";
			if (
				message.includes("no such table") ||
				message.includes("no such column") ||
				causeMessage.includes("no such table") ||
				causeMessage.includes("no such column")
			) {
				continue;
			}
			throw error;
		}
	}
}

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
	if (dialect === "postgres") {
		return migratePostgres(client as unknown as PostgresDbClient, {
			migrationsFolder: folderPath,
		});
	}

	return backfillSqliteUpdatedAt(client as unknown as SqliteDbClient).then(() =>
		migrateLibsql(client as unknown as SqliteDbClient, {
			migrationsFolder: folderPath,
		}),
	);
};
