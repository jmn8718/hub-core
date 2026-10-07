import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CacheDb, Db, createDbClient } from "@repo/db";
import { migrateDb } from "@repo/db/migrations";
import { StorageKeys } from "@repo/types";
import { getLocalDbFile } from "./config.js";
import { storage } from "./storage.js";

// One connection for the main store, the cache and migrations. Separate
// connections to the same SQLite file contended for the write lock
// (SQLITE_BUSY during provider syncs) and were never closed.
let clientSingleton: ReturnType<typeof createDbClient> | undefined;

function getLocalClient() {
	if (!clientSingleton) {
		clientSingleton = createDbClient({
			url: getLocalDbFile(),
			logger: false,
		});
	}
	return clientSingleton;
}

let dbSingleton: Db | undefined;
let cacheDbSingleton: CacheDb | undefined;

export function getDb() {
	if (!dbSingleton) {
		dbSingleton = new Db(getLocalClient());
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
		cacheDbSingleton = new CacheDb(getLocalClient(), {
			onSet: async ({ provider, resource, resourceId, value }) => {
				if (resource !== "activity") return;
				await persistActivityCacheToDisk({
					provider,
					resourceId,
					value,
				});
			},
		});
	}
	return cacheDbSingleton;
}

let startupDbPromise: Promise<void> | undefined;

export async function applyConfiguredDbClient() {
	await migrateDb(getLocalClient());
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
