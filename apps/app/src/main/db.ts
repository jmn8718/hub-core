import { CacheDb, Db, createDbClient } from "@repo/db";
import { migrateDb } from "@repo/db/migrations";
import { LOCAL_DB_FILE } from "./config.js";

const dbClient = createDbClient({
	url: LOCAL_DB_FILE,
});

migrateDb(dbClient)
	.then(() => {
		console.log("migration checkup completed");
	})
	.catch(console.error);

export const db = new Db(dbClient);
export const cacheDb = new CacheDb(dbClient);
