import { CacheDb, Db, createDbClient } from "@repo/db";

const { TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, LOCAL_DB } = process.env;

if (!LOCAL_DB) {
	if (!TURSO_DATABASE_URL) {
		throw new Error("Missing TURSO_DATABASE_URL");
	}

	if (!TURSO_AUTH_TOKEN) {
		throw new Error("Missing TURSO_AUTH_TOKEN");
	}
}

const dbClient = createDbClient(
	LOCAL_DB
		? {
				url: LOCAL_DB,
				logger: false,
			}
		: {
				url: TURSO_DATABASE_URL,
				authToken: TURSO_AUTH_TOKEN,
				logger: false,
			},
);

export const db = new Db(dbClient);
export const cacheDb = new CacheDb(dbClient);
