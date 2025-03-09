import type { ActivitiesData } from "@repo/types";
import { count, gt } from "drizzle-orm";
import type { DbClient } from "./client";
import { activities, gears } from "./schemas/app";

export class Db {
	private _client: DbClient;

	constructor(client: DbClient) {
		this._client = client;
	}

	async getActivities({
		limit = 20,
		offset = 0,
		cursor,
	}: {
		cursor?: string;
		limit?: number;
		offset?: number;
	}): Promise<ActivitiesData> {
		const dataQuery = cursor
			? this._client.select().from(activities).where(gt(gears.id, cursor))
			: this._client.select().from(activities);
		const result = await this._client.batch([
			this._client.select({ count: count() }).from(activities),
			dataQuery.limit(limit).offset(offset),
		]);
		const dataCount = result[0][0]?.count;
		// TODO populate data
		const data = result[1];
		return {
      // @ts-expect-error need to type
			count: dataCount,
      // @ts-expect-error need to type
			data,
      // @ts-expect-error need to type
			cursor: dataCount !== data.length ? data[data.length - 1]?.id : "",
		};
	}

	async getGears({
		limit = 20,
		offset = 0,
		cursor,
	}: {
		cursor?: string;
		limit?: number;
		offset?: number;
	}) {
		const dataQuery = cursor
			? this._client.select().from(gears).where(gt(gears.id, cursor))
			: this._client.select().from(gears);
		const result = await this._client.batch([
			this._client.select({ count: count() }).from(gears),
			dataQuery.limit(limit).offset(offset),
		]);
		const dataCount = result[0][0]?.count;
		const data = result[1];
		return {
			count: dataCount,
			data,
			cursor: dataCount !== data.length ? data[data.length - 1]?.id : "",
		};
	}
}
