import { CorosClient, ProviderManager } from "@repo/clients";
import { type Credentials, StorageKeys } from "@repo/types";
import { db } from "./db.js";
import { storage } from "./storage.js";

const coros = new CorosClient(db);

export const manager = new ProviderManager();

manager.addClient(CorosClient.PROVIDER, coros);

const corosCredentials = storage.getValue<Credentials>(
	StorageKeys.COROS_CREDENTIALS,
);
if (corosCredentials) {
	coros.connect(corosCredentials);
}
