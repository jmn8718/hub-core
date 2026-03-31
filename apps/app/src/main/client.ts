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

const providerInitState = new Map<
	Providers,
	{
		lastCredentialsKey?: string;
		promise?: Promise<void>;
	}
>();

function runProviderInitialization(
	provider: Providers,
	credentialsKey: string,
	initialize: () => Promise<void>,
) {
	const state = providerInitState.get(provider);
	if (state?.promise) {
		return state.promise;
	}
	if (state?.lastCredentialsKey === credentialsKey) {
		return Promise.resolve();
	}

	const promise = initialize()
		.then(() => {
			providerInitState.set(provider, {
				lastCredentialsKey: credentialsKey,
			});
		})
		.catch((error) => {
			providerInitState.set(provider, {});
			throw error;
		});

	providerInitState.set(provider, {
		lastCredentialsKey: state?.lastCredentialsKey,
		promise,
	});

	return promise.finally(() => {
		const current = providerInitState.get(provider);
		if (!current) return;
		providerInitState.set(provider, {
			lastCredentialsKey: current.lastCredentialsKey,
		});
	});
}

export const initializeCorosClient = async () => {
	const corosCredentials = storage.getValue<LoginCredentials>(
		StorageKeys.COROS_CREDENTIALS,
	);
	if (!corosCredentials) return;
	const credentialsKey = JSON.stringify(corosCredentials);
	return runProviderInitialization(
		Providers.COROS,
		credentialsKey,
		async () => {
			try {
				manager.initializeClient({ provider: Providers.COROS });
				await manager.connect(Providers.COROS, corosCredentials);
			} catch (error) {
				console.warn("Error initializing Coros client:");
				console.error(error);
				storage.setValue(StorageKeys.COROS_VALIDATED, false);
				throw error;
			}
		},
	);
};

export const initializeGarminClient = async () => {
	const garminCredentials = storage.getValue<LoginCredentials>(
		StorageKeys.GARMIN_CREDENTIALS,
	);
	if (!garminCredentials) return;
	const credentialsKey = JSON.stringify(garminCredentials);
	return runProviderInitialization(
		Providers.GARMIN,
		credentialsKey,
		async () => {
			try {
				manager.initializeClient({ provider: Providers.GARMIN });
				await manager.connect(Providers.GARMIN, garminCredentials);
			} catch (error) {
				console.warn("Error initializing Garmin client:");
				console.error(error);
				storage.setValue(StorageKeys.GARMIN_VALIDATED, false);
				throw error;
			}
		},
	);
};

export const initializeStravaClient = async () => {
	const stravaCredentials = storage.getValue<StravaCredentials>(
		StorageKeys.STRAVA_CREDENTIALS,
	);
	if (
		!stravaCredentials?.clientId ||
		!stravaCredentials?.clientSecret ||
		!stravaCredentials?.refreshToken
	) {
		return;
	}
	const credentialsKey = JSON.stringify(stravaCredentials);
	return runProviderInitialization(
		Providers.STRAVA,
		credentialsKey,
		async () => {
			try {
				console.log("Strava credentials loaded:", stravaCredentials);
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
				throw error;
			}
		},
	);
};

export const initializeClients = async () => {
	await initializeCorosClient();
	await initializeGarminClient();
	await initializeStravaClient();
};

export const reinitializeManagerDb = async () => {
	manager.setDb(getDb());
	manager.setCache(getCacheDb());
};
