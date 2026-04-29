import "dotenv/config";
import { createClient } from "@libsql/client";
import { Pool } from "pg";

type SqlValue = string | number | bigint | ArrayBuffer | null;
type SqlRow = Record<string, unknown>;
type PostgresValue = string | number | bigint | Buffer | null;

interface Options {
	localUrl: string;
	remoteUrl: string;
	batchSize: number;
	clearRemote: boolean;
	dryRun: boolean;
	skipMissing: boolean;
}

const INTERNAL_TABLES = new Set(["__drizzle_migrations"]);

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

	return {
		localUrl: requireValue(
			readFlagValue(args, "--local") ||
				process.env.LOCAL_DB ||
				process.env.MAIN_VITE_LOCAL_DB_FILE,
			"Missing local database. Set LOCAL_DB or pass --local <path-or-url>.",
		),
		remoteUrl: requireValue(
			readFlagValue(args, "--remote") || process.env.POSTGRES_URL,
			"Missing Postgres database. Set POSTGRES_URL or pass --remote <url>.",
		),
		batchSize,
		clearRemote: hasFlag(args, "--clear-remote"),
		dryRun: hasFlag(args, "--dry-run"),
		skipMissing: hasFlag(args, "--skip-missing"),
	};
}

function quoteIdentifier(identifier: string) {
	return `"${identifier.replaceAll('"', '""')}"`;
}

function isUserTable(name: string) {
	return !name.startsWith("sqlite_") && !INTERNAL_TABLES.has(name);
}

async function getLocalTableNames(client: ReturnType<typeof createClient>) {
	const result = await client.execute({
		sql: "SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name;",
		args: [],
	});
	return result.rows
		.map((row) => String((row as SqlRow).name))
		.filter(isUserTable);
}

async function getRemoteTableNames(pool: Pool) {
	const result = await pool.query<{
		table_name: string;
	}>(
		[
			"SELECT table_name",
			"FROM information_schema.tables",
			"WHERE table_schema = 'public' AND table_type = 'BASE TABLE'",
			"ORDER BY table_name;",
		].join(" "),
	);
	return result.rows
		.map((row) => row.table_name)
		.filter((table) => !INTERNAL_TABLES.has(table));
}

async function getLocalColumns(
	client: ReturnType<typeof createClient>,
	table: string,
) {
	const result = await client.execute({
		sql: `PRAGMA table_info(${quoteIdentifier(table)});`,
		args: [],
	});
	return result.rows.map((row) => String((row as SqlRow).name));
}

async function getRemoteColumns(pool: Pool, table: string) {
	const result = await pool.query<{
		column_name: string;
	}>(
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

async function getParentTables(
	client: ReturnType<typeof createClient>,
	table: string,
) {
	const result = await client.execute({
		sql: `PRAGMA foreign_key_list(${quoteIdentifier(table)});`,
		args: [],
	});
	return result.rows
		.map((row) => String((row as SqlRow).table))
		.filter(isUserTable);
}

async function sortTablesByDependency(
	client: ReturnType<typeof createClient>,
	tables: string[],
) {
	const tableSet = new Set(tables);
	const parents = new Map<string, string[]>();
	for (const table of tables) {
		const tableParents = await getParentTables(client, table);
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

async function countRows(
	client: ReturnType<typeof createClient>,
	table: string,
) {
	const result = await client.execute({
		sql: `SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)};`,
		args: [],
	});
	return Number((result.rows[0] as SqlRow | undefined)?.count || 0);
}

function mapRow(row: SqlRow, columns: string[]) {
	return columns.map((column) => {
		const value = row[column];
		if (
			value === null ||
			typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "bigint" ||
			value instanceof ArrayBuffer
		) {
			return value;
		}
		if (value instanceof Uint8Array) {
			if (value.buffer instanceof ArrayBuffer) {
				return value.buffer.slice(
					value.byteOffset,
					value.byteOffset + value.byteLength,
				);
			}
			throw new Error("SharedArrayBuffer values are not supported");
		}
		if (value === undefined) {
			return null;
		}
		throw new Error(`Unsupported SQL value type: ${typeof value}`);
	});
}

function mapPostgresValue(value: SqlValue): PostgresValue {
	if (value instanceof ArrayBuffer) {
		return Buffer.from(value);
	}
	return value;
}

async function fetchRows(params: {
	client: ReturnType<typeof createClient>;
	table: string;
	columns: string[];
	limit: number;
	offset: number;
}) {
	const { client, table, columns, limit, offset } = params;
	const columnSql = columns.map(quoteIdentifier).join(", ");
	const result = await client.execute({
		sql: `SELECT ${columnSql} FROM ${quoteIdentifier(table)} LIMIT ? OFFSET ?;`,
		args: [limit, offset],
	});
	return result.rows as SqlRow[];
}

async function validateTableColumns(params: {
	local: ReturnType<typeof createClient>;
	remote: Pool;
	tables: string[];
}) {
	const { local, remote, tables } = params;
	for (const table of tables) {
		const localColumns = await getLocalColumns(local, table);
		const remoteColumns = new Set(await getRemoteColumns(remote, table));
		const missingColumns = localColumns.filter(
			(column) => !remoteColumns.has(column),
		);
		if (missingColumns.length > 0) {
			throw new Error(
				`Remote table ${table} is missing column(s): ${missingColumns.join(
					", ",
				)}.`,
			);
		}
	}
}

async function copyTable(params: {
	local: ReturnType<typeof createClient>;
	remote: Pool;
	table: string;
	batchSize: number;
	dryRun: boolean;
}) {
	const { local, remote, table, batchSize, dryRun } = params;
	const columns = await getLocalColumns(local, table);
	const rowCount = await countRows(local, table);

	if (columns.length === 0) {
		console.log(`${table}: skipped table with no columns`);
		return;
	}

	if (dryRun || rowCount === 0) {
		console.log(`${table}: ${rowCount} row(s)`);
		return;
	}

	const columnSql = columns.map(quoteIdentifier).join(", ");

	let copied = 0;
	for (let offset = 0; offset < rowCount; offset += batchSize) {
		const rows = await fetchRows({
			client: local,
			table,
			columns,
			limit: batchSize,
			offset,
		});
		if (rows.length === 0) break;

		const valuePlaceholders = rows
			.map((_, rowIndex) => {
				const placeholders = columns.map(
					(_, columnIndex) => `$${rowIndex * columns.length + columnIndex + 1}`,
				);
				return `(${placeholders.join(", ")})`;
			})
			.join(", ");

		const values = rows.flatMap((row) =>
			mapRow(row, columns).map(mapPostgresValue),
		);

		await remote.query(
			`INSERT INTO ${quoteIdentifier(table)} (${columnSql}) VALUES ${valuePlaceholders};`,
			values,
		);
		copied += rows.length;
	}

	console.log(`${table}: copied ${copied}/${rowCount} row(s)`);
}

async function clearTables(params: {
	remote: Pool;
	tables: string[];
	dryRun: boolean;
}) {
	const { remote, tables, dryRun } = params;
	for (const table of [...tables].reverse()) {
		if (dryRun) {
			console.log(`${table}: would clear remote table`);
			continue;
		}
		await remote.query(`DELETE FROM ${quoteIdentifier(table)};`);
		console.log(`${table}: cleared remote table`);
	}
}

async function run() {
	const options = parseOptions();

	if (options.localUrl === options.remoteUrl) {
		throw new Error("Local and remote database URLs are identical.");
	}

	const local = createClient({ url: options.localUrl });
	const remote = new Pool({
		connectionString: options.remoteUrl,
	});

	try {
		const localTables = await sortTablesByDependency(
			local,
			await getLocalTableNames(local),
		);
		const remoteTables = new Set(await getRemoteTableNames(remote));
		const missingTables = localTables.filter(
			(table) => !remoteTables.has(table),
		);

		if (missingTables.length > 0 && !options.skipMissing) {
			throw new Error(
				`Remote database is missing table(s): ${missingTables.join(
					", ",
				)}. Run migrations first or pass --skip-missing.`,
			);
		}

		const tables = localTables.filter((table) => remoteTables.has(table));
		if (tables.length === 0) {
			throw new Error("No matching user tables found to copy.");
		}

		await validateTableColumns({ local, remote, tables });

		console.log(
			`${options.dryRun ? "Dry run: " : ""}copying ${tables.length} table(s)`,
		);

		if (options.clearRemote) {
			await clearTables({ remote, tables, dryRun: options.dryRun });
		}

		for (const table of tables) {
			await copyTable({
				local,
				remote,
				table,
				batchSize: options.batchSize,
				dryRun: options.dryRun,
			});
		}
	} finally {
		await Promise.all([local.close(), remote.end()]);
	}
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
