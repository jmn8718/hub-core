import { createDbClient, getDbClientConfigFromEnv } from "@repo/db";

const db = createDbClient(getDbClientConfigFromEnv(process.env));

export default db;
