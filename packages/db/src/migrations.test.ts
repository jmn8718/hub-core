import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { type SqliteDbClient, createDbClient } from "./client";
import {
	SQLITE_UPDATED_AT_REBUILD_TAG,
	migrateDb,
	migrateSqliteBefore,
} from "./migrations";

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe("sqlite migrations", () => {
	let dir = "";
	let client: SqliteDbClient;

	beforeEach(async () => {
		dir = await mkdtemp(join(tmpdir(), "hub-core-migration-test-"));
		client = createDbClient({
			url: `file:${join(dir, "test.sqlite")}`,
			logger: false,
		}) as unknown as SqliteDbClient;
	});

	afterEach(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	const countAppliedMigrations = async () => {
		const rows = await client.all<{ count: number }>(
			sql`SELECT COUNT(*) AS count FROM __drizzle_migrations`,
		);
		return Number(rows[0]?.count ?? 0);
	};

	test("migrates a fresh database to the latest version", async () => {
		await migrateDb(client);
		const applied = await countAppliedMigrations();
		expect(applied).toBeGreaterThan(10);

		// Running again is a no-op.
		await migrateDb(client);
		expect(await countAppliedMigrations()).toBe(applied);
	});

	test("upgrades a pre-0008 database that already holds rows", async () => {
		await migrateSqliteBefore(client, "0008_lame_black_tarantula");
		await client.run(
			sql`INSERT INTO activities (id, name, timestamp, type) VALUES ('legacy-1', 'Legacy run', 1700000000000, 'run')`,
		);
		await client.run(
			sql`INSERT INTO provider_activities (id, provider, timestamp, original) VALUES ('p-1', 'COROS', 1700000000000, 1)`,
		);
		await client.run(
			sql`INSERT INTO activities_connection (activity_id, provider_activity_id) VALUES ('legacy-1', 'p-1')`,
		);

		await client.run(
			sql`INSERT INTO gears (id, name, code, type, date_begin) VALUES ('gear-1', 'Shoes', 'shoes', 'shoes', '2026-01-01')`,
		);
		await client.run(
			sql`INSERT INTO inbody (id, weight, muscle_mass, body_fat_mass, bmi, percentage_body_fat, type, date, created_at) VALUES ('inbody-1', 70, 30, 10, 22, 14, 'inbody', '2026-01-02', '2026-01-02 10:20:30')`,
		);

		await migrateDb(client);

		// Copied legacy date strings are normalised to ISO timestamps.
		const gear = await client.all<{ updated_at: string | null }>(
			sql`SELECT updated_at FROM gears WHERE id = 'gear-1'`,
		);
		expect(gear[0]?.updated_at).toBe("2026-01-01T00:00:00.000Z");
		const inbodyRow = await client.all<{ updated_at: string | null }>(
			sql`SELECT updated_at FROM inbody WHERE id = 'inbody-1'`,
		);
		expect(inbodyRow[0]?.updated_at).toBe("2026-01-02T10:20:30.000Z");

		const rows = await client.all<{ updated_at: string | null }>(
			sql`SELECT updated_at FROM activities WHERE id = 'legacy-1'`,
		);
		expect(rows[0]?.updated_at).toMatch(ISO_TIMESTAMP);
		const connection = await client.all<{ updated_at: string | null }>(
			sql`SELECT updated_at FROM activities_connection WHERE activity_id = 'legacy-1'`,
		);
		expect(connection[0]?.updated_at).toMatch(ISO_TIMESTAMP);
	});

	test("upgrades a database stopped right before the NOT NULL rebuild", async () => {
		await migrateSqliteBefore(client, SQLITE_UPDATED_AT_REBUILD_TAG);
		await client.run(
			sql`INSERT INTO activities (id, name, timestamp, type) VALUES ('legacy-2', 'Legacy run', 1700000000000, 'run')`,
		);

		await migrateDb(client);

		const rows = await client.all<{ updated_at: string | null }>(
			sql`SELECT updated_at FROM activities WHERE id = 'legacy-2'`,
		);
		expect(rows[0]?.updated_at).toMatch(ISO_TIMESTAMP);
	});
});
