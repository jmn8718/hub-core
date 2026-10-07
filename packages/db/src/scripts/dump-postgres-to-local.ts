import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";
import { Pool } from "pg";
import { createDbClient } from "../client";
import { migrateDb } from "../migrations";

// Load env from the current directory first, then fall back to the repo root
// so the script works from both the repo root and packages/db.
loadEnv();
loadEnv({
	path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../../.env"),
});

type SqlValue = string | number | bigint | ArrayBuffer | null;
type SqlRow = Record<string, unknown>;
type LibsqlClient = ReturnType<typeof createClient>;

interface Options {
	localUrl: string;
	remoteUrl: string;
	batchSize: number;
	clearLocal: boolean;
	dryRun: boolean;
	skipMissing: boolean;
	skipMigrate: boolean;
	tables: Set<string> | null;
}

// Bookkeeping tables that belong to each database and must not be copied.
const INTERNAL_TABLES = new Set([
	"__drizzle_migrations",
	"sync_sessions",
	"sync_state",
]);

function readFlagValue(args: string[], flag: string) {
	const index = args.indexOf(flag);
	if (index === -1) return undefined;
	return args[index + 1];
}

function hasFlag(args: string[], flag: string) {
	return args.includes(flag);
}

function requireValue(value: string | undefined, message: string) {
	if (!value) {
		throw new Error(message);
	}
	return value;
}

function parseOptions(): Options {
	const args = process.argv.slice(2);
	const batchSizeRaw = readFlagValue(args, "--batch-size");
	const batchSize = batchSizeRaw ? Number.parseInt(batchSizeRaw, 10) : 250;

	if (!Number.isInteger(batchSize) || batchSize < 1) {
		throw new Error("--batch-size must be a positive integer");
	}

	const tablesRaw = readFlagValue(args, "--tables");
	const tables = tablesRaw
		? new Set(
				tablesRaw
					.split(",")
					.map((table) => table.trim())
					.filter(Boolean),
			)
		: null;

	return {
		localUrl: requireValue(
			readFlagValue(args, "--local") ||
				process.env.LOCAL_DB ||
				process.env.MAIN_VITE_LOCAL_DB_FILE,
			"Missing local database. Set LOCAL_DB or MAIN_VITE_LOCAL_DB_FILE, or pass --local <path-or-url>.",
		),
		remoteUrl: requireValue(
			readFlagValue(args, "--remote") || process.env.POSTGRES_URL,
			"Missing Postgres database. Set POSTGRES_URL or pass --remote <url>.",
		),
		batchSize,
		clearLocal: hasFlag(args, "--clear-local"),
		dryRun: hasFlag(args, "--dry-run"),
		skipMissing: hasFlag(args, "--skip-missing"),
		skipMigrate: hasFlag(args, "--skip-migrate"),
		tables,
	};
}

function quoteIdentifier(identifier: string) {
	return `"${identifier.replaceAll('"', '""')}"`;
}

function isUserTable(name: string) {
	return !name.startsWith("sqlite_") && !INTERNAL_TABLES.has(name);
}

async function getLocalTableNames(client: LibsqlClient) {
	const result = await client.execute({
		sql: "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name;",
		args: [],
	});
	return result.rows
		.map((row) => String((row as SqlRow).name))
		.filter(isUserTable);
}

async function getRemoteTableNames(pool: Pool) {
	const result = await pool.query<{ table_name: string }>(
		[
			"SELECT table_name",
			"FROM information_schema.tables",
			"WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
			"ORDER BY table_name;",
		].join(" "),
	);
	return result.rows.map((row) => row.table_name).filter(isUserTable);
}

async function getLocalColumns(client: LibsqlClient, table: string) {
	const result = await client.execute({
		sql: `PRAGMA table_info(${quoteIdentifier(table)});`,
		args: [],
	});
	return result.rows.map((row) => ({
		name: String((row as SqlRow).name),
		notNull: Number((row as SqlRow).notnull) === 1,
		hasDefault: (row as SqlRow).dflt_value !== null,
		primaryKey: Number((row as SqlRow).pk) > 0,
	}));
}

async function getRemoteColumns(pool: Pool, table: string) {
	const result = await pool.query<{ column_name: string }>(
		[
			"SELECT column_name",
			"FROM information_schema.columns",
			"WHERE table_schema = 'public' AND table_name = $1",
			"ORDER BY ordinal_position;",
		].join(" "),
		[table],
	);
	return result.rows.map((row) => row.column_name);
}

async function getLocalParentTables(client: LibsqlClient, table: string) {
	const result = await client.execute({
		sql: `PRAGMA foreign_key_list(${quoteIdentifier(table)});`,
		args: [],
	});
	return result.rows
		.map((row) => String((row as SqlRow).table))
		.filter(isUserTable);
}

async function sortTablesByDependency(client: LibsqlClient, tables: string[]) {
	const tableSet = new Set(tables);
	const parents = new Map<string, string[]>();
	for (const table of tables) {
		const tableParents = await getLocalParentTables(client, table);
		parents.set(
			table,
			tableParents.filter((parent) => tableSet.has(parent)),
		);
	}

	const sorted: string[] = [];
	const visiting = new Set<string>();
	const visited = new Set<string>();

	function visit(table: string) {
		if (visited.has(table)) return;
		if (visiting.has(table)) {
			throw new Error(`Circular foreign-key dependency detected at ${table}`);
		}
		visiting.add(table);
		for (const parent of parents.get(table) || []) {
			visit(parent);
		}
		visiting.delete(table);
		visited.add(table);
		sorted.push(table);
	}

	for (const table of tables) {
		visit(table);
	}

	return sorted;
}

async function countRemoteRows(pool: Pool, table: string) {
	const result = await pool.query<{ count: string }>(
		`SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(table)};`,
	);
	return Number(result.rows[0]?.count || 0);
}

async function countLocalRows(client: LibsqlClient, table: string) {
	const result = await client.execute({
		sql: `SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)};`,
		args: [],
	});
	return Number((result.rows[0] as SqlRow | undefined)?.count || 0);
}

// Postgres driver values -> SQLite-storable values. Both schema trees use
// text/integer/real columns, so this mostly guards against driver-level
// representations (Date, boolean, Buffer, parsed JSON).
function mapPostgresValue(column: string, value: unknown): SqlValue {
	if (value === null || value === undefined) {
		return null;
	}
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "bigint"
	) {
		return value;
	}
	if (typeof value === "boolean") {
		return value ? 1 : 0;
	}
	if (value instanceof Date) {
		return value.toISOString();
	}
	if (Buffer.isBuffer(value)) {
		return value.buffer.slice(
			value.byteOffset,
			value.byteOffset + value.byteLength,
		) as ArrayBuffer;
	}
	if (value instanceof ArrayBuffer) {
		return value;
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	throw new Error(
		`Unsupported Postgres value type for column ${column}: ${typeof value}`,
	);
}

async function fetchRemoteRows(params: {
	pool: Pool;
	table: string;
	columns: string[];
	orderBy: string[];
	limit: number;
	offset: number;
}) {
	const { pool, table, columns, orderBy, limit, offset } = params;
	const columnSql = columns.map(quoteIdentifier).join(", ");
	const orderSql = orderBy.length
		? orderBy.map(quoteIdentifier).join(", ")
		: "1";
	const result = await pool.query<SqlRow>(
		`SELECT ${columnSql} FROM ${quoteIdentifier(table)} ORDER BY ${orderSql} LIMIT $1 OFFSET $2;`,
		[limit, offset],
	);
	return result.rows;
}

async function resolveTableColumns(params: {
	local: LibsqlClient;
	remote: Pool;
	table: string;
}) {
	const { local, remote, table } = params;
	const localColumns = await getLocalColumns(local, table);
	const remoteColumns = new Set(await getRemoteColumns(remote, table));

	const copied = localColumns
		.filter((column) => remoteColumns.has(column.name))
		.map((column) => column.name);
	const missingRemotely = localColumns.filter(
		(column) => !remoteColumns.has(column.name),
	);
	const requiredMissing = missingRemotely.filter(
		(column) => column.notNull && !column.hasDefault,
	);
	if (requiredMissing.length > 0) {
		throw new Error(
			`Remote table ${table} is missing required local column(s): ${requiredMissing
				.map((column) => column.name)
				.join(", ")}.`,
		);
	}
	if (missingRemotely.length > 0) {
		console.warn(
			`${table}: remote has no column(s) ${missingRemotely
				.map((column) => column.name)
				.join(", ")}; local defaults will be used`,
		);
	}
	const extraRemotely = [...remoteColumns].filter(
		(column) => !localColumns.some((local) => local.name === column),
	);
	if (extraRemotely.length > 0) {
		console.warn(
			`${table}: remote column(s) ${extraRemotely.join(", ")} do not exist locally and will be skipped`,
		);
	}

	return {
		columns: copied,
		orderBy: localColumns
			.filter((column) => column.primaryKey)
			.map((column) => column.name)
			.filter((column) => remoteColumns.has(column)),
	};
}

async function copyTable(params: {
	local: LibsqlClient;
	remote: Pool;
	table: string;
	batchSize: number;
	dryRun: boolean;
}) {
	const { local, remote, table, batchSize, dryRun } = params;
	const { columns, orderBy } = await resolveTableColumns({
		local,
		remote,
		table,
	});
	const rowCount = await countRemoteRows(remote, table);

	if (columns.length === 0) {
		console.log(`${table}: skipped table with no shared columns`);
		return 0;
	}

	if (dryRun || rowCount === 0) {
		console.log(`${table}: ${rowCount} remote row(s)`);
		return 0;
	}

	const placeholders = columns.map(() => "?").join(", ");
	const columnSql = columns.map(quoteIdentifier).join(", ");
	const insertSql = `INSERT OR REPLACE INTO ${quoteIdentifier(
		table,
	)} (${columnSql}) VALUES (${placeholders});`;

	let copied = 0;
	for (let offset = 0; offset < rowCount; offset += batchSize) {
		const rows = await fetchRemoteRows({
			pool: remote,
			table,
			columns,
			orderBy,
			limit: batchSize,
			offset,
		});
		if (rows.length === 0) break;

		await local.batch(
			rows.map((row) => ({
				sql: insertSql,
				args: columns.map((column) => mapPostgresValue(column, row[column])),
			})),
			"write",
		);
		copied += rows.length;
	}

	console.log(`${table}: copied ${copied}/${rowCount} row(s)`);
	return copied;
}

async function clearTables(params: {
	local: LibsqlClient;
	tables: string[];
	dryRun: boolean;
}) {
	const { local, tables, dryRun } = params;
	for (const table of [...tables].reverse()) {
		if (dryRun) {
			console.log(`${table}: would clear local table`);
			continue;
		}
		await local.execute({
			sql: `DELETE FROM ${quoteIdentifier(table)};`,
			args: [],
		});
		console.log(`${table}: cleared local table`);
	}
}

async function run() {
	const options = parseOptions();

	if (options.localUrl === options.remoteUrl) {
		throw new Error("Local and remote database URLs are identical.");
	}

	if (!options.skipMigrate) {
		const drizzleClient = createDbClient({
			dialect: "sqlite",
			url: options.localUrl,
			logger: false,
		});
		await migrateDb(drizzleClient);
	}

	const local = createClient({ url: options.localUrl });
	const remote = new Pool({ connectionString: options.remoteUrl, max: 1 });

	try {
		const localTables = await sortTablesByDependency(
			local,
			await getLocalTableNames(local),
		);
		const remoteTables = new Set(await getRemoteTableNames(remote));

		if (options.tables) {
			const unknown = [...options.tables].filter(
				(table) => !localTables.includes(table),
			);
			if (unknown.length > 0) {
				throw new Error(
					`Unknown local table(s) in --tables: ${unknown.join(", ")}`,
				);
			}
		}

		const requested = localTables.filter(
			(table) => !options.tables || options.tables.has(table),
		);
		const missingTables = requested.filter((table) => !remoteTables.has(table));
		if (missingTables.length > 0 && !options.skipMissing) {
			throw new Error(
				`Remote database is missing table(s): ${missingTables.join(
					", ",
				)}. Pass --skip-missing to ignore them.`,
			);
		}

		const tables = requested.filter((table) => remoteTables.has(table));
		if (tables.length === 0) {
			throw new Error("No matching user tables found to copy.");
		}

		console.log(
			`${options.dryRun ? "Dry run: " : ""}copying ${tables.length} table(s) from Postgres to ${options.localUrl}`,
		);

		if (options.clearLocal) {
			await clearTables({ local, tables, dryRun: options.dryRun });
		}

		let total = 0;
		for (const table of tables) {
			total += await copyTable({
				local,
				remote,
				table,
				batchSize: options.batchSize,
				dryRun: options.dryRun,
			});
		}

		if (!options.dryRun) {
			console.log(`done: copied ${total} row(s)`);
			console.log("local row counts:");
			for (const table of tables) {
				console.log(
					`  ${table.padEnd(24)} ${await countLocalRows(local, table)}`,
				);
			}
		}
	} finally {
		local.close();
		await remote.end();
	}
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
