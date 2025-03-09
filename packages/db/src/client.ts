import { createClient } from "@libsql/client";
import type { Config } from "@libsql/core/api";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schemas/index";

export function createDbClient(config: Config) {
	const client = createClient(config);
	return drizzle(client, { logger: true, schema });
}

export type DbClient = ReturnType<typeof drizzle>;
