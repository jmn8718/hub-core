import type { ProviderSuccessResponse } from "@repo/types";

const DB_NAME = "hub-core-offline";
const DB_VERSION = 1;
const RESPONSE_STORE = "responses";

type CacheRecord<TResponse> = {
	key: string;
	userId: string;
	action: string;
	payload: unknown;
	response: ProviderSuccessResponse<TResponse>;
	updatedAt: string;
};

export const stableStringify = (value: unknown): string => {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value);
	}

	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(",")}]`;
	}

	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([, item]) => item !== undefined)
		.sort(([left], [right]) => left.localeCompare(right));

	return `{${entries
		.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
		.join(",")}}`;
};

const createCacheKey = (
	userId: string,
	action: string,
	payload: Record<string, unknown>,
) => `${userId}:${action}:${stableStringify(payload)}`;

export class WebOfflineCache {
	private _dbPromise?: Promise<IDBDatabase | null>;

	async read<TResponse>(
		userId: string,
		action: string,
		payload: Record<string, unknown>,
	): Promise<ProviderSuccessResponse<TResponse> | null> {
		const db = await this._open();
		if (!db) {
			return null;
		}

		const key = createCacheKey(userId, action, payload);
		const record = await this._request<CacheRecord<TResponse> | undefined>(
			db
				.transaction(RESPONSE_STORE, "readonly")
				.objectStore(RESPONSE_STORE)
				.get(key),
		);

		return record?.response ?? null;
	}

	async write<TResponse>(
		userId: string,
		action: string,
		payload: Record<string, unknown>,
		response: ProviderSuccessResponse<TResponse>,
	): Promise<void> {
		if (!response.success) {
			return;
		}

		const db = await this._open();
		if (!db) {
			return;
		}

		const record: CacheRecord<TResponse> = {
			key: createCacheKey(userId, action, payload),
			userId,
			action,
			payload,
			response,
			updatedAt: new Date().toISOString(),
		};

		await this._request(
			db
				.transaction(RESPONSE_STORE, "readwrite")
				.objectStore(RESPONSE_STORE)
				.put(record),
		);
	}

	async deleteUserData(userId: string): Promise<void> {
		const db = await this._open();
		if (!db) {
			return;
		}

		const index = db
			.transaction(RESPONSE_STORE, "readonly")
			.objectStore(RESPONSE_STORE)
			.index("userId");
		const keys = await this._request<IDBValidKey[]>(index.getAllKeys(userId));
		const transaction = db.transaction(RESPONSE_STORE, "readwrite");
		const store = transaction.objectStore(RESPONSE_STORE);

		for (const key of keys) {
			await this._request(store.delete(key));
		}
	}

	private async _open(): Promise<IDBDatabase | null> {
		if (!("indexedDB" in globalThis)) {
			return null;
		}

		this._dbPromise ??= new Promise<IDBDatabase | null>((resolve) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(RESPONSE_STORE)) {
					const store = db.createObjectStore(RESPONSE_STORE, {
						keyPath: "key",
					});
					store.createIndex("userId", "userId", { unique: false });
				}
			};

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => resolve(null);
			request.onblocked = () => resolve(null);
		});

		return this._dbPromise;
	}

	private _request<T = unknown>(request: IDBRequest<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	}
}
