import { CacheDb } from "./cache";
import { createDbClient } from "./client";
import { migrateDb } from "./migrations";

export function createTestCacheDb(testDbUrl?: string): Promise<CacheDb> {
	const client = createDbClient({
		url: testDbUrl || "file:test.sqlite",
		logger: false,
	});
	return migrateDb(client).then(() => {
		return new CacheDb(client);
	});
}
