import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schemas/index.js";

export type DbClient = ReturnType<typeof drizzle>;

export function createDbClient({
	logger,
	...config
}: {
	url: string;
	syncUrl?: string;
	authToken?: string;
	syncInterval?: number;
	readYourWrites?: boolean;
	offline?: boolean;
	logger?: boolean;
}): DbClient {
	return drizzle({ connection: config, logger: logger ?? true, schema });
}
