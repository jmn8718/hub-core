import { CorosClient, ProviderManager } from "@repo/clients";
import { type Credentials, StorageKeys } from "@repo/types";
import { db } from "./db.js";
import { storage } from "./storage.js";

export const manager = new ProviderManager(db);

const corosCredentials = storage.getValue<Credentials>(
	StorageKeys.COROS_CREDENTIALS,
);

if (corosCredentials) {
	const coros = new CorosClient();
	manager.addClient(CorosClient.PROVIDER, coros);
	manager.connect(CorosClient.PROVIDER, corosCredentials);
}
