import { CorosClient, ProviderManager } from "@repo/clients";
import { db } from "./db.js";

export const manager = new ProviderManager();
const coros = new CorosClient(db);
manager.addClient(CorosClient.PROVIDER, coros);
