import { dayjs, formatDate, monthsBefore, weeksBefore } from "@repo/dates";
import type {
	ActivitiesData,
	ActivityMetadata,
	ActivitySubType,
	DbActivityPopulated,
	GearsData,
	IActivityCreateInput,
	IConnection,
	IDailyOverviewData,
	IDbActivity,
	IDbGearWithDistance,
	IGear,
	IGearConnection,
	IGearCreateInput,
	IInbodyCreateInput,
	IInbodyData,
	IInbodyUpdateInput,
	IOverviewData,
	IWeeklyOverviewData,
	InbodyType,
	Providers,
} from "@repo/types";
import { ActivityType } from "@repo/types";
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
	lte,
	min,
	sql,
	sum,
} from "drizzle-orm";
import pMap from "p-map";
import { uuidv7 } from "uuidv7";
import type { DbClient } from "./client";
import { inbody, profiles } from "./schemas";
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

interface IDbActivityRow {
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
	metadata: string | null;
	isEvent: number | null;
	startLatitude: number | null;
	startLongitude: number | null;
}

function normalizeMetadata(
	type: string,
	metadataRaw: Record<string, unknown> | string,
): ActivityMetadata {
	const metadata: Record<string, unknown> =
		typeof metadataRaw === "string" ? JSON.parse(metadataRaw) : metadataRaw;
	const normalizedMetadata: ActivityMetadata = {};
	if (type === ActivityType.SWIM) {
		if (typeof metadata.laps === "number") {
			normalizedMetadata.laps = metadata.laps;
		} else if (metadata.laps !== undefined) {
			normalizedMetadata.laps = Number(metadata.laps) || 0;
		}
		if (typeof metadata.length === "number") {
			normalizedMetadata.length = metadata.length;
		} else if (metadata.length !== undefined) {
			normalizedMetadata.length = Number(metadata.length) || 0;
		}
	}
	return normalizedMetadata;
}

function mapActivityRow({
	connections,
	gears,
	isEvent,
	metadata,
	...row
}: IDbActivityRow): DbActivityPopulated {
	return {
		...row,
		metadata: normalizeMetadata(row.type, JSON.parse(metadata || "{}")),
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

const startOfWeek = (dateValue: Date | number): Date => {
	const date = new Date(
		dateValue instanceof Date ? dateValue.getTime() : Number(dateValue),
	);
	const day = date.getDay(); // 0 (Sun) -> 6 (Sat)
	const diff = day === 0 ? -6 : 1 - day;
	date.setDate(date.getDate() + diff);
	date.setHours(0, 0, 0, 0);
	return date;
};

const fillEmptyWeeks = (
	data: {
		distance: string | number | null;
		duration: string | number | null;
		minTimestamp: number | null;
	}[],
	size = 4,
): IWeeklyOverviewData[] => {
	const weeksMap = new Map<string, IWeeklyOverviewData>();
	for (let i = 0; i < size; i++) {
		const currentWeek = weeksBefore(i);
		const key = formatDate(currentWeek, { format: "YYYY-MM-DD" });
		weeksMap.set(key, {
			distance: 0,
			duration: 0,
			weekStart: key,
		});
	}
	// biome-ignore lint/complexity/noForEach: <explanation>
	data.forEach((row) => {
		if (row.minTimestamp === null || row.minTimestamp === undefined) {
			return;
		}
		const weekStart = formatDate(startOfWeek(row.minTimestamp), {
			format: "YYYY-MM-DD",
		});
		weeksMap.set(weekStart, {
			distance: Number(row.distance ?? 0),
			duration: Number(row.duration ?? 0),
			weekStart,
		});
	});
	return Array.from(weeksMap.values());
};

const fillEmptyDays = (
	data: {
		date: unknown;
		distance: string | number | null;
		duration: string | number | null;
		count: number;
	}[],
	start: Date,
	end: Date,
): IDailyOverviewData[] => {
	const map = new Map<string, IDailyOverviewData>();
	// biome-ignore lint/complexity/noForEach: <explanation>
	data.forEach((row) => {
		const key = String(row.date);
		map.set(key, {
			date: key,
			distance: Number(row.distance ?? 0),
			duration: Number(row.duration ?? 0),
			count: row.count,
		});
	});

	const startDate = dayjs(start).startOf("day");
	const endDate = dayjs(end).startOf("day");
	const results: IDailyOverviewData[] = [];
	for (
		let cursor = startDate.clone();
		cursor.isSame(endDate, "day") || cursor.isBefore(endDate, "day");
		cursor = cursor.add(1, "day")
	) {
		const key = cursor.format("YYYY-MM-DD");
		const existing = map.get(key);
		results.push(
			existing ?? {
				date: key,
				distance: 0,
				duration: 0,
				count: 0,
			},
		);
	}
	return results;
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

	async getWeeklyActivitiesOverview(limit = 4): Promise<IWeeklyOverviewData[]> {
		const weekIdentifier =
			sql`strftime('%Y-%W', timestamp / 1000, 'unixepoch')`.as("week");

		const subquery = this._client
			.select({
				distance: min(activities.distance).as("distance"),
				duration: min(activities.duration).as("duration"),
				timestamp: activities.timestamp,
				week: weekIdentifier,
			})
			.from(activities)
			.where(
				and(
					gte(activities.timestamp, weeksBefore(limit).getTime()),
					eq(activities.type, ActivityType.RUN),
				),
			)
			.groupBy(activities.timestamp)
			.orderBy(desc(activities.timestamp))
			.as("subquery");

		const result = await this._client
			.select({
				distance: sum(subquery.distance),
				duration: sum(subquery.duration),
				minTimestamp: min(subquery.timestamp),
				week: subquery.week,
			})
			.from(subquery)
			.groupBy(subquery.week.sql)
			.orderBy(desc(subquery.timestamp));

		return fillEmptyWeeks(result, limit);
	}

	async getDailyActivitiesOverview({
		startDate,
		endDate,
		periodType = "days",
		periodCount = 30,
	}: {
		startDate?: string;
		endDate?: string;
		periodType?: "days" | "weeks" | "months";
		periodCount?: number;
	} = {}): Promise<IDailyOverviewData[]> {
		const safeCount = periodCount && periodCount > 0 ? periodCount : 30;
		let endBoundary = endDate
			? dayjs(endDate).endOf("day")
			: dayjs().endOf("day");
		let startBoundary: ReturnType<typeof dayjs>;

		if (startDate) {
			startBoundary = dayjs(startDate).startOf("day");
		} else if (periodType === "weeks") {
			startBoundary = dayjs()
				.subtract(safeCount - 1, "week")
				.startOf("week");
		} else if (periodType === "months") {
			startBoundary = dayjs()
				.subtract(safeCount - 1, "month")
				.startOf("month");
		} else {
			startBoundary = dayjs()
				.subtract(safeCount - 1, "day")
				.startOf("day");
		}

		if (!endDate && periodType === "weeks") {
			endBoundary = dayjs().endOf("week");
		} else if (!endDate && periodType === "months") {
			endBoundary = dayjs().endOf("month");
		}

		if (endBoundary.isBefore(startBoundary)) {
			startBoundary = endBoundary.clone().startOf("day");
		}

		const startDateValue = startBoundary.startOf("day").toDate();
		const endDateValue = endBoundary.endOf("day").toDate();

		const dayIdentifier =
			sql`strftime('%Y-%m-%d', timestamp / 1000, 'unixepoch')`.as("day");

		const subquery = this._client
			.select({
				distance: min(activities.distance).as("distance"),
				duration: min(activities.duration).as("duration"),
				timestamp: activities.timestamp,
				day: dayIdentifier,
			})
			.from(activities)
			.where(
				and(
					gte(activities.timestamp, startDateValue.getTime()),
					lte(activities.timestamp, endDateValue.getTime()),
					eq(activities.type, ActivityType.RUN),
				),
			)
			.groupBy(activities.timestamp)
			.orderBy(desc(activities.timestamp))
			.as("daily_subquery");

		const result = await this._client
			.select({
				date: subquery.day,
				distance: sum(subquery.distance),
				duration: sum(subquery.duration),
				count: count(),
			})
			.from(subquery)
			.groupBy(subquery.day.sql)
			.orderBy(asc(subquery.day));

		return fillEmptyDays(result, startDateValue, endDateValue);
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
			.then((data: IDbActivityRow[]) => {
				if (!data[0]) return;
				return mapActivityRow(data[0]);
			});
	}

	async getActivities({
		limit = 20,
		cursor,
		sort = "DESC",
		type,
		subtype,
		startDate,
		endDate,
		search,
		isEvent,
	}: {
		cursor?: string;
		limit?: number;
		sort?: "ASC" | "DESC";
		type?: ActivityType;
		subtype?: ActivitySubType;
		startDate?: string;
		endDate?: string;
		search?: string;
		isEvent?: 0 | 1;
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
				isEvent: activities.isEvent,
			})
			.from(activities)
			.leftJoin(connections, eq(activities.id, connections.activityId))
			.leftJoin(groupedGears, eq(activities.id, groupedGears.activityId))
			.orderBy(order(activities.timestamp));

		const baseConditions = [];
		if (type) {
			baseConditions.push(eq(activities.type, type));
		}
		if (subtype) {
			baseConditions.push(eq(activities.subtype, subtype));
		}
		if (startDate) {
			baseConditions.push(
				gte(activities.timestamp, dayjs(startDate).startOf("day").valueOf()),
			);
		}
		if (endDate) {
			baseConditions.push(
				lte(activities.timestamp, dayjs(endDate).endOf("day").valueOf()),
			);
		}
		if (search) {
			const searchTerm = `%${search.toLowerCase()}%`;
			baseConditions.push(
				sql`(
					lower(${activities.name}) LIKE ${searchTerm}
					OR lower(${activities.locationName}) LIKE ${searchTerm}
					OR lower(${activities.locationCountry}) LIKE ${searchTerm}
					OR lower(${activities.id}) LIKE ${searchTerm}
				)`,
			);
		}
		if (typeof isEvent === "number") {
			baseConditions.push(eq(activities.isEvent, isEvent));
		}

		const baseWhere =
			baseConditions.length > 0 ? and(...baseConditions) : undefined;

		const cursorCondition = cursor
			? lt(activities.timestamp, Number.parseInt(cursor, 10))
			: undefined;

		const combinedCondition = (() => {
			if (baseWhere && cursorCondition) return and(baseWhere, cursorCondition);
			if (baseWhere) return baseWhere;
			if (cursorCondition) return cursorCondition;
			return undefined;
		})();

		const dataQuery = combinedCondition
			? select.where(combinedCondition)
			: select;
		const result = await this._client.batch([
			baseWhere
				? this._client
						.select({ count: count() })
						.from(activities)
						.where(baseWhere)
				: this._client.select({ count: count() }).from(activities),
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
		const gearConnections = await this._client
			.select({
				gearId: gearsConnection.gearId,
				connections: sql`json_group_array(
						json_object(
							'provider', ${providerGears.provider},
							'providerId', ${providerGears.providerId}
						)
					)`.as("connections"),
			})
			.from(gearsConnection)
			.leftJoin(
				providerGears,
				eq(gearsConnection.providerGearId, providerGears.id),
			)
			.groupBy(gearsConnection.gearId)
			.as("gearConnections");

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
						providerConnections: gearConnections.connections,
					})
					.from(gears)
					.leftJoin(subquery, eq(gears.id, subquery.gearId))
					.leftJoin(gearConnections, eq(gears.id, gearConnections.gearId))
					.where(gt(gears.id, cursor))
			: this._client
					.select({
						...getTableColumns(gears),
						distance: sql`COALESCE(subquery.distance, 0)`.as("distance"),
						providerConnections: gearConnections.connections,
					})
					.from(gears)
					.leftJoin(subquery, eq(gears.id, subquery.gearId))
					.leftJoin(gearConnections, eq(gears.id, gearConnections.gearId));

		const result = await this._client.batch([
			this._client.select({ count: count() }).from(gears),
			dataQuery.limit(limit).offset(offset),
		]);
		const dataCount = result[0][0]?.count || 0;
		const parseConnections = (value?: unknown) =>
			(value ? JSON.parse(value as string) : []) as IGearConnection[];
		const data = result[1].map((record) => {
			const parsedRecord = record as {
				distance: string | number | null;
				providerConnections?: unknown;
			} & IDbGearWithDistance;
			return {
				...parsedRecord,
				distance: Number.parseFloat((parsedRecord.distance ?? 0).toString()),
				providerConnections: parseConnections(parsedRecord.providerConnections),
			} as IDbGearWithDistance;
		});
		return {
			count: dataCount,
			data,
			cursor: dataCount !== data.length ? data[data.length - 1]?.id || "" : "",
		};
	}

	async getGear(gearId: string): Promise<IDbGearWithDistance | undefined> {
		const gearConnections = await this._client
			.select({
				gearId: gearsConnection.gearId,
				connections: sql`json_group_array(
						json_object(
							'provider', ${providerGears.provider},
							'providerId', ${providerGears.providerId}
						)
					)`.as("connections"),
			})
			.from(gearsConnection)
			.leftJoin(
				providerGears,
				eq(gearsConnection.providerGearId, providerGears.id),
			)
			.groupBy(gearsConnection.gearId)
			.as("gearConnections");

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
				providerConnections: gearConnections.connections,
			})
			.from(gears)
			.leftJoin(subquery, eq(gears.id, subquery.gearId))
			.leftJoin(gearConnections, eq(gears.id, gearConnections.gearId))
			.where(eq(gears.id, gearId))
			.limit(1);

		const record = result[0];
		if (!record) return;
		return {
			...record,
			distance: Number.parseFloat((record.distance ?? 0).toString()),
			providerConnections: record.providerConnections
				? (JSON.parse(
						record.providerConnections as string,
					) as IGearConnection[])
				: [],
		} as IDbGearWithDistance;
	}

	async createGear(data: IGearCreateInput) {
		if (!data.name?.trim()) {
			throw new Error("Missing gear name");
		}
		if (!data.code?.trim()) {
			throw new Error("Missing gear code");
		}
		const id = uuidv7();
		await this._client.insert(gears).values({
			id,
			name: data.name.trim(),
			code: data.code.trim(),
			brand: data.brand?.trim() ?? "",
			type: data.type,
			dateBegin: data.dateBegin,
			maximumDistance:
				data.maximumDistance !== undefined
					? Math.max(0, Math.round(data.maximumDistance))
					: 0,
		});
		return { id };
	}

	editGear(id: string, data: Record<string, string>) {
		return this._client.update(gears).set(data).where(eq(gears.id, id));
	}

	editActivity(id: string, data: Record<string, string | number | null>) {
		const updateData = { ...data };
		if ("metadata" in updateData && typeof updateData.metadata === "object") {
			updateData.metadata = JSON.stringify(updateData.metadata);
		}
		return this._client
			.update(activities)
			.set(updateData)
			.where(eq(activities.id, id));
	}

	async createActivity(data: IActivityCreateInput) {
		const timestamp = new Date(data.timestamp).getTime();
		if (Number.isNaN(timestamp)) {
			throw new Error("Invalid activity timestamp");
		}
		const allowedTypes = new Set<ActivityType>([
			ActivityType.SWIM,
			ActivityType.GYM,
			ActivityType.OTHER,
		]);
		if (!allowedTypes.has(data.type)) {
			throw new Error("Only swim, gym, or other activities can be created");
		}
		const timezone =
			data.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
		const activityPayload = {
			name: data.name,
			timestamp,
			timezone,
			distance: data.distanceMeters ?? 0,
			duration: data.durationSeconds ?? 0,
			manufacturer: "manual",
			device: "manual",
			locationName: data.locationName ?? "",
			locationCountry: data.locationCountry ?? "",
			type: data.type,
			subtype: data.subtype,
			notes: data.notes ?? "",
			metadata: data.metadata ? JSON.stringify(data.metadata) : "{}",
			isEvent: data.isEvent ? 1 : 0,
			startLatitude: 0,
			startLongitude: 0,
		} as Omit<IDbActivity, "id">;

		const id = await this.insertActivity({
			activity: {
				data: activityPayload,
			},
		});
		return { id };
	}

	deleteActivity(activityId: string) {
		return this._client.transaction(async (tx) => {
			await tx
				.delete(activityGears)
				.where(eq(activityGears.activityId, activityId));
			await tx
				.delete(activitiesConnection)
				.where(eq(activitiesConnection.activityId, activityId));
			await tx.delete(activities).where(eq(activities.id, activityId));
		});
	}

	async insertActivity({ activity, gears }: IInsertActivityPayload) {
		let activityId = "";
		const providerActivity = activity.providerActivity;
		if (providerActivity) {
			const providerExists = await this._client
				.select({ id: providerActivities.id })
				.from(providerActivities)
				.where(eq(providerActivities.id, providerActivity.id))
				.limit(1);
			if (providerExists[0]) {
				const existingConnection = await this._client
					.select({ activityId: activitiesConnection.activityId })
					.from(activitiesConnection)
					.where(
						eq(activitiesConnection.providerActivityId, providerActivity.id),
					)
					.limit(1);
				if (existingConnection[0]?.activityId) {
					console.log(
						`${providerActivity.id} provider activity already exists, skipping insert`,
					);
					return existingConnection[0].activityId;
				}
				console.log(
					`${providerActivity.id} provider activity exists without connection, skipping insert`,
				);
				return providerActivity.id;
			}
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
				metadata: activity.data.metadata
					? JSON.stringify(activity.data.metadata)
					: "{}",
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
				await tx.insert(gearsConnection).values({
					gearId,
					providerGearId,
				});
			}
			return gearId;
		});
	}

	linkActivityGear(activityId: string, gearId: string) {
		return this._client
			.insert(activityGears)
			.values({
				gearId,
				activityId,
			})
			.onConflictDoNothing({
				target: [activityGears.gearId, activityGears.activityId],
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

	linkActivityConnection(activityId: string, providerActivityId: string) {
		return this._client.transaction(async (tx) => {
			const providerActivity = await tx
				.select({ id: providerActivities.id })
				.from(providerActivities)
				.where(eq(providerActivities.id, providerActivityId))
				.limit(1);
			if (!providerActivity[0]) {
				throw new Error("Provider activity not found");
			}
			const existing = await tx
				.select({ activityId: activitiesConnection.activityId })
				.from(activitiesConnection)
				.where(eq(activitiesConnection.providerActivityId, providerActivityId))
				.limit(1);
			if (existing[0]) {
				throw new Error("Provider activity already linked");
			}
			await tx
				.insert(activitiesConnection)
				.values({ activityId, providerActivityId });
		});
	}

	unlinkActivityConnection(activityId: string, providerActivityId: string) {
		return this._client
			.delete(activitiesConnection)
			.where(
				and(
					eq(activitiesConnection.activityId, activityId),
					eq(activitiesConnection.providerActivityId, providerActivityId),
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

	async updateInbodyData(data: IInbodyUpdateInput): Promise<IInbodyData> {
		const toRequired = (value: number) => Math.round(value * 100);
		const toOptional = (value?: number | null) =>
			value === undefined || value === null ? null : Math.round(value * 100);

		await this._client
			.update(inbody)
			.set({
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
			})
			.where(eq(inbody.id, data.id));

		const [updated] = await this._client
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
			.where(eq(inbody.id, data.id))
			.limit(1);

		if (!updated) {
			throw new Error("Failed to update Inbody entry");
		}

		return updated as IInbodyData;
	}

	getProfileToken(provider: Providers, externalId?: string) {
		const where = externalId
			? and(
					eq(profiles.provider, provider),
					eq(profiles.externalId, externalId),
				)
			: eq(profiles.provider, provider);
		return this._client
			.select({
				accessToken: profiles.accessToken,
				refreshToken: profiles.refreshToken,
				expiresAt: profiles.expiresAt,
				tokenType: profiles.tokenType,
				tokenData: profiles.tokenData,
			})
			.from(profiles)
			.where(where)
			.orderBy(desc(profiles.createdAt))
			.limit(1)
			.then((data) => data[0]);
	}

	async setProfileToken(
		provider: Providers,
		tokenData: {
			accessToken: string;
			refreshToken: string;
			expiresAt: number;
			tokenType: string;
			tokenData?: string;
		},
		externalId?: string,
	) {
		const where = externalId
			? and(
					eq(profiles.provider, provider),
					eq(profiles.externalId, externalId),
				)
			: eq(profiles.provider, provider);

		const existing = await this._client
			.select({ id: profiles.id })
			.from(profiles)
			.where(where)
			.orderBy(desc(profiles.createdAt))
			.limit(1);
		if (existing[0]) {
			return this._client
				.update(profiles)
				.set({
					accessToken: tokenData.accessToken,
					refreshToken: tokenData.refreshToken,
					expiresAt: tokenData.expiresAt,
					tokenType: tokenData.tokenType,
					tokenData: tokenData.tokenData,
				})
				.where(eq(profiles.id, existing[0].id));
		}
		const profilesId = uuidv7();
		return this._client.insert(profiles).values({
			id: profilesId,
			provider,
			externalId: externalId || "",
			accessToken: tokenData.accessToken,
			refreshToken: tokenData.refreshToken,
			expiresAt: tokenData.expiresAt,
			tokenType: tokenData.tokenType,
			tokenData: tokenData.tokenData,
		});
	}
}
