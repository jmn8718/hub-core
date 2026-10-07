import { ProviderManager } from "@repo/clients";
import { CacheDb, Db } from "@repo/db";
import { Providers } from "@repo/types";
import db from "./db";

const manager = new ProviderManager(new Db(db), new CacheDb(db));
let initialization: Promise<void> | null = null;

async function connectFromEnv() {
	const { COROS_USERNAME, COROS_PASSWORD, GARMIN_USERNAME, GARMIN_PASSWORD } =
		process.env;
	const tasks: Promise<void>[] = [];
	if (COROS_USERNAME && COROS_PASSWORD) {
		manager.initializeClient({ provider: Providers.COROS });
		tasks.push(
			manager
				.connect(Providers.COROS, {
					username: COROS_USERNAME,
					password: COROS_PASSWORD,
				})
				.catch((error) => {
					console.error("COROS connect failed", (error as Error).message);
				}),
		);
	}
	if (GARMIN_USERNAME && GARMIN_PASSWORD) {
		manager.initializeClient({ provider: Providers.GARMIN });
		tasks.push(
			manager
				.connect(Providers.GARMIN, {
					username: GARMIN_USERNAME,
					password: GARMIN_PASSWORD,
				})
				.catch((error) => {
					console.error("Garmin connect failed", (error as Error).message);
				}),
		);
	}
	await Promise.all(tasks);
}

/**
 * Provider manager connected from env credentials. Connection happens on
 * first use and is awaited, so a login failure surfaces as a route error
 * instead of an unhandled rejection at import time.
 */
export async function getProvider() {
	if (!initialization) {
		initialization = connectFromEnv().catch((error) => {
			initialization = null;
			throw error;
		});
	}
	await initialization;
	return manager;
}
