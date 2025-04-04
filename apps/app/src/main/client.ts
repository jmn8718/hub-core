import { CorosClient, ProviderManager } from "@repo/clients";
import { db } from "./db.js";

const coros = new CorosClient(db);

export const manager = new ProviderManager();

manager.addClient(CorosClient.PROVIDER, coros);
