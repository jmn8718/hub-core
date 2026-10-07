import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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
		 SET "updated_at" = COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', "timestamp" / 1000, 'unixepoch'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
		 WHERE "updated_at" IS NULL`,
		`UPDATE "provider_activities"
		 SET "updated_at" = COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', "timestamp" / 1000, 'unixepoch'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
		 WHERE "updated_at" IS NULL`,
		`UPDATE "activities_connection"
		 SET "updated_at" = COALESCE(
		 	(SELECT "updated_at" FROM "activities" WHERE "activities"."id" = "activities_connection"."activity_id"),
		 	(SELECT "updated_at" FROM "provider_activities" WHERE "provider_activities"."id" = "activities_connection"."provider_activity_id"),
		 	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
		 )
		 WHERE "updated_at" IS NULL`,
		`UPDATE "gears"
		 SET "updated_at" = COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', NULLIF("date_begin", '')), strftime('%Y-%m-%dT%H:%M:%fZ', NULLIF("date_end", '')), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
		 WHERE "updated_at" IS NULL`,
		`UPDATE "provider_gears"
		 SET "updated_at" = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
		 WHERE "updated_at" IS NULL`,
		`UPDATE "gears_connection"
		 SET "updated_at" = COALESCE(
		 	(SELECT "updated_at" FROM "gears" WHERE "gears"."id" = "gears_connection"."gear_id"),
		 	(SELECT "updated_at" FROM "provider_gears" WHERE "provider_gears"."id" = "gears_connection"."provider_gear_id"),
		 	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
		 )
		 WHERE "updated_at" IS NULL`,
		`UPDATE "activity_gears"
		 SET "updated_at" = COALESCE(
		 	(SELECT "updated_at" FROM "activities" WHERE "activities"."id" = "activity_gears"."activity_id"),
		 	(SELECT "updated_at" FROM "gears" WHERE "gears"."id" = "activity_gears"."gear_id"),
		 	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
		 )
		 WHERE "updated_at" IS NULL`,
		`UPDATE "inbody"
		 SET "updated_at" = COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', NULLIF("created_at", '')), strftime('%Y-%m-%dT%H:%M:%fZ', NULLIF("date", '')), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
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

/**
 * Migration 0008 added nullable `updated_at` columns and 0010 rebuilt the
 * tables with `updated_at NOT NULL`. Databases created before 0008 must have
 * `updated_at` backfilled between those two steps, otherwise 0010 fails with a
 * NOT NULL constraint error. `migrateDb` therefore applies migrations in two
 * phases around this tag when needed.
 */
export const SQLITE_UPDATED_AT_REBUILD_TAG = "0010_nappy_black_panther";

interface MigrationJournal {
	entries: Array<{ idx: number; tag: string; when: number }>;
}

function getMigrationsFolder(dialect: "sqlite" | "postgres") {
	const __dirname = dirname(fileURLToPath(import.meta.url));
	return join(
		__dirname,
		"..",
		dialect === "postgres" ? "drizzle-postgres" : "drizzle",
	);
}

function readMigrationJournal(folderPath: string): MigrationJournal {
	return JSON.parse(
		readFileSync(join(folderPath, "meta", "_journal.json"), "utf8"),
	) as MigrationJournal;
}

async function getLastAppliedMigrationMillis(
	client: SqliteDbClient,
): Promise<number | null> {
	try {
		const rows = await client.all<{ created_at: number | string | null }>(
			sql`SELECT created_at FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 1`,
		);
		const value = rows[0]?.created_at;
		return value === null || value === undefined ? null : Number(value);
	} catch {
		// Table does not exist yet: nothing has been applied.
		return null;
	}
}

/**
 * Applies the SQLite migrations that precede `beforeTag` (exclusive) by
 * running the Drizzle migrator against a temporary folder holding a truncated
 * journal. Later migrations are left pending. Exported for upgrade tests.
 */
export async function migrateSqliteBefore(
	client: SqliteDbClient,
	beforeTag: string,
	folderPath = getMigrationsFolder("sqlite"),
) {
	const journal = readMigrationJournal(folderPath);
	const boundary = journal.entries.find((entry) => entry.tag === beforeTag);
	if (!boundary) {
		throw new Error(`Unknown migration tag ${beforeTag}`);
	}
	const entries = journal.entries.filter((entry) => entry.when < boundary.when);
	if (entries.length === 0) return;

	const tempFolder = mkdtempSync(join(tmpdir(), "hub-core-migrations-"));
	try {
		mkdirSync(join(tempFolder, "meta"));
		writeFileSync(
			join(tempFolder, "meta", "_journal.json"),
			JSON.stringify({ ...journal, entries }),
		);
		for (const entry of entries) {
			copyFileSync(
				join(folderPath, `${entry.tag}.sql`),
				join(tempFolder, `${entry.tag}.sql`),
			);
		}
		await migrateLibsql(client, { migrationsFolder: tempFolder });
	} finally {
		rmSync(tempFolder, { recursive: true, force: true });
	}
}

async function migrateSqlite(client: SqliteDbClient, folderPath: string) {
	const journal = readMigrationJournal(folderPath);
	const rebuild = journal.entries.find(
		(entry) => entry.tag === SQLITE_UPDATED_AT_REBUILD_TAG,
	);
	const lastApplied = await getLastAppliedMigrationMillis(client);
	const needsBackfill =
		rebuild !== undefined &&
		(lastApplied === null || lastApplied < rebuild.when);

	if (needsBackfill) {
		await migrateSqliteBefore(
			client,
			SQLITE_UPDATED_AT_REBUILD_TAG,
			folderPath,
		);
		await backfillSqliteUpdatedAt(client);
	}

	return migrateLibsql(client, { migrationsFolder: folderPath });
}

export const migrateDb = (client: DbClient) => {
	const dialect = getDbClientDialect(client);
	const folderPath = getMigrationsFolder(dialect);
	console.log("migrations path", folderPath);
	if (dialect === "postgres") {
		return migratePostgres(client as unknown as PostgresDbClient, {
			migrationsFolder: folderPath,
		});
	}

	return migrateSqlite(client as unknown as SqliteDbClient, folderPath);
};
