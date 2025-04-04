import { createDbClient } from "@repo/db";

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

export default db;
