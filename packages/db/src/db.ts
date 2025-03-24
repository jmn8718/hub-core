import type {
	ActivitiesData,
	DbActivityPopulated,
	IDbGear,
	IOverviewData,
} from "@repo/types";
import { count, desc, gt, min, sql, sum } from "drizzle-orm";
import type { DbClient } from "./client";
import { activities, gears } from "./schemas/app";

export class Db {
	private _client: DbClient;

	constructor(client: DbClient) {
		this._client = client;
	}

	async getActivitiesOverview(limit = 12): Promise<IOverviewData[]> {
		const subquery = await this._client
			.select({
				distance: min(activities.distance).as("distance"),
				count: count(),
				timestamp: activities.timestamp,
				month: sql`strftime('%Y %m', timestamp)`.as("month"),
			})
			.from(activities)
			.groupBy(activities.timestamp)
			.orderBy(desc(activities.timestamp))
			.as("subquery");
		const data = await this._client
			.select({
				distance: sum(subquery.distance),
				count: count(),
				month: subquery.month,
			})
			.from(subquery)
			.groupBy(subquery.timestamp)
			.orderBy(desc(subquery.timestamp))
			.limit(limit);
		return data.map((row) => ({
			distance: Number.parseInt(row.distance || "0"),
			count: row.count,
			month: row.month as string,
		}));
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
		const dataCount = result[0][0]?.count || 0;
		// TODO populate data
		const data = result[1] as unknown as DbActivityPopulated[];
		return {
			count: dataCount,
			data,
			cursor: dataCount !== data.length ? data[data.length - 1]?.id || "" : "",
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
		const dataCount = result[0][0]?.count || 0;
		const data = result[1] as unknown as IDbGear[];
		return {
			count: dataCount,
			data,
			cursor: dataCount !== data.length ? data[data.length - 1]?.id || "" : "",
		};
	}
}
