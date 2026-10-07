import { dirname, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";
import {
	CLOUD_SYNC_SCHEMA_VERSION,
	type ISyncPullData,
	type ISyncValidateData,
	type SyncTableName,
} from "@repo/types";
import { config as loadEnv } from "dotenv";
import { createDbClient } from "../client";
import { Db } from "../db";
import { migrateDb } from "../migrations";

// Load env from the current directory first, then fall back to the repo root
// so the script works from both the repo root and packages/db.
loadEnv();
loadEnv({
	path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../../.env"),
});

const DEFAULT_API_URL = "https://hub-core-api.vercel.app";
const CLIENT_ID = "desktop";

interface Options {
	localUrl: string;
	supabaseUrl: string;
	supabaseAnonKey: string;
	apiUrl: string;
	accessToken?: string;
	refreshToken?: string;
	email?: string;
	password?: string;
	full: boolean;
	dryRun: boolean;
	skipMigrate: boolean;
}

interface JsonResponse<T> {
	success: boolean;
	error?: string;
	data?: T;
	allowedTables?: SyncTableName[];
	batchLimit?: number;
	syncSessionId?: string;
}

interface SupabaseSession {
	access_token: string;
	refresh_token: string;
	user?: {
		id: string;
		email?: string | null;
	};
}

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
	const env = process.env;

	return {
		localUrl: requireValue(
			readFlagValue(args, "--local") ||
				env.LOCAL_DB ||
				env.MAIN_VITE_LOCAL_DB_FILE,
			"Missing local database. Set LOCAL_DB or MAIN_VITE_LOCAL_DB_FILE, or pass --local <path-or-url>.",
		),
		supabaseUrl: requireValue(
			readFlagValue(args, "--supabase-url") ||
				env.SUPABASE_URL ||
				env.NEXT_PUBLIC_SUPABASE_URL ||
				env.VITE_SUPABASE_URL,
			"Missing Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or pass --supabase-url <url>.",
		).replace(/\/$/, ""),
		supabaseAnonKey: requireValue(
			readFlagValue(args, "--supabase-anon-key") ||
				env.SUPABASE_ANON_KEY ||
				env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
				env.VITE_SUPABASE_ANON_KEY,
			"Missing Supabase anon key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or pass --supabase-anon-key <key>.",
		),
		apiUrl: (
			readFlagValue(args, "--api") ||
			env.API_URL ||
			env.VITE_API_URL ||
			DEFAULT_API_URL
		).replace(/\/$/, ""),
		accessToken:
			readFlagValue(args, "--access-token") || env.SUPABASE_ACCESS_TOKEN,
		refreshToken:
			readFlagValue(args, "--refresh-token") || env.SUPABASE_REFRESH_TOKEN,
		email: readFlagValue(args, "--email") || env.SUPABASE_EMAIL,
		password: env.SUPABASE_PASSWORD,
		full: hasFlag(args, "--full"),
		dryRun: hasFlag(args, "--dry-run"),
		skipMigrate: hasFlag(args, "--skip-migrate"),
	};
}

function maskEmail(email: string) {
	const [localPart = "", domain = ""] = email.split("@");
	if (!domain) return "***";
	return `${localPart.slice(0, 2)}***@${domain}`;
}

async function promptHidden(question: string): Promise<string> {
	if (!process.stdin.isTTY) {
		return "";
	}
	const rl = createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true,
	});
	const muted = { value: false };
	const originalWrite = (
		rl as unknown as { _writeToOutput?: (s: string) => void }
	)._writeToOutput;
	(rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (
		text: string,
	) => {
		if (muted.value) return;
		originalWrite?.call(rl, text);
	};
	return new Promise((resolvePrompt) => {
		rl.question(question, (answer) => {
			muted.value = false;
			process.stdout.write("\n");
			rl.close();
			resolvePrompt(answer);
		});
		muted.value = true;
	});
}

async function supabaseAuthRequest(params: {
	supabaseUrl: string;
	supabaseAnonKey: string;
	grantType: "password" | "refresh_token";
	body: Record<string, string>;
}): Promise<SupabaseSession> {
	const response = await fetch(
		`${params.supabaseUrl}/auth/v1/token?grant_type=${params.grantType}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				apikey: params.supabaseAnonKey,
			},
			body: JSON.stringify(params.body),
		},
	);
	const json = (await response.json().catch(() => null)) as
		| SupabaseSession
		| { error_description?: string; msg?: string; error?: string }
		| null;

	if (!response.ok) {
		const message =
			json && typeof json === "object"
				? ("error_description" in json && json.error_description) ||
					("msg" in json && json.msg) ||
					("error" in json && json.error)
				: null;
		throw new Error(
			`Supabase ${params.grantType} sign-in failed (${response.status}): ${
				message || response.statusText
			}`,
		);
	}
	if (
		!json ||
		typeof (json as SupabaseSession).access_token !== "string" ||
		typeof (json as SupabaseSession).refresh_token !== "string"
	) {
		throw new Error("Supabase sign-in returned no session");
	}
	return json as SupabaseSession;
}

async function supabaseSignOut(params: {
	supabaseUrl: string;
	supabaseAnonKey: string;
	accessToken: string;
}) {
	const response = await fetch(`${params.supabaseUrl}/auth/v1/logout`, {
		method: "POST",
		headers: {
			apikey: params.supabaseAnonKey,
			Authorization: `Bearer ${params.accessToken}`,
		},
	});
	if (!response.ok) {
		console.warn(`Supabase sign-out failed (${response.status})`);
	}
}

async function resolveAccessToken(options: Options): Promise<{
	accessToken: string;
	signedInWithPassword: boolean;
	userEmail: string | null;
}> {
	if (options.accessToken) {
		console.log("auth: using provided access token");
		return {
			accessToken: options.accessToken,
			signedInWithPassword: false,
			userEmail: null,
		};
	}

	if (options.refreshToken) {
		console.log("auth: refreshing Supabase session from refresh token");
		const session = await supabaseAuthRequest({
			supabaseUrl: options.supabaseUrl,
			supabaseAnonKey: options.supabaseAnonKey,
			grantType: "refresh_token",
			body: { refresh_token: options.refreshToken },
		});
		return {
			accessToken: session.access_token,
			signedInWithPassword: false,
			userEmail: session.user?.email ?? null,
		};
	}

	const email = requireValue(
		options.email,
		"Missing Supabase credentials. Provide SUPABASE_ACCESS_TOKEN, SUPABASE_REFRESH_TOKEN, or SUPABASE_EMAIL + SUPABASE_PASSWORD (or --email with an interactive password prompt).",
	).trim();
	const password =
		options.password ||
		(await promptHidden(`Supabase password for ${maskEmail(email)}: `));
	if (!password) {
		throw new Error(
			"Missing Supabase password. Set SUPABASE_PASSWORD or run interactively to be prompted.",
		);
	}

	console.log(`auth: signing in to Supabase as ${maskEmail(email)}`);
	const session = await supabaseAuthRequest({
		supabaseUrl: options.supabaseUrl,
		supabaseAnonKey: options.supabaseAnonKey,
		grantType: "password",
		body: { email, password },
	});
	return {
		accessToken: session.access_token,
		signedInWithPassword: true,
		userEmail: session.user?.email ?? email,
	};
}

async function requestJson<T>(
	url: string,
	params: {
		accessToken: string;
		body?: Record<string, unknown>;
	},
): Promise<JsonResponse<T>> {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${params.accessToken}`,
		},
		body: params.body ? JSON.stringify(params.body) : undefined,
	});
	const json = (await response
		.json()
		.catch(() => null)) as JsonResponse<T> | null;
	if (!json) {
		throw new Error(`Empty response from ${url} (${response.status})`);
	}
	if (!json.success) {
		throw new Error(json.error || `Request to ${url} failed`);
	}
	return json;
}

function quoteIdentifier(identifier: string) {
	return `"${identifier.replaceAll('"', '""')}"`;
}

async function printLocalCounts(localUrl: string, tables: SyncTableName[]) {
	const client = createClient({ url: localUrl });
	try {
		console.log("local row counts:");
		for (const table of tables) {
			const result = await client.execute({
				sql: `SELECT COUNT(*) AS count FROM ${quoteIdentifier(table)};`,
				args: [],
			});
			const count = Number(
				(result.rows[0] as Record<string, unknown> | undefined)?.count || 0,
			);
			console.log(`  ${table.padEnd(24)} ${count}`);
		}
	} finally {
		client.close();
	}
}

async function run() {
	const options = parseOptions();
	const auth = await resolveAccessToken(options);

	const client = createDbClient({
		dialect: "sqlite",
		url: options.localUrl,
		logger: false,
	});
	const db = new Db(client);

	try {
		if (!options.skipMigrate) {
			await migrateDb(client);
		}

		const contract = {
			clientId: CLIENT_ID,
			schemaVersion: CLOUD_SYNC_SCHEMA_VERSION,
			tables: db.getSyncTables(),
			batchLimit: db.getSyncBatchLimit(),
		};

		const validation = await requestJson<ISyncValidateData>(
			`${options.apiUrl}/api/sync/validate`,
			{ accessToken: auth.accessToken, body: contract },
		);
		const validationData = validation.data;
		if (!validationData) {
			throw new Error("Sync validation returned no data");
		}
		if (!validationData.userId) {
			throw new Error("Sync validation did not return an internal user id");
		}
		if (!validationData.compatible) {
			throw new Error(
				validationData.reasons.join(". ") ||
					"Local and server sync conditions do not match",
			);
		}

		const userId = validationData.userId;
		const existingState = await db.getSyncState({ userId });
		const syncMode =
			!options.full &&
			existingState &&
			existingState.lastSchemaVersion === contract.schemaVersion &&
			existingState.lastPullCompletedAt
				? "delta"
				: "full";
		const pullUpdatedAfter =
			syncMode === "delta"
				? (existingState?.lastPullCompletedAt ?? undefined)
				: undefined;

		console.log(
			`remote: ${options.apiUrl} (user ${userId}${
				auth.userEmail ? `, ${maskEmail(auth.userEmail)}` : ""
			})`,
		);
		console.log(`local:  ${options.localUrl}`);
		console.log(
			`mode:   ${syncMode} pull${
				pullUpdatedAfter ? ` (rows updated after ${pullUpdatedAfter})` : ""
			}`,
		);

		if (options.dryRun) {
			console.log("dry run: validation passed, nothing pulled");
			return;
		}

		const start = await requestJson<never>(`${options.apiUrl}/api/sync/start`, {
			accessToken: auth.accessToken,
			body: {
				clientId: contract.clientId,
				schemaVersion: contract.schemaVersion,
			},
		});
		const syncSessionId = start.syncSessionId;
		if (!syncSessionId) {
			throw new Error("Sync start did not return a session id");
		}
		const allowedTables = start.allowedTables ?? contract.tables;
		const batchLimit = start.batchLimit ?? contract.batchLimit;

		let pulledRows = 0;
		let pulledTables = 0;

		for (const table of allowedTables) {
			let offset = 0;
			let tableRows = 0;

			while (true) {
				const pull = await requestJson<ISyncPullData>(
					`${options.apiUrl}/api/sync/pull`,
					{
						accessToken: auth.accessToken,
						body: {
							syncSessionId,
							table,
							limit: batchLimit,
							offset,
							updatedAfter: pullUpdatedAfter,
						},
					},
				);
				const rows = pull.data?.rows ?? [];
				if (rows.length === 0) break;

				await db.applySyncRows({ table, rows, userId });
				tableRows += rows.length;
				offset = pull.data?.nextOffset ?? offset + rows.length;

				if (!pull.data?.hasMore) break;
			}

			console.log(`${table}: pulled ${tableRows} row(s)`);
			pulledRows += tableRows;
			if (tableRows > 0) pulledTables += 1;
		}

		await requestJson<never>(`${options.apiUrl}/api/sync/finish`, {
			accessToken: auth.accessToken,
			body: { syncSessionId },
		});

		const completedAt = new Date().toISOString();
		await db.upsertSyncState({
			userId,
			lastSyncSessionId: syncSessionId,
			lastSchemaVersion: contract.schemaVersion,
			lastSyncedAt: completedAt,
			lastPushCompletedAt: existingState?.lastPushCompletedAt ?? null,
			lastPullCompletedAt: completedAt,
		});

		console.log(
			`done: pulled ${pulledRows} row(s) across ${pulledTables} table(s) (session ${syncSessionId})`,
		);
		await printLocalCounts(options.localUrl, allowedTables);
	} finally {
		if (auth.signedInWithPassword) {
			await supabaseSignOut({
				supabaseUrl: options.supabaseUrl,
				supabaseAnonKey: options.supabaseAnonKey,
				accessToken: auth.accessToken,
			});
		}
	}
}

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
