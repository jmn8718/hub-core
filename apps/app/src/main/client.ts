import { ProviderManager } from "@repo/clients";
import {
	// type LoginCredentials,
	Providers,
	StorageKeys,
	type StravaCredentials,
} from "@repo/types";
import { cacheDb, db } from "./db.js";
import { storage } from "./storage.js";

export const manager = new ProviderManager(db, cacheDb);

export const initializeClients = async () => {
	// const corosCredentials = storage.getValue<LoginCredentials>(
	// 	StorageKeys.COROS_CREDENTIALS,
	// );
	// if (corosCredentials) {
	// 	try {
	// 		manager.initializeClient(Providers.COROS);
	// 		manager.connect(Providers.COROS, corosCredentials);
	// 	} catch (error) {
	// 		console.warn("Error initializing Coros client:");
	// 		console.error(error);
	// 		storage.setValue(StorageKeys.COROS_VALIDATED, false);
	// 	}
	// }
	// const garminCredentials = storage.getValue<LoginCredentials>(
	// 	StorageKeys.GARMIN_CREDENTIALS,
	// );
	// if (garminCredentials) {
	// 	try {
	// 		manager.initializeClient(Providers.GARMIN);
	// 		manager.connect(Providers.GARMIN, garminCredentials);
	// 	} catch (error) {
	// 		console.warn("Error initializing Garmin client:");
	// 		console.error(error);
	// 		storage.setValue(StorageKeys.GARMIN_VALIDATED, false);
	// 	}
	// }
	const stravaCredentials = storage.getValue<StravaCredentials>(
		StorageKeys.STRAVA_CREDENTIALS,
	);
	console.log("Strava credentials loaded:", stravaCredentials);
	if (
		stravaCredentials?.clientId &&
		stravaCredentials?.clientSecret &&
		stravaCredentials?.refreshToken
	) {
		try {
			manager.initializeClient(Providers.STRAVA, {
				clientId: stravaCredentials.clientId,
				clientSecret: stravaCredentials.clientSecret,
				redirectUri: stravaCredentials.redirectUri || "",
			});
			await manager.connect(Providers.STRAVA, {
				refreshToken: stravaCredentials.refreshToken,
			});
		} catch (error) {
			console.warn("Error initializing Strava client:");
			console.error(error);
			storage.setValue(StorageKeys.STRAVA_VALIDATED, false);
		}
	}
};
