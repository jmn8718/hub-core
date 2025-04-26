import { ProviderManager } from "@repo/clients";
import { type Credentials, Providers, StorageKeys } from "@repo/types";
import { app } from "electron";
import { db } from "./db.js";
import { storage } from "./storage.js";

export const manager = new ProviderManager(db, app.getPath("userData"));

export const initializeClients = async () => {
	const corosCredentials = storage.getValue<Credentials>(
		StorageKeys.COROS_CREDENTIALS,
	);

	if (corosCredentials) {
		manager.initializeClient(Providers.COROS);
		manager.connect(Providers.COROS, corosCredentials);
	}

	const garminCredentials = storage.getValue<Credentials>(
		StorageKeys.GARMIN_CREDENTIALS,
	);

	if (garminCredentials) {
		manager.initializeClient(Providers.GARMIN);
		manager.connect(Providers.GARMIN, garminCredentials);
	}
};
