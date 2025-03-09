/* eslint-disable turbo/no-undeclared-env-vars */
import { createDbClient } from "@repo/db";

const db = createDbClient({
	url: process.env.TURSO_DATABASE_URL,
	authToken: process.env.TURSO_AUTH_TOKEN,
});

export default db;
