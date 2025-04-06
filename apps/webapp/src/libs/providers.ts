import { CorosClient, ProviderManager } from "@repo/clients";
import { db } from "./db.js";

export const manager = new ProviderManager(db);
const coros = new CorosClient();
manager.addClient(CorosClient.PROVIDER, coros);
