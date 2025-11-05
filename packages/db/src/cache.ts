import type { Providers } from "@repo/types";
import { and, desc, eq } from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { DbClient } from "./client";
import { cacheRecords } from "./schemas";

type ResourceType = "activity" | "gear";

export class CacheDb {
	private _client: DbClient;

	constructor(client: DbClient) {
		this._client = client;
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
			.then((result) => {
				console.debug(result);
				console.log(
					`Deleted ${result.rowsAffected} cache records for ${provider} ${resource} ${resourceId}`,
				);
				return this._client
					.insert(cacheRecords)
					.values({
						id: uuidv7(),
						provider,
						resource,
						resourceId: resourceId,
						value: JSON.stringify(value),
					})
					.execute();
			});
	}
}
