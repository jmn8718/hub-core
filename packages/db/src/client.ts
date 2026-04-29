import {
	type LibSQLDatabase,
	drizzle as drizzleLibsql,
} from "drizzle-orm/libsql";
import {
	type NodePgDatabase,
	drizzle as drizzlePg,
} from "drizzle-orm/node-postgres";
import type { PoolConfig } from "pg";
import { Pool } from "pg";
import * as sqliteSchema from "./schemas/index.js";
import * as postgresSchema from "./schemas/postgres/index.js";

export type DbDialect = "sqlite" | "postgres";

type SqliteSchema = typeof sqliteSchema;
type PostgresSchema = typeof postgresSchema;

export type SqliteDbClient = LibSQLDatabase<SqliteSchema>;
export type PostgresDbClient = NodePgDatabase<PostgresSchema>;
export type DbClient = SqliteDbClient;

type SqliteDbClientConfig = {
	dialect?: "sqlite";
	url: string;
	syncUrl?: string;
	authToken?: string;
	syncInterval?: number;
	readYourWrites?: boolean;
	offline?: boolean;
	logger?: boolean;
};

type PostgresDbClientConfig = {
	dialect: "postgres";
	url: string;
	logger?: boolean;
	max?: number;
	ssl?: PoolConfig["ssl"];
};

export type DbClientConfig = SqliteDbClientConfig | PostgresDbClientConfig;

const dbClientMetadata = new WeakMap<
	object,
	{
		dialect: DbDialect;
	}
>();

function setDbClientDialect<T extends object>(
	client: T,
	dialect: DbDialect,
): T {
	dbClientMetadata.set(client, {
		dialect,
	});
	return client;
}

function parsePostgresSsl(
	value: string | undefined,
): PoolConfig["ssl"] | undefined {
	if (!value) return undefined;
	const normalized = value.toLowerCase();
	if (["0", "false", "disable", "off"].includes(normalized)) {
		return false;
	}
	if (["1", "true", "require", "on"].includes(normalized)) {
		return {
			rejectUnauthorized: false,
		};
	}
	return undefined;
}

export function getDbClientDialect(client: DbClient): DbDialect {
	return dbClientMetadata.get(client as object)?.dialect ?? "sqlite";
}

export function getDbClientConfigFromEnv(
	env: NodeJS.ProcessEnv = process.env,
): DbClientConfig {
	if (env.POSTGRES_URL) {
		return {
			dialect: "postgres",
			url: env.POSTGRES_URL,
			ssl: parsePostgresSsl(env.POSTGRES_SSL),
		};
	}

	if (env.LOCAL_DB) {
		return {
			dialect: "sqlite",
			url: env.LOCAL_DB,
		};
	}

	if (!env.TURSO_DATABASE_URL) {
		throw new Error(
			"Missing database configuration. Set LOCAL_DB, TURSO_DATABASE_URL, or POSTGRES_URL.",
		);
	}

	return {
		dialect: "sqlite",
		url: env.TURSO_DATABASE_URL,
		authToken: env.TURSO_AUTH_TOKEN,
	};
}

export function createDbClient(config: DbClientConfig): DbClient {
	if (config.dialect === "postgres") {
		const client = drizzlePg({
			client: new Pool({
				connectionString: config.url,
				max: config.max,
				ssl: config.ssl,
			}),
			logger: config.logger ?? true,
			schema: postgresSchema,
		});

		return setDbClientDialect(client, "postgres") as unknown as DbClient;
	}

	const client = drizzleLibsql({
		connection: {
			url: config.url,
			authToken: config.authToken,
			syncUrl: config.syncUrl,
			syncInterval: config.syncInterval,
			readYourWrites: config.readYourWrites,
			offline: config.offline,
		},
		logger: config.logger ?? true,
		schema: sqliteSchema,
	});

	return setDbClientDialect(client, "sqlite");
}
