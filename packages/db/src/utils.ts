import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { CacheDb } from "./cache";
import { type DbClient, createDbClient } from "./client";
import { Db } from "./db";
import { migrateDb } from "./migrations";
import {
	activities,
	activitiesConnection,
	activityGears,
	activityLaps,
	gears,
	gearsConnection,
	profiles,
	providerActivities,
	providerGears,
} from "./schemas";

async function clearTestDb(client: DbClient): Promise<void> {
	const clearActions = [
		() => client.delete(activitiesConnection),
		() => client.delete(activityLaps),
		() => client.delete(gearsConnection),
		() => client.delete(activityGears),
		() => client.delete(gears),
		() => client.delete(activities),
		() => client.delete(providerActivities),
		() => client.delete(providerGears),
		() => client.delete(profiles),
	];

	for (const clearAction of clearActions) {
		await clearAction();
	}
}

async function ensureActivityLapsTable(client: DbClient): Promise<void> {
	await client.run(
		sql.raw(`CREATE TABLE IF NOT EXISTS "activity_laps" (
			"id" text PRIMARY KEY NOT NULL,
			"activity_id" text NOT NULL,
			"lap_number" integer NOT NULL,
			"identifier" text DEFAULT '' NOT NULL,
			"distance" real DEFAULT 0 NOT NULL,
			"elapsed_time" integer DEFAULT 0 NOT NULL,
			"moving_time" integer DEFAULT 0 NOT NULL,
			"average_heart_rate" real,
			"maximum_heart_rate" real,
			"user_id" text,
			"updated_at" text NOT NULL,
			"deleted_at" text,
			FOREIGN KEY ("activity_id") REFERENCES "activities"("id")
		)`),
	);
}

async function createPreparedTestDbClient({
	testDbUrl,
	clearDb = true,
}: {
	testDbUrl?: string;
	clearDb?: boolean;
}): Promise<DbClient> {
	const resolvedTestDbUrl =
		testDbUrl ||
		`file:${join(await mkdtemp(join(tmpdir(), "hub-core-test-db-")), "test.sqlite")}`;
	const client = createDbClient({
		url: resolvedTestDbUrl,
		logger: false,
	});

	await migrateDb(client);
	await ensureActivityLapsTable(client);

	if (clearDb) {
		await clearTestDb(client);
	}

	return client;
}

export function createTestCacheDb(params: {
	testDbUrl?: string;
	clearDb?: boolean;
}): Promise<CacheDb> {
	return createPreparedTestDbClient(params).then(
		(client) => new CacheDb(client),
	);
}

export function createTestDb(params: {
	testDbUrl?: string;
	clearDb?: boolean;
}): Promise<Db> {
	return createPreparedTestDbClient(params).then((client) => new Db(client));
}
