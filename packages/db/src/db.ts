import type {
	ActivitiesData,
	DbActivityPopulated,
	IConnection,
	IDbActivity,
	IGear,
	IOverviewData,
	Providers,
} from "@repo/types";
import {
	count,
	desc,
	eq,
	getTableColumns,
	gt,
	min,
	sql,
	sum,
} from "drizzle-orm";
import { uuidv7 } from "uuidv7";
import type { DbClient } from "./client.js";
import {
	activities,
	activitiesConnection,
	activityGears,
	gears,
	providerActivities,
} from "./schemas/app.js";

export class Db {
	private _client: DbClient;

	constructor(client: DbClient) {
		this._client = client;
	}

	async getActivitiesOverview(limit = 12): Promise<IOverviewData[]> {
		const subquery = await this._client
			.select({
				distance: min(activities.distance).as("distance"),
				count: count().as("count"),
				timestamp: activities.timestamp,
				month: sql`strftime('%Y %m', timestamp)`.as("month"),
			})
			.from(activities)
			.groupBy(activities.timestamp)
			.orderBy(desc(activities.timestamp))
			.as("subquery");

		const result = await this._client
			.select({
				distance: sum(subquery.distance),
				count: count(),
				month: subquery.month,
			})
			.from(subquery)
			.groupBy(subquery.month.sql)
			.orderBy(desc(subquery.timestamp))
			.limit(limit);
		return result.map((row) => ({
			distance: Number.parseInt(row.distance || "0"),
			count: row.count,
			month: row.month as string,
		}));
	}
	async getActivities({
		limit = 20,
		cursor,
	}: {
		cursor?: string;
		limit?: number;
	}): Promise<ActivitiesData> {
		const connections = this._client.$with("connections").as(
			this._client
				.select({
					activityId: activitiesConnection.activityId,
					connections: sql`json_group_array(
					json_object(
						'id', provider_activities.id,
						'provider', provider_activities.provider,
						'original', provider_activities.original
					)
				)`.as("connections"),
				})
				.from(activitiesConnection)
				.leftJoin(
					providerActivities,
					eq(activitiesConnection.providerActivityId, providerActivities.id),
				)
				.groupBy(activitiesConnection.activityId),
		);

		const groupedGears = this._client.$with("groupedGears").as(
			this._client
				.select({
					activityId: activityGears.activityId,
					gears: sql`json_group_array(
						json_object(
						'id', gears.id,
						'type', gears.type
					)
						
					)`.as("gears"),
				})
				.from(activityGears)
				.leftJoin(gears, eq(activityGears.gearId, gears.id))
				.groupBy(activityGears.activityId),
		);
		const select = this._client
			.with(connections, groupedGears)
			.select({
				...getTableColumns(activities),
				activityId: connections.activityId,
				connections: connections.connections,
				gears: groupedGears.gears,
			})
			.from(activities)
			.leftJoin(connections, eq(activities.id, connections.activityId))
			.leftJoin(groupedGears, eq(activities.id, groupedGears.activityId));

		const dataQuery = cursor ? select.where(gt(gears.id, cursor)) : select;

		const result = await this._client.batch([
			this._client.select({ count: count() }).from(activities),
			dataQuery.limit(limit),
		]);

		const dataCount = result[0][0]?.count || 0;
		const data = result[1].map(
			({ connections, gears, ...row }) =>
				({
					...row,
					gears: (gears ? JSON.parse(gears as string) : []) as IGear[],
					connections: (connections
						? JSON.parse(connections as string)
						: []) as IConnection[],
				}) as DbActivityPopulated,
		);
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
		const data = result[1];
		return {
			count: dataCount,
			data,
			cursor: dataCount !== data.length ? data[data.length - 1]?.id || "" : "",
		};
	}

	async insertActivity(
		data: Omit<IDbActivity, "id">,
		providerData?: {
			id: string;
			provider: Providers;
			original: boolean;
			timestamp: string;
			data: Record<string, string | number | undefined>;
		},
	) {
		const query = await this._client
			.select({
				id: activities.id,
				locationName: activities.locationName,
				locationCountry: activities.locationCountry,
				startLatitude: activities.startLatitude,
				startLongitude: activities.startLongitude,
			})
			.from(activities)
			.where(eq(activities.timestamp, data.timestamp));

		const dbActivity = query[0];
		const activityId = dbActivity?.id || uuidv7();
		if (dbActivity) {
			const updateData: Record<string, string> = {};

			if (!dbActivity.locationCountry && data.locationCountry) {
				updateData.locationCountry = data.locationCountry;
			}
			if (!dbActivity.locationName && data.locationName) {
				updateData.locationName = data.locationName;
			}
			if (!dbActivity.startLatitude && data.startLatitude) {
				updateData.startLatitude = data.startLatitude.toString();
			}
			if (!dbActivity.startLongitude && data.startLongitude) {
				updateData.startLongitude = data.startLongitude.toString();
			}
			await this._client
				.update(activities)
				.set(updateData)
				.where(eq(activities.id, activityId));
		} else {
			await this._client.insert(activities).values(data);
		}

		// if there is provider data, insert on related tables
		if (providerData) {
			await this._client.transaction(async (txClient) => {
				await txClient.insert(providerActivities).values({
					id: providerData.id,
					provider: providerData.provider,
					timestamp: providerData.timestamp,
					original: providerData.original ? 1 : 0,
					data: JSON.stringify(providerData.data),
				});
				await txClient.insert(activitiesConnection).values({
					activityId,
					providerActivityId: providerData.id,
				});
			});
		}

		return activityId;
	}

	getLastProviderActivity(provider: Providers) {
		return this._client
			.select({
				timestamp: providerActivities.timestamp,
			})
			.from(providerActivities)
			.where(eq(providerActivities.provider, provider))
			.orderBy(desc(providerActivities.timestamp))
			.limit(1)
			.then((data) => data[0]);
	}
}
