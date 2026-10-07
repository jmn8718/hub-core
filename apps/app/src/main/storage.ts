import type { Value } from "@repo/types";
import Store from "electron-store";
import { safeStorage } from "electron/main";

const warnedKeys = new Set<string>();

class Storage {
	private store: Store<Record<string, string>>;

	constructor() {
		this.store = new Store<Record<string, string>>({});
	}

	private assertEncryptionAvailable() {
		if (!safeStorage.isEncryptionAvailable()) {
			throw new Error(
				"Secure storage is not available (keychain locked or missing); settings cannot be read or saved",
			);
		}
	}

	getValue<T = Value>(key: string): T | undefined {
		const encryptedValue = this.store.get(key);
		if (!encryptedValue) return undefined;
		try {
			this.assertEncryptionAvailable();
			const stringValue = safeStorage.decryptString(
				Buffer.from(encryptedValue, "base64"),
			);
			const parsed = JSON.parse(stringValue) as { value: T };
			return parsed.value;
		} catch (err) {
			// A failed decrypt is usually transient (keychain prompt denied, OS
			// secret service unavailable). Never delete the stored value for
			// it: that silently wiped every provider credential before.
			if (!warnedKeys.has(key)) {
				warnedKeys.add(key);
				console.warn(
					`Could not read secure setting ${key}: ${(err as Error)?.message ?? err}`,
				);
			}
			return undefined;
		}
	}

	setValue(key: string, value: Value) {
		this.assertEncryptionAvailable();
		const buffer = safeStorage.encryptString(JSON.stringify({ value }));
		this.store.set(key, buffer.toString("base64"));
		warnedKeys.delete(key);
	}

	deleteValue(key: string) {
		this.store.delete(key);
	}

	initRenderer() {
		return Store.initRenderer();
	}
}

export const storage = new Storage();
