import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schemas/index";

export type DbClient = ReturnType<typeof drizzle>;

export function createDbClient(config: {
	url: string;
	syncUrl?: string;
	authToken?: string;
	logger?: boolean;
}): DbClient {
	return drizzle({ connection: config, logger: config.logger ?? true, schema });
}
