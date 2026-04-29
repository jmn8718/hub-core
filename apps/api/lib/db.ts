import {
	CacheDb,
	Db,
	createDbClient,
	getDbClientConfigFromEnv,
} from "@repo/db";

const dbClient = createDbClient({
	...getDbClientConfigFromEnv(process.env),
	logger: false,
});

export const db = new Db(dbClient);
export const cacheDb = new CacheDb(dbClient);
