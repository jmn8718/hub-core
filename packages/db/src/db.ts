import { formatDate, monthsBefore } from "@repo/dates";
import type {
	ActivitiesData,
	DbActivityPopulated,
	GearsData,
	IConnection,
	IDbGearWithDistance,
	IGear,
	IInbodyCreateInput,
	IInbodyData,
	IOverviewData,
	InbodyType,
	Providers,
} from "@repo/types";
import {
	and,
	asc,
	count,
	desc,
	eq,
	getTableColumns,
	gt,
	gte,
	lt,
	min,
	sql,
	sum,
} from "drizzle-orm";
import pMap from "p-map";
import { uuidv7 } from "uuidv7";
import type { DbClient } from "./client";
import { inbody } from "./schemas";
import {
	activities,
	activitiesConnection,
	activityGears,
	gears,
	gearsConnection,
	providerActivities,
	providerGears,
} from "./schemas/app";
import type { IInsertActivityPayload, IInsertGearPayload } from "./types/index";

function mapActivityRow({
	connections,
	gears,
	isEvent,
	...row
}: {
	gears: unknown;
	connections: unknown;
	id: string;
	name: string;
	timestamp: number;
	timezone: string | null;
	distance: number | null;
	duration: number | null;
	manufacturer: string | null;
	locationName: string | null;
	locationCountry: string | null;
	type: string;
	subtype: string | null;
	notes: string | null;
	isEvent: number | null;
	startLatitude: number | null;
	startLongitude: number | null;
}): DbActivityPopulated {
	return {
		...row,
		isEvent: isEvent === 1 ? 1 : 0,
		gears: (gears ? JSON.parse(gears as string) : []) as IGear[],
		connections: (connections
			? JSON.parse(connections as string)
			: []) as IConnection[],
	} as DbActivityPopulated;
}

const fillEmptyMonths = (
	data: { distance: string | null; count: number; month: unknown }[],
	size = 12,
) => {
	const monthsMap = new Map();
	for (let i = 0; i < size; i++) {
		const currentMonth = formatDate(monthsBefore(i), { format: "YYYY MM" });
		monthsMap.set(currentMonth, {
			distance: 0,
			count: 0,
			month: currentMonth,
		});
	}
	// biome-ignore lint/complexity/noForEach: <explanation>
	data.forEach((row) => {
		monthsMap.set(row.month, {
			distance: Number.parseInt(row.distance || "0"),
			count: row.count,
			month: row.month as string,
		});
	});
	return Array.from(monthsMap.values());
};

export class Db {
	private _client: DbClient;

	constructor(client: DbClient) {
		this._client = client;
	}

	async getActivitiesOverview(limit = 12): Promise<IOverviewData[]> {
		const subquery = this._client
			.select({
				distance: min(activities.distance).as("distance"),
				timestamp: activities.timestamp,
				month: sql`strftime('%Y %m', timestamp / 1000, 'unixepoch')`.as(
					"month",
				),
			})
			.from(activities)
			.where(gte(activities.timestamp, monthsBefore(limit).getTime()))
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
			.orderBy(desc(subquery.timestamp));
		return fillEmptyMonths(result, limit);
	}

	getActivity(activityId: string): Promise<DbActivityPopulated | undefined> {
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

		return this._client
			.with(connections, groupedGears)
			.select({
				...getTableColumns(activities),
				connections: connections.connections,
				gears: groupedGears.gears,
			})
			.from(activities)
			.where(eq(activities.id, activityId))
			.leftJoin(connections, eq(activities.id, connections.activityId))
			.leftJoin(groupedGears, eq(activities.id, groupedGears.activityId))
			.limit(1)
			.then((data) => {
				if (!data[0]) return;
				return mapActivityRow(data[0]);
			});
	}

	async getActivities({
		limit = 20,
		cursor,
		sort = "DESC",
	}: {
		cursor?: string;
		limit?: number;
		sort?: "ASC" | "DESC";
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
		const order = sort === "DESC" ? desc : asc;
		const select = this._client
			.with(connections, groupedGears)
			.select({
				...getTableColumns(activities),
				connections: connections.connections,
				gears: groupedGears.gears,
			})
			.from(activities)
			.leftJoin(connections, eq(activities.id, connections.activityId))
			.leftJoin(groupedGears, eq(activities.id, groupedGears.activityId))
			.orderBy(order(activities.timestamp));

		const dataQuery = cursor
			? select.where(lt(activities.timestamp, Number.parseInt(cursor, 10)))
			: select;

		const result = await this._client.batch([
			this._client.select({ count: count() }).from(activities),
			dataQuery.limit(limit),
		]);

		const dataCount = result[0][0]?.count || 0;
		const data = result[1].map(mapActivityRow);
		return {
			count: dataCount,
			data,
			cursor:
				dataCount !== data.length
					? data[data.length - 1]?.timestamp.toString() || ""
					: "",
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
	}): Promise<GearsData> {
		const subquery = await this._client
			.select({
				gearId: activityGears.gearId,
				distance: sum(activities.distance).as("distance"),
				count: count().as("count"),
			})
			.from(activityGears)
			.leftJoin(activities, eq(activityGears.activityId, activities.id))
			.groupBy(activityGears.gearId)
			.as("subquery");

		const dataQuery = cursor
			? this._client
					.select({
						...getTableColumns(gears),
						distance: sql`COALESCE(subquery.distance, 0)`.as("distance"),
					})
					.from(gears)
					.leftJoin(subquery, eq(gears.id, subquery.gearId))
					.where(gt(gears.id, cursor))
			: this._client
					.select({
						...getTableColumns(gears),
						distance: sql`COALESCE(subquery.distance, 0)`.as("distance"),
					})
					.from(gears)
					.leftJoin(subquery, eq(gears.id, subquery.gearId));

		const result = await this._client.batch([
			this._client.select({ count: count() }).from(gears),
			dataQuery.limit(limit).offset(offset),
		]);
		const dataCount = result[0][0]?.count || 0;
		const data = result[1].map(
			(record) =>
				({
					...record,
					distance: Number.parseFloat(record.distance as string),
				}) as IDbGearWithDistance,
		);
		return {
			count: dataCount,
			data,
			cursor: dataCount !== data.length ? data[data.length - 1]?.id || "" : "",
		};
	}

	async getGear(gearId: string): Promise<IDbGearWithDistance | undefined> {
		const subquery = await this._client
			.select({
				gearId: activityGears.gearId,
				distance: sum(activities.distance).as("distance"),
				count: count().as("count"),
			})
			.from(activityGears)
			.leftJoin(activities, eq(activityGears.activityId, activities.id))
			.groupBy(activityGears.gearId)
			.as("subquery");

		const result = await this._client
			.select({
				...getTableColumns(gears),
				distance: sql`COALESCE(subquery.distance, 0)`.as("distance"),
			})
			.from(gears)
			.leftJoin(subquery, eq(gears.id, subquery.gearId))
			.where(eq(gears.id, gearId))
			.limit(1);

		const record = result[0];
		if (!record) return;
		return {
			...record,
			distance: Number.parseFloat(record.distance as string),
		} as IDbGearWithDistance;
	}

	editGear(id: string, data: Record<string, string>) {
		return this._client.update(gears).set(data).where(eq(gears.id, id));
	}

	editActivity(id: string, data: Record<string, string>) {
		return this._client
			.update(activities)
			.set(data)
			.where(eq(activities.id, id));
	}

	async insertActivity({ activity, gears }: IInsertActivityPayload) {
		let activityId = "";
		const providerActivity = activity.providerActivity;
		if (providerActivity) {
			// search first by activitiesConnection
			const dbActivityConnection = await this._client
				.select()
				.from(activitiesConnection)
				.where(eq(activitiesConnection.providerActivityId, providerActivity.id))
				.limit(1);
			if (dbActivityConnection[0]?.activityId) {
				activityId = dbActivityConnection[0].activityId;
			}
		}

		const query = await this._client
			.select({
				id: activities.id,
				locationName: activities.locationName,
				locationCountry: activities.locationCountry,
				startLatitude: activities.startLatitude,
				startLongitude: activities.startLongitude,
			})
			.from(activities)
			.where(
				activityId
					? eq(activities.id, activityId)
					: eq(activities.timestamp, activity.data.timestamp),
			)
			.limit(1);

		const dbActivity = query[0];
		if (dbActivity) {
			activityId = dbActivity.id;
			const updateData: Record<string, string> = {};

			if (!dbActivity.locationCountry && activity.data.locationCountry) {
				updateData.locationCountry = activity.data.locationCountry;
			}
			if (!dbActivity.locationName && activity.data.locationName) {
				updateData.locationName = activity.data.locationName;
			}
			if (!dbActivity.startLatitude && activity.data.startLatitude) {
				updateData.startLatitude = activity.data.startLatitude.toString();
			}
			if (!dbActivity.startLongitude && activity.data.startLongitude) {
				updateData.startLongitude = activity.data.startLongitude.toString();
			}
			if (Object.keys(updateData).length > 0) {
				await this.editActivity(activityId, updateData);
			}
		} else {
			activityId = uuidv7();
			await this._client.insert(activities).values({
				...activity.data,
				id: activityId,
			});
		}

		// if there is provider data, insert on related tables
		if (providerActivity) {
			if (providerActivity.original && dbActivity) {
				await this.editActivity(activityId, {
					manufacturer: activity.data.manufacturer,
				});
			}
			await this._client.transaction(async (txClient) => {
				const linkedProviderActivity = await txClient
					.select({ id: providerActivities.id })
					.from(providerActivities)
					.where(eq(providerActivities.id, providerActivity.id))
					.limit(1);
				if (linkedProviderActivity[0]) {
					console.log(
						linkedProviderActivity[0].id,
						" providerActivities already inserted",
					);
				} else {
					await txClient.insert(providerActivities).values({
						id: providerActivity.id,
						provider: providerActivity.provider,
						timestamp: providerActivity.timestamp,
						original: providerActivity.original ? 1 : 0,
						data: providerActivity.data,
					});
				}

				const linkedActivityConnection = await txClient
					.select({ activityId: activitiesConnection.activityId })
					.from(activitiesConnection)
					.where(
						eq(activitiesConnection.providerActivityId, providerActivity.id),
					)
					.limit(1);
				if (linkedActivityConnection[0]) {
					console.log(
						`${activityId} | ${providerActivity.id} => activitiesConnection already connected`,
					);
				} else {
					await txClient.insert(activitiesConnection).values({
						activityId,
						providerActivityId: providerActivity.id,
					});
				}
			});
		}

		if (gears && gears.length > 0) {
			await pMap(
				gears,
				(gear) =>
					this.insertGear(gear).then((gearId) =>
						this._client.insert(activityGears).values({
							activityId,
							gearId,
						}),
					),
				{
					concurrency: 1,
				},
			);
		}

		return activityId;
	}

	getLastProviderActivity(provider: Providers) {
		return this._client
			.select({
				id: providerActivities.id,
				timestamp: providerActivities.timestamp,
			})
			.from(providerActivities)
			.where(eq(providerActivities.provider, provider))
			.orderBy(desc(providerActivities.timestamp))
			.limit(1)
			.then((data) => data[0]);
	}

	insertGear({ data, providerGear }: IInsertGearPayload) {
		return this._client.transaction(async (tx) => {
			const dbProviderGear = await tx
				.select({ id: providerGears.id })
				.from(providerGears)
				.where(
					and(
						eq(providerGears.provider, providerGear.provider),
						eq(providerGears.providerId, providerGear.id),
					),
				)
				.limit(1);
			let providerGearId = dbProviderGear[0]?.id;
			if (providerGearId) {
				// update data
				await tx
					.update(providerGears)
					.set({
						data: JSON.stringify(data),
					})
					.where(eq(providerGears.id, providerGearId));
			} else {
				// create new one
				providerGearId = uuidv7();
				await tx.insert(providerGears).values({
					id: providerGearId,
					providerId: providerGear.id,
					provider: providerGear.provider,
					data: JSON.stringify(data),
				});
			}
			const linkedGear = await tx
				.select({ gearId: gearsConnection.gearId })
				.from(gearsConnection)
				.where(eq(gearsConnection.providerGearId, providerGearId))
				.limit(1);

			let gearId = linkedGear[0]?.gearId;

			if (gearId) {
				if (data.dateEnd) {
					const gearWithCode = await tx
						.select()
						.from(gears)
						.where(eq(gears.id, gearId))
						.limit(1);
					if (gearWithCode[0] && !gearWithCode[0].dateEnd) {
						await tx
							.update(gears)
							.set({
								dateEnd: data.dateEnd,
							})
							.where(eq(gears.id, gearId))
							.returning();
					}
				}
			} else {
				const gearWithCode = await tx
					.select()
					.from(gears)
					.where(eq(gears.code, data.code))
					.limit(1);
				if (gearWithCode[0]) {
					gearId = gearWithCode[0].id;
					if (!gearWithCode[0].dateEnd && data.dateEnd) {
						await tx
							.update(gears)
							.set({
								dateEnd: data.dateEnd,
							})
							.where(eq(gears.id, gearId))
							.returning();
					}
				} else {
					gearId = uuidv7();
					await tx
						.insert(gears)
						.values({
							...data,
							id: gearId,
						})
						.returning();
				}
			}
			return gearId;
		});
	}

	linkActivityGear(activityId: string, gearId: string) {
		return this._client.insert(activityGears).values({
			gearId,
			activityId,
		});
	}

	unlinkActivityGear(activityId: string, gearId: string) {
		return this._client
			.delete(activityGears)
			.where(
				and(
					eq(activityGears.activityId, activityId),
					eq(activityGears.gearId, gearId),
				),
			);
	}

	getGearConnections(gearId: string) {
		return this._client
			.select({
				provider: providerGears.provider,
				providerId: providerGears.providerId,
			})
			.from(gearsConnection)
			.where(eq(gearsConnection.gearId, gearId))
			.leftJoin(
				providerGears,
				eq(gearsConnection.providerGearId, providerGears.id),
			);
	}

	getActivityProvider(activityId: string, provider: Providers) {
		return this._client
			.select({
				activityId: providerActivities.id,
			})
			.from(activitiesConnection)
			.leftJoin(
				providerActivities,
				eq(providerActivities.id, activitiesConnection.providerActivityId),
			)
			.where(
				and(
					eq(activitiesConnection.activityId, activityId),
					eq(providerActivities.provider, provider),
				),
			);
	}

	getInbodyData({
		type,
	}: {
		type: InbodyType;
	}) {
		return this._client
			.select({
				id: inbody.id,
				timestamp: inbody.date,
				weight: inbody.weight,
				bodyFat: inbody.bodyFatMass,
				muscleMass: inbody.muscleMass,
				bmi: inbody.bmi,
				percentageBodyFat: inbody.percentageBodyFat,
				leanCore: inbody.leanCore,
				leanLeftArm: inbody.leanLeftArm,
				leanRightArm: inbody.leanRightArm,
				leanLeftLeg: inbody.leanLeftLeg,
				leanRightLeg: inbody.leanRightLeg,
				fatCore: inbody.fatCore,
				fatLeftArm: inbody.fatLeftArm,
				fatRightArm: inbody.fatRightArm,
				fatLeftLeg: inbody.fatLeftLeg,
				fatRightLeg: inbody.fatRightLeg,
				compositionBodyWater: inbody.compositionBodyWater,
				compositionProtein: inbody.compositionProtein,
				compositionMinerals: inbody.compositionMinerals,
				compositionBodyFat: inbody.compositionBodyFat,
				type: inbody.type,
			})
			.from(inbody)
			.where(eq(inbody.type, type))
			.orderBy(desc(inbody.date));
	}

	async createInbodyData(data: IInbodyCreateInput): Promise<IInbodyData> {
		const id = uuidv7();

		const toRequired = (value: number) => Math.round(value * 100);
		const toOptional = (value?: number | null) =>
			value === undefined || value === null ? null : Math.round(value * 100);

		await this._client.insert(inbody).values({
			id,
			type: data.type,
			date: data.timestamp,
			weight: toRequired(data.weight),
			muscleMass: toRequired(data.muscleMass),
			bodyFatMass: toRequired(data.bodyFat),
			bmi: toRequired(data.bmi),
			percentageBodyFat: toRequired(data.percentageBodyFat),
			leanCore: toOptional(data.leanCore),
			leanLeftArm: toOptional(data.leanLeftArm),
			leanRightArm: toOptional(data.leanRightArm),
			leanLeftLeg: toOptional(data.leanLeftLeg),
			leanRightLeg: toOptional(data.leanRightLeg),
			fatCore: toOptional(data.fatCore),
			fatLeftArm: toOptional(data.fatLeftArm),
			fatRightArm: toOptional(data.fatRightArm),
			fatLeftLeg: toOptional(data.fatLeftLeg),
			fatRightLeg: toOptional(data.fatRightLeg),
			compositionBodyWater: toOptional(data.compositionBodyWater),
			compositionProtein: toOptional(data.compositionProtein),
			compositionMinerals: toOptional(data.compositionMinerals),
			compositionBodyFat: toOptional(data.compositionBodyFat),
		});

		const [created] = await this._client
			.select({
				id: inbody.id,
				timestamp: inbody.date,
				weight: inbody.weight,
				bodyFat: inbody.bodyFatMass,
				muscleMass: inbody.muscleMass,
				bmi: inbody.bmi,
				percentageBodyFat: inbody.percentageBodyFat,
				leanCore: inbody.leanCore,
				leanLeftArm: inbody.leanLeftArm,
				leanRightArm: inbody.leanRightArm,
				leanLeftLeg: inbody.leanLeftLeg,
				leanRightLeg: inbody.leanRightLeg,
				fatCore: inbody.fatCore,
				fatLeftArm: inbody.fatLeftArm,
				fatRightArm: inbody.fatRightArm,
				fatLeftLeg: inbody.fatLeftLeg,
				fatRightLeg: inbody.fatRightLeg,
				compositionBodyWater: inbody.compositionBodyWater,
				compositionProtein: inbody.compositionProtein,
				compositionMinerals: inbody.compositionMinerals,
				compositionBodyFat: inbody.compositionBodyFat,
				type: inbody.type,
			})
			.from(inbody)
			.where(eq(inbody.id, id))
			.limit(1);

		if (!created) {
			throw new Error("Failed to create Inbody entry");
		}

		return created as IInbodyData;
	}
}
