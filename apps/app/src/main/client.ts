import { ProviderManager } from "@repo/clients";
import { type Credentials, Providers, StorageKeys } from "@repo/types";
import {
	STRAVA_CLIENT_ID,
	STRAVA_CLIENT_SECRET,
	STRAVA_REDIRECT_URI,
} from "./config.js";
import { cacheDb, db } from "./db.js";
import { storage } from "./storage.js";

export const manager = new ProviderManager(db, cacheDb);

export const initializeClients = async () => {
	const corosCredentials = storage.getValue<Credentials>(
		StorageKeys.COROS_CREDENTIALS,
	);

	if (corosCredentials) {
		try {
			manager.initializeClient(Providers.COROS);
			manager.connect(Providers.COROS, corosCredentials);
		} catch (error) {
			console.warn("Error initializing Coros client:");
			console.error(error);
			storage.setValue(StorageKeys.COROS_VALIDATED, false);
		}
	}

	const garminCredentials = storage.getValue<Credentials>(
		StorageKeys.GARMIN_CREDENTIALS,
	);

	if (garminCredentials) {
		try {
			manager.initializeClient(Providers.GARMIN);
			manager.connect(Providers.GARMIN, garminCredentials);
		} catch (error) {
			console.warn("Error initializing Garmin client:");
			console.error(error);
			storage.setValue(StorageKeys.GARMIN_VALIDATED, false);
		}
	}

	const stravaCredentials = storage.getValue<Credentials>(
		StorageKeys.STRAVA_CREDENTIALS,
	);

	if (stravaCredentials) {
		try {
			manager.initializeClient(Providers.STRAVA, {
				clientId: STRAVA_CLIENT_ID,
				clientSecret: STRAVA_CLIENT_SECRET,
				redirectUri: STRAVA_REDIRECT_URI,
			});
			manager.connect(Providers.STRAVA, stravaCredentials);
		} catch (error) {
			console.warn("Error initializing Strava client:");
			console.error(error);
			storage.setValue(StorageKeys.STRAVA_VALIDATED, false);
		}
	}
};
