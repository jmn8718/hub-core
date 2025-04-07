import { ProviderManager } from "@repo/clients";
import { db } from "./db.js";

export const manager = new ProviderManager(db);
