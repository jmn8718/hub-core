import type { Providers } from "@repo/types";
import { and, desc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { DbClient } from "./client";
import { cacheRecords } from "./schemas";

export type ResourceType = "activity" | "gear";

type CacheSetHook = <T>(params: {
	provider: Providers;
	resource: ResourceType;
	resourceId: string;
	value: T;
}) => void | Promise<void>;

export class CacheDb {
	private _client: DbClient;
	private _onSet?: CacheSetHook;

	constructor(client: DbClient, options?: { onSet?: CacheSetHook }) {
		this._client = client;
		this._onSet = options?.onSet;
	}

	get<T>(provider: Providers, resource: ResourceType, resourceId: string) {
		return this._client
			.select({
				value: cacheRecords.value,
			})
			.from(cacheRecords)
			.where(
				and(
					eq(cacheRecords.provider, provider),
					eq(cacheRecords.resource, resource),
					eq(cacheRecords.resourceId, resourceId),
				),
			)
			.limit(1)
			.orderBy(desc(cacheRecords.createdAt))
			.then((record) =>
				record[0] ? (JSON.parse(record[0].value) as T) : undefined,
			);
	}

	set<T>(
		provider: Providers,
		resource: ResourceType,
		resourceId: string,
		value: T,
	) {
		return this._client
			.delete(cacheRecords)
			.where(
				and(
					eq(cacheRecords.provider, provider),
					eq(cacheRecords.resource, resource),
					eq(cacheRecords.resourceId, resourceId),
				),
			)
			.execute()
			.then(() =>
				this._client
					.insert(cacheRecords)
					.values({
						id: uuidv7(),
						provider,
						resource,
						resourceId: resourceId,
						value: JSON.stringify(value),
					})
					.execute(),
			)
			.then(async () => {
				if (!this._onSet) return;
				try {
					await this._onSet({
						provider,
						resource,
						resourceId,
						value,
					});
				} catch (error) {
					console.error("Failed to persist cache hook", error);
				}
			});
	}
}
