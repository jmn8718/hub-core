import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import type { Config } from "@libsql/core/api";
import * as schema from "./schemas";

export function createDbClient(config: Config) {
  const client = createClient(config);
  return drizzle(client, { logger: true, schema });
}

export type DbClient = ReturnType<typeof drizzle>;
