import { ProviderManager } from "@repo/clients";
import {
	type LoginCredentials,
	Providers,
	StorageKeys,
	type StravaCredentials,
} from "@repo/types";
import { getCacheDb, getDb } from "./db.js";
import { storage } from "./storage.js";

export const manager = new ProviderManager(getDb(), getCacheDb());

export const initializeCorosClient = async () => {
	const corosCredentials = storage.getValue<LoginCredentials>(
		StorageKeys.COROS_CREDENTIALS,
	);
	if (!corosCredentials) return;
	try {
		manager.initializeClient({ provider: Providers.COROS });
		await manager.connect(Providers.COROS, corosCredentials);
	} catch (error) {
		console.warn("Error initializing Coros client:");
		console.error(error);
		storage.setValue(StorageKeys.COROS_VALIDATED, false);
	}
};

export const initializeGarminClient = async () => {
	const garminCredentials = storage.getValue<LoginCredentials>(
		StorageKeys.GARMIN_CREDENTIALS,
	);
	if (!garminCredentials) return;
	try {
		manager.initializeClient({ provider: Providers.GARMIN });
		await manager.connect(Providers.GARMIN, garminCredentials);
	} catch (error) {
		console.warn("Error initializing Garmin client:");
		console.error(error);
		storage.setValue(StorageKeys.GARMIN_VALIDATED, false);
	}
};

export const initializeStravaClient = async () => {
	const stravaCredentials = storage.getValue<StravaCredentials>(
		StorageKeys.STRAVA_CREDENTIALS,
	);
	console.log("Strava credentials loaded:", stravaCredentials);
	if (
		!stravaCredentials?.clientId ||
		!stravaCredentials?.clientSecret ||
		!stravaCredentials?.refreshToken
	) {
		return;
	}
	try {
		manager.initializeClient({
			provider: Providers.STRAVA,
			options: {
				clientId: stravaCredentials.clientId,
				clientSecret: stravaCredentials.clientSecret,
				redirectUri: stravaCredentials.redirectUri || "",
			},
		});
		await manager.connect(Providers.STRAVA, {
			refreshToken: stravaCredentials.refreshToken,
		});
	} catch (error) {
		console.warn("Error initializing Strava client:");
		console.error(error);
		storage.setValue(StorageKeys.STRAVA_VALIDATED, false);
	}
};

export const initializeClients = async () => {
	await initializeCorosClient();
	await initializeGarminClient();
	await initializeStravaClient();
};

export const reinitializeManagerDb = async () => {
	manager.setDb(getDb(), getCacheDb());
};
