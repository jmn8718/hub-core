import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CacheDb, Db, createDbClient } from "@repo/db";
import { migrateDb } from "@repo/db/migrations";
import { StorageKeys } from "@repo/types";
import { LOCAL_DB_FILE } from "./config.js";
import { storage } from "./storage.js";

function createConfiguredClient() {
	const tursoDatabaseUrl = storage.getValue<string>(
		StorageKeys.TURSO_DATABASE_URL,
	);
	const tursoAuthToken = storage.getValue<string>(StorageKeys.TURSO_AUTH_TOKEN);

	if (
		(tursoDatabaseUrl && !tursoAuthToken) ||
		(!tursoDatabaseUrl && tursoAuthToken)
	) {
		console.warn(
			"Ignoring incomplete Turso sync settings. Falling back to local SQLite until both Turso values are provided.",
		);
	}

	return createDbClient({
		...(tursoDatabaseUrl && tursoAuthToken
			? {
					syncUrl: tursoDatabaseUrl,
					authToken: tursoAuthToken,
					syncInterval: 60,
					readYourWrites: true,
				}
			: {}),
		url: LOCAL_DB_FILE,
		logger: false,
	});
}

let dbSingleton: Db | undefined;
let cacheDbSingleton: CacheDb | undefined;

export function getDb() {
	if (!dbSingleton) {
		dbSingleton = new Db(createConfiguredClient());
	}
	return dbSingleton;
}

const sanitizePathSegment = (value: string) =>
	value.replaceAll(/[^a-zA-Z0-9._-]/g, "_");

export async function persistActivityCacheToDisk(params: {
	provider: string;
	resourceId: string;
	value: unknown;
}) {
	const cacheFolder = storage.getValue<string>(StorageKeys.CACHE_FOLDER);
	if (!cacheFolder) return;
	const providerFolderPath = join(cacheFolder, "activities", params.provider);
	await mkdir(providerFolderPath, {
		recursive: true,
	});
	const filePath = join(
		providerFolderPath,
		`${sanitizePathSegment(params.resourceId)}.json`,
	);
	await writeFile(filePath, JSON.stringify(params.value), {
		encoding: "utf-8",
	});
}

export function getCacheDb() {
	if (!cacheDbSingleton) {
		cacheDbSingleton = new CacheDb(
			createDbClient({
				url: LOCAL_DB_FILE,
				logger: false,
			}),
			{
				onSet: async ({ provider, resource, resourceId, value }) => {
					if (resource !== "activity") return;
					await persistActivityCacheToDisk({
						provider,
						resourceId,
						value,
					});
				},
			},
		);
	}
	return cacheDbSingleton;
}

let startupDbPromise: Promise<void> | undefined;

export async function applyConfiguredDbClient() {
	const client = createConfiguredClient();
	await migrateDb(client);
	getDb().setClient(client);
}

export function initializeDbConnection() {
	if (!startupDbPromise) {
		startupDbPromise = applyConfiguredDbClient()
			.then(() => {
				console.log("migration checkup completed");
			})
			.catch((error) => {
				startupDbPromise = undefined;
				throw error;
			});
	}
	return startupDbPromise;
}
