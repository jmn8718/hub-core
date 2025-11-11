import { CacheDb } from "./cache";
import { type DbClient, createDbClient } from "./client";
import { Db } from "./db";
import { migrateDb } from "./migrations";
import {
	activities,
	activitiesConnection,
	activityGears,
	gears,
	gearsConnection,
	profiles,
	providerActivities,
	providerGears,
} from "./schemas";

function clearTestDb(client: DbClient): Promise<void> {
	return Promise.all([
		client.delete(activitiesConnection),
		client.delete(gearsConnection),
		client.delete(activityGears),
		client.delete(gears),
		client.delete(activities),
		client.delete(providerActivities),
		client.delete(providerGears),
		client.delete(profiles),
	]).then(() => {});
}

function createTestDbClient({
	testDbUrl,
	clearDb = true,
}: {
	testDbUrl?: string;
	clearDb?: boolean;
}): DbClient {
	const client = createDbClient({
		url: testDbUrl || "file:test.sqlite",
		logger: false,
	});
	if (clearDb) {
		clearTestDb(client);
	}
	return client;
}

export function createTestCacheDb(params: {
	testDbUrl?: string;
	clearDb?: boolean;
}): Promise<CacheDb> {
	const client = createTestDbClient(params);
	return migrateDb(client).then(() => {
		return new CacheDb(client);
	});
}

export function createTestDb(params: {
	testDbUrl?: string;
	clearDb?: boolean;
}): Promise<Db> {
	const client = createTestDbClient(params);
	return migrateDb(client).then(() => {
		return new Db(client);
	});
}
