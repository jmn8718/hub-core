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

async function ensureSqliteSyncMetadata(client: SqliteDbClient) {
	const statements = [
		'ALTER TABLE "activities" ADD COLUMN "user_id" text',
		'ALTER TABLE "activities" ADD COLUMN "updated_at" text',
		'ALTER TABLE "activities" ADD COLUMN "deleted_at" text',
		'ALTER TABLE "provider_activities" ADD COLUMN "user_id" text',
		'ALTER TABLE "provider_activities" ADD COLUMN "updated_at" text',
		'ALTER TABLE "provider_activities" ADD COLUMN "deleted_at" text',
		'ALTER TABLE "activities_connection" ADD COLUMN "user_id" text',
		'ALTER TABLE "activities_connection" ADD COLUMN "updated_at" text',
		'ALTER TABLE "activities_connection" ADD COLUMN "deleted_at" text',
		'ALTER TABLE "gears" ADD COLUMN "user_id" text',
		'ALTER TABLE "gears" ADD COLUMN "updated_at" text',
		'ALTER TABLE "gears" ADD COLUMN "deleted_at" text',
		'ALTER TABLE "provider_gears" ADD COLUMN "user_id" text',
		'ALTER TABLE "provider_gears" ADD COLUMN "updated_at" text',
		'ALTER TABLE "provider_gears" ADD COLUMN "deleted_at" text',
		'ALTER TABLE "gears_connection" ADD COLUMN "user_id" text',
		'ALTER TABLE "gears_connection" ADD COLUMN "updated_at" text',
		'ALTER TABLE "gears_connection" ADD COLUMN "deleted_at" text',
		'ALTER TABLE "activity_gears" ADD COLUMN "user_id" text',
		'ALTER TABLE "activity_gears" ADD COLUMN "updated_at" text',
		'ALTER TABLE "activity_gears" ADD COLUMN "deleted_at" text',
		'ALTER TABLE "inbody" ADD COLUMN "user_id" text',
		'ALTER TABLE "inbody" ADD COLUMN "updated_at" text',
		'ALTER TABLE "inbody" ADD COLUMN "deleted_at" text',
		'ALTER TABLE "weight" ADD COLUMN "user_id" text',
		'ALTER TABLE "weight" ADD COLUMN "updated_at" text',
		'ALTER TABLE "weight" ADD COLUMN "deleted_at" text',
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
				message.includes("duplicate column name") ||
				message.includes("no such table") ||
				causeMessage.includes("duplicate column name") ||
				causeMessage.includes("no such table")
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

	return migrateLibsql(client as unknown as SqliteDbClient, {
		migrationsFolder: folderPath,
	}).then(async () => {
		await ensureSqliteSyncMetadata(client as unknown as SqliteDbClient);
	});
};
