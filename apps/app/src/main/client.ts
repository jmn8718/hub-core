import { ProviderManager } from "@repo/clients";
import { type Credentials, Providers, StorageKeys } from "@repo/types";
import { db } from "./db.js";
import { storage } from "./storage.js";

export const manager = new ProviderManager(db);

export const initializeClients = async () => {
	const corosCredentials = storage.getValue<Credentials>(
		StorageKeys.COROS_CREDENTIALS,
	);

	if (corosCredentials) {
		manager.initializeClient(Providers.COROS);
		manager.connect(Providers.COROS, corosCredentials);
	}
};
