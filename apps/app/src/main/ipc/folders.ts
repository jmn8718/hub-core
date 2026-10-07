import { resolve } from "node:path";
import type { StorageKeys } from "@repo/types";
import { storage } from "../storage.js";

/** The configured folder for a storage key, or an error when unset. */
export function requireConfiguredFolder(key: StorageKeys, label: string) {
	const folder = storage.getValue<string>(key);
	if (!folder || typeof folder !== "string") {
		throw new Error(`Missing ${label} folder in settings`);
	}
	return resolve(folder);
}
