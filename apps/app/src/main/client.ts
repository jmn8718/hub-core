import { CorosClient, ProviderManager } from "@repo/clients";
import { type Credentials, StorageKeys } from "@repo/types";
import { db } from "./db.js";
import { storage } from "./storage.js";

export const manager = new ProviderManager(db);

const coros = new CorosClient();

const corosCredentials = storage.getValue<Credentials>(
	StorageKeys.COROS_CREDENTIALS,
);
if (corosCredentials) {
	coros.connect(corosCredentials);
}

manager.addClient(CorosClient.PROVIDER, coros);
