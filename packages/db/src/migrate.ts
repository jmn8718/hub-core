import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createDbClient } from "./index.js";

const db = createDbClient(
	process.env.LOCAL_DB
		? {
				url: process.env.LOCAL_DB,
			}
		: {
				url: process.env.TURSO_DATABASE_URL,
				authToken: process.env.TURSO_AUTH_TOKEN,
			},
);

migrate(db, { migrationsFolder: "./drizzle" });
