import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	CacheDb,
	Db,
	cacheRecords,
	createDbClient,
	eq,
	isNull,
	providerActivities,
} from "@repo/db";
import { type IConnection, Providers } from "@repo/types";
import pQueue from "p-queue";
import { ProviderManager } from "../providers/ProviderManager.js";
import { getFileExtension } from "../utils/getFileExtension.js";

/**
 * Downloads every activity file (FIT for COROS, TCX for Garmin and Strava)
 * into the tracks folder and persists every provider activity payload as JSON
 * into the cache folder, using the same layout as the desktop app:
 *
 *   <tracks>/<PROVIDER>/<providerActivityId>.<ext>
 *   <cache>/activities/<PROVIDER>/<providerActivityId>.json
 *
 * Credentials come from the environment (.env in cwd or repo root):
 *   COROS_USERNAME / COROS_PASSWORD
 *   GARMIN_USERNAME / GARMIN_PASSWORD
 *   STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET (opt-in via --providers; refresh token read from the local db profile)
 */

function loadEnvFile(path: string) {
	try {
		process.loadEnvFile(path);
	} catch {
		// ignore missing files
	}
}

loadEnvFile(resolve(process.cwd(), ".env"));
loadEnvFile(
	resolve(dirname(fileURLToPath(import.meta.url)), "../../../../.env"),
);

type Phase = "data" | "files";

interface Options {
	dbUrl: string;
	tracksFolder?: string;
	cacheFolder?: string;
	providers: Providers[];
	phases: Phase[];
	allConnections: boolean;
	force: boolean;
	dryRun: boolean;
	limit?: number;
	reportPath?: string;
}

interface Failure {
	phase: Phase;
	provider: Providers;
	providerActivityId: string;
	activityId?: string;
	error: string;
}

interface ProviderCounters {
	done: number;
	skipped: number;
	failed: number;
}

type Summary = Record<Phase, Record<Providers, ProviderCounters>>;

const ALL_PROVIDERS = [Providers.COROS, Providers.GARMIN, Providers.STRAVA];
// Strava is opt-in (--providers COROS,GARMIN,STRAVA): its API is paywalled.
const DEFAULT_PROVIDERS = [Providers.COROS, Providers.GARMIN];

// Strava's API allows 100 requests per 15 minutes; a file download costs two.
const QUEUE_SETTINGS: Record<
	Providers,
	{ concurrency: number; interval?: number; intervalCap?: number }
> = {
	[Providers.COROS]: { concurrency: 2 },
	[Providers.GARMIN]: { concurrency: 2 },
	[Providers.STRAVA]: {
		concurrency: 1,
		interval: 15 * 60 * 1000,
		intervalCap: 40,
	},
};

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

function parseProviders(raw: string | undefined): Providers[] {
	if (!raw) return DEFAULT_PROVIDERS;
	const providers = raw
		.split(",")
		.map((value) => value.trim().toUpperCase())
		.filter(Boolean);
	for (const provider of providers) {
		if (!ALL_PROVIDERS.includes(provider as Providers)) {
			throw new Error(`Unknown provider in --providers: ${provider}`);
		}
	}
	return providers as Providers[];
}

function parseOptions(): Options {
	const args = process.argv.slice(2);
	const env = process.env;
	const filesOnly = hasFlag(args, "--files-only");
	const dataOnly = hasFlag(args, "--data-only");
	if (filesOnly && dataOnly) {
		throw new Error("--files-only and --data-only are mutually exclusive");
	}
	const phases: Phase[] = filesOnly
		? ["files"]
		: dataOnly
			? ["data"]
			: ["data", "files"];

	const limitRaw = readFlagValue(args, "--limit");
	const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
	if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
		throw new Error("--limit must be a positive integer");
	}

	const tracksFolder = readFlagValue(args, "--tracks") || env.TRACKS_FOLDER;
	const cacheFolder = readFlagValue(args, "--cache") || env.CACHE_FOLDER;
	if (phases.includes("files") && !tracksFolder) {
		throw new Error(
			"Missing tracks folder. Set TRACKS_FOLDER or pass --tracks <dir> (or use --data-only).",
		);
	}
	if (phases.includes("data") && !cacheFolder) {
		throw new Error(
			"Missing cache folder. Set CACHE_FOLDER or pass --cache <dir> (or use --files-only).",
		);
	}

	return {
		dbUrl: requireValue(
			readFlagValue(args, "--db") ||
				env.LOCAL_DB ||
				env.MAIN_VITE_LOCAL_DB_FILE,
			"Missing local database. Set LOCAL_DB or MAIN_VITE_LOCAL_DB_FILE, or pass --db <file-url>.",
		),
		tracksFolder,
		cacheFolder,
		providers: parseProviders(readFlagValue(args, "--providers")),
		phases,
		allConnections: hasFlag(args, "--all-connections"),
		force: hasFlag(args, "--force"),
		dryRun: hasFlag(args, "--dry-run"),
		limit,
		reportPath: readFlagValue(args, "--report"),
	};
}

const sanitizePathSegment = (value: string) =>
	value.replaceAll(/[^a-zA-Z0-9._-]/g, "_");

function cacheFilePath(cacheFolder: string, provider: string, id: string) {
	return join(
		cacheFolder,
		"activities",
		provider,
		`${sanitizePathSegment(id)}.json`,
	);
}

function trackFilePath(tracksFolder: string, provider: Providers, id: string) {
	return join(tracksFolder, provider, `${id}.${getFileExtension(provider)}`);
}

function isRateLimitError(error: unknown) {
	const message = (error as Error)?.message ?? String(error);
	const status =
		(
			error as {
				status?: number;
				statusCode?: number;
				response?: { status?: number };
			}
		)?.status ??
		(error as { statusCode?: number })?.statusCode ??
		(error as { response?: { status?: number } })?.response?.status;
	return (
		status === 429 ||
		/\b429\b/.test(message) ||
		/rate ?limit|too many requests/i.test(message)
	);
}

function emptySummary(): Summary {
	const perProvider = () =>
		Object.fromEntries(
			ALL_PROVIDERS.map((provider) => [
				provider,
				{ done: 0, skipped: 0, failed: 0 },
			]),
		) as Record<Providers, ProviderCounters>;
	return { data: perProvider(), files: perProvider() };
}

async function connectProviders(params: {
	manager: ProviderManager;
	db: Db;
	providers: Providers[];
	dryRun: boolean;
}): Promise<Set<Providers>> {
	const { manager, db, providers, dryRun } = params;
	const env = process.env;
	const connected = new Set<Providers>();

	for (const provider of providers) {
		if (provider === Providers.COROS || provider === Providers.GARMIN) {
			const username = env[`${provider}_USERNAME`];
			const password = env[`${provider}_PASSWORD`];
			if (!username || !password) {
				console.warn(
					`${provider}: skipped, set ${provider}_USERNAME and ${provider}_PASSWORD`,
				);
				continue;
			}
			if (dryRun) {
				connected.add(provider);
				continue;
			}
			manager.initializeClient({ provider });
			await manager.connect(provider, { username, password });
			connected.add(provider);
			continue;
		}

		const clientId = env.STRAVA_CLIENT_ID;
		const clientSecret = env.STRAVA_CLIENT_SECRET;
		if (!clientId || !clientSecret) {
			console.warn(
				"STRAVA: skipped, set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET",
			);
			continue;
		}
		const externalId = env.STRAVA_EXTERNAL_ID;
		const refreshToken =
			env.STRAVA_REFRESH_TOKEN ||
			(await db.getProfileToken(Providers.STRAVA, externalId))?.refreshToken;
		if (!refreshToken) {
			console.warn(
				"STRAVA: skipped, no refresh token in STRAVA_REFRESH_TOKEN or the local db profile",
			);
			continue;
		}
		if (dryRun) {
			connected.add(provider);
			continue;
		}
		manager.initializeClient({
			provider: Providers.STRAVA,
			options: { clientId, clientSecret },
		});
		await manager.connect(Providers.STRAVA, { refreshToken, externalId });
		connected.add(provider);
	}

	return connected;
}

async function runDataPhase(params: {
	options: Options;
	client: ReturnType<typeof createDbClient>;
	manager: ProviderManager;
	connected: Set<Providers>;
	queues: Record<Providers, pQueue>;
	halted: Set<Providers>;
	summary: Summary;
	failures: Failure[];
}) {
	const {
		options,
		client,
		manager,
		connected,
		queues,
		halted,
		summary,
		failures,
	} = params;
	const cacheFolder = options.cacheFolder as string;
	const counters = summary.data;

	// 1) Export cache rows that already exist locally. No network needed.
	const cached = await client
		.select({
			provider: cacheRecords.provider,
			resourceId: cacheRecords.resourceId,
			value: cacheRecords.value,
		})
		.from(cacheRecords)
		.where(eq(cacheRecords.resource, "activity"));
	const cachedIds = new Map<string, Set<string>>();
	let exported = 0;
	let alreadyOnDisk = 0;
	for (const row of cached) {
		const ids = cachedIds.get(row.provider) ?? new Set<string>();
		ids.add(row.resourceId);
		cachedIds.set(row.provider, ids);

		if (!options.providers.includes(row.provider as Providers)) continue;
		const filePath = cacheFilePath(cacheFolder, row.provider, row.resourceId);
		if (existsSync(filePath) && !options.force) {
			alreadyOnDisk += 1;
			continue;
		}
		if (!options.dryRun) {
			await mkdir(dirname(filePath), { recursive: true });
			await writeFile(filePath, row.value, "utf-8");
		}
		exported += 1;
	}
	console.log(
		`data: ${options.dryRun ? "would export" : "exported"} ${exported} cached payload(s) to disk, ${alreadyOnDisk} already there`,
	);

	// 2) Fetch payloads that are not cached yet from the providers.
	const rows = await client
		.select({
			id: providerActivities.id,
			provider: providerActivities.provider,
		})
		.from(providerActivities)
		.where(isNull(providerActivities.deletedAt));
	const missing = rows.filter(
		(row) =>
			options.providers.includes(row.provider as Providers) &&
			!cachedIds.get(row.provider)?.has(row.id),
	);
	const limited =
		options.limit !== undefined ? missing.slice(0, options.limit) : missing;
	console.log(
		`data: ${missing.length} provider activit(ies) without cached payload${
			options.limit !== undefined ? `, processing ${limited.length}` : ""
		}`,
	);

	let processed = 0;
	const tasks = limited.map((row) => {
		const provider = row.provider as Providers;
		if (!connected.has(provider)) {
			counters[provider].skipped += 1;
			return Promise.resolve();
		}
		if (options.dryRun) {
			counters[provider].done += 1;
			return Promise.resolve();
		}
		return queues[provider].add(async () => {
			if (halted.has(provider)) {
				counters[provider].skipped += 1;
				return;
			}
			try {
				await manager.persistActivityCache({
					provider,
					providerActivityId: row.id,
				});
				counters[provider].done += 1;
			} catch (error) {
				counters[provider].failed += 1;
				failures.push({
					phase: "data",
					provider,
					providerActivityId: row.id,
					error: (error as Error).message,
				});
				if (isRateLimitError(error)) {
					halted.add(provider);
					console.warn(`${provider}: rate limited, skipping remaining data`);
				}
			} finally {
				processed += 1;
				if (processed % 25 === 0) {
					console.log(`data: ${processed}/${limited.length}`);
				}
			}
		});
	});
	await Promise.all(tasks);
}

async function runFilesPhase(params: {
	options: Options;
	db: Db;
	manager: ProviderManager;
	connected: Set<Providers>;
	queues: Record<Providers, pQueue>;
	halted: Set<Providers>;
	summary: Summary;
	failures: Failure[];
}) {
	const { options, db, manager, connected, queues, halted, summary, failures } =
		params;
	const tracksFolder = options.tracksFolder as string;
	const counters = summary.files;

	const targets: Array<{
		activityId: string;
		provider: Providers;
		providerActivityId: string;
	}> = [];
	let withoutConnection = 0;
	let cursor: string | undefined;
	do {
		const batch = await db.getActivities({ limit: 200, cursor });
		for (const activity of batch.data) {
			const connections = ((activity.connections ?? []) as IConnection[])
				.filter((connection) => options.providers.includes(connection.provider))
				.sort((a, b) => Number(b.original) - Number(a.original));
			if (connections.length === 0) {
				withoutConnection += 1;
				continue;
			}
			const selected = options.allConnections
				? connections
				: connections.slice(0, 1);
			for (const connection of selected) {
				targets.push({
					activityId: activity.id,
					provider: connection.provider,
					providerActivityId: connection.id,
				});
			}
		}
		cursor = batch.cursor || undefined;
	} while (cursor);

	const pending = targets.filter((target) => {
		const filePath = trackFilePath(
			tracksFolder,
			target.provider,
			target.providerActivityId,
		);
		if (existsSync(filePath) && !options.force) {
			counters[target.provider].skipped += 1;
			return false;
		}
		return true;
	});
	const limited =
		options.limit !== undefined ? pending.slice(0, options.limit) : pending;
	console.log(
		`files: ${targets.length} target file(s), ${
			targets.length - pending.length
		} already downloaded, ${withoutConnection} activit(ies) without a provider connection${
			options.limit !== undefined ? `, processing ${limited.length}` : ""
		}`,
	);

	let processed = 0;
	const tasks = limited.map((target) => {
		if (!connected.has(target.provider)) {
			counters[target.provider].skipped += 1;
			return Promise.resolve();
		}
		if (options.dryRun) {
			counters[target.provider].done += 1;
			return Promise.resolve();
		}
		return queues[target.provider].add(async () => {
			if (halted.has(target.provider)) {
				counters[target.provider].skipped += 1;
				return;
			}
			try {
				await manager.downloadActivityFile({
					provider: target.provider,
					providerActivityId: target.providerActivityId,
					downloadPath: tracksFolder,
				});
				counters[target.provider].done += 1;
			} catch (error) {
				counters[target.provider].failed += 1;
				failures.push({
					phase: "files",
					provider: target.provider,
					providerActivityId: target.providerActivityId,
					activityId: target.activityId,
					error: (error as Error).message,
				});
				if (isRateLimitError(error)) {
					halted.add(target.provider);
					console.warn(
						`${target.provider}: rate limited, skipping remaining files`,
					);
				}
			} finally {
				processed += 1;
				if (processed % 25 === 0) {
					console.log(`files: ${processed}/${limited.length}`);
				}
			}
		});
	});
	await Promise.all(tasks);
}

function printSummary(summary: Summary, failures: Failure[], dryRun: boolean) {
	console.log(`\n${dryRun ? "dry run summary" : "summary"}:`);
	for (const phase of ["data", "files"] as Phase[]) {
		for (const provider of ALL_PROVIDERS) {
			const counters = summary[phase][provider];
			if (counters.done + counters.skipped + counters.failed === 0) continue;
			console.log(
				`  ${phase.padEnd(6)} ${provider.padEnd(7)} ${dryRun ? "would process" : "done"} ${counters.done}, skipped ${counters.skipped}, failed ${counters.failed}`,
			);
		}
	}
	if (failures.length > 0) {
		console.log(`\nfailures (${failures.length}):`);
		for (const failure of failures.slice(0, 50)) {
			console.log(
				`  [${failure.phase}] ${failure.provider} ${failure.providerActivityId}: ${failure.error}`,
			);
		}
		if (failures.length > 50) {
			console.log(`  ... ${failures.length - 50} more (see --report)`);
		}
	}
}

async function run() {
	const options = parseOptions();
	const client = createDbClient({
		dialect: "sqlite",
		url: options.dbUrl,
		logger: false,
	});
	const db = new Db(client);
	const cache = new CacheDb(client, {
		onSet: async ({ provider, resource, resourceId, value }) => {
			if (resource !== "activity" || !options.cacheFolder) return;
			const filePath = cacheFilePath(options.cacheFolder, provider, resourceId);
			await mkdir(dirname(filePath), { recursive: true });
			await writeFile(filePath, JSON.stringify(value), "utf-8");
		},
	});
	const manager = new ProviderManager(db, cache);
	const summary = emptySummary();
	const failures: Failure[] = [];
	const halted = new Set<Providers>();
	const queues = Object.fromEntries(
		ALL_PROVIDERS.map((provider) => [
			provider,
			new pQueue(QUEUE_SETTINGS[provider]),
		]),
	) as Record<Providers, pQueue>;

	const finish = async () => {
		printSummary(summary, failures, options.dryRun);
		if (options.reportPath) {
			await writeFile(
				options.reportPath,
				JSON.stringify({ summary, failures }, null, 2),
				"utf-8",
			);
			console.log(`report written to ${options.reportPath}`);
		}
	};

	process.once("SIGINT", () => {
		console.warn("\ninterrupted, printing partial summary");
		for (const queue of Object.values(queues)) queue.clear();
		void finish().finally(() => process.exit(130));
	});

	console.log(`db:        ${options.dbUrl}`);
	console.log(`tracks:    ${options.tracksFolder ?? "-"}`);
	console.log(`cache:     ${options.cacheFolder ?? "-"}`);
	console.log(`phases:    ${options.phases.join(", ")}`);
	console.log(`providers: ${options.providers.join(", ")}`);
	if (options.dryRun)
		console.log("dry run: no network calls, no files written");

	if (!options.dryRun) {
		if (options.tracksFolder) {
			await mkdir(options.tracksFolder, { recursive: true });
		}
		if (options.cacheFolder) {
			await mkdir(options.cacheFolder, { recursive: true });
		}
	}

	const connected = await connectProviders({
		manager,
		db,
		providers: options.providers,
		dryRun: options.dryRun,
	});
	if (connected.size === 0) {
		throw new Error("No provider could be connected; check credentials");
	}
	console.log(`connected: ${[...connected].join(", ")}`);

	if (options.phases.includes("data")) {
		await runDataPhase({
			options,
			client,
			manager,
			connected,
			queues,
			halted,
			summary,
			failures,
		});
	}
	if (options.phases.includes("files")) {
		await runFilesPhase({
			options,
			db,
			manager,
			connected,
			queues,
			halted,
			summary,
			failures,
		});
	}

	await finish();
}

run()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
