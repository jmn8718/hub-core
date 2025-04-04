import type { Value } from "@repo/types";
import Store from "electron-store";
import { safeStorage } from "electron/main";

class Storage {
	private store: Store<Record<string, string>>;

	constructor() {
		this.store = new Store<Record<string, string>>({});
	}
	getValue<T = Value>(key: string): T | undefined {
		const encryptedValue = this.store.get(key);
		if (!encryptedValue) return undefined;
		const stringValue = safeStorage.decryptString(
			Buffer.from(encryptedValue, "base64"),
		);
		const parsed = JSON.parse(stringValue) as { value: T };
		return parsed.value;
	}

	setValue(key: string, value: Value) {
		const buffer = safeStorage.encryptString(JSON.stringify({ value }));
		this.store.set(key, buffer.toString("base64"));
	}

	deleteValue(key: string) {
		this.store.delete(key);
	}

	initRenderer() {
		return Store.initRenderer();
	}
}

export const storage = new Storage();
