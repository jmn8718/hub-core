import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schemas/index";

export type DbClient = ReturnType<typeof drizzle>;

export function createDbClient(config: {
	url: string;
	syncUrl?: string;
	authToken?: string;
}): DbClient {
	return drizzle({ connection: config, logger: true, schema });
}
