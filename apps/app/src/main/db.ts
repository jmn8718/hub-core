import { Db, createDbClient } from "@repo/db";
import { migrateDb } from "@repo/db/migrations";

// @ts-expect-error
if (!import.meta.env.MAIN_VITE_LOCAL_DB_FILE) {
	throw new Error("Missing MAIN_VITE_LOCAL_DB_FILE");
}
const dbClient = createDbClient({
	// @ts-expect-error
	url: import.meta.env.MAIN_VITE_LOCAL_DB_FILE,
});

migrateDb(dbClient)
	.then(() => {
		console.log("migration checkup completed");
	})
	.catch(console.error);

export const db = new Db(dbClient);
