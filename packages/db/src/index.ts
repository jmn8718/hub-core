import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import type { Config } from "@libsql/core/api";

export function createDbClient(config: Config) {
  const client = createClient(config);
  return drizzle(client, { logger: true });
}

export * from "./schemas";
export * from "drizzle-orm";
