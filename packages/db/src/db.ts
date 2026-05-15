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
	ISyncStateData,
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
	isNull,
	lt,
	lte,
	min,
	sql,
	sum,
} from "drizzle-orm";
import pMap from "p-map";
import { uuidv7 } from "uuidv7";
import { type DbClient, type DbDialect, getDbClientDialect } from "./client";
import {
	appUsers,
	authIdentities,
	inbody,
	profiles,
	syncSessions,
	syncState,
} from "./schemas";
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
	insight: string | null;
	description: string | null;
	metadata: string | null;
	isEvent: number | null;
	startLatitude: number | null;
	startLongitude: number | null;
}

const SYNC_BATCH_LIMIT = 250;

const SYNC_TABLES: SyncTableName[] = [
	"activities",
	"provider_activities",
	"activities_connection",
	"gears",
	"provider_gears",
	"gears_connection",
	"activity_gears",
	"inbody",
];

type SyncSessionStatus = "started" | "completed" | "failed";

type SyncTableName =
	| "activities"
	| "provider_activities"
	| "activities_connection"
	| "gears"
	| "provider_gears"
	| "gears_connection"
	| "activity_gears"
	| "inbody";

interface ISyncStartData {
	syncSessionId: string;
	allowedTables: SyncTableName[];
	batchLimit: number;
	status: "started";
}

interface ISyncPushData {
	syncSessionId: string;
	table: SyncTableName;
	batchIndex: number;
	processed: number;
	totalRows: number;
}

interface ISyncPullData {
	syncSessionId: string;
	table: SyncTableName;
	rows: Record<string, unknown>[];
	nextOffset: number;
	hasMore: boolean;
}

interface ISyncStatusData {
	id: string;
	userId: string;
	clientId: string;
	schemaVersion: string;
	status: SyncSessionStatus;
	lastTable: SyncTableName | null;
	lastBatchIndex: number;
	totalRows: number;
	startedAt: string;
	completedAt: string | null;
	error: string | null;
}

interface IResolvedAppUserData {
	userId: string;
	email: string | null;
	displayName: string | null;
	created: boolean;
}

const syncTableSet = new Set<string>(SYNC_TABLES);

function normalizeMetadata(
	type: string,
	metadataRaw: Record<string, unknown> | string,
): ActivityMetadata {
	const metadata: Record<string, unknown> =
		typeof metadataRaw === "string" ? JSON.parse(metadataRaw) : metadataRaw;
	const normalizedMetadata: Record<string, number> = {};
	if (typeof metadata.averagePace === "number") {
		normalizedMetadata.averagePace = metadata.averagePace;
	} else if (metadata.averagePace !== undefined) {
		normalizedMetadata.averagePace = Number(metadata.averagePace) || 0;
	}
	if (typeof metadata.averageSpeed === "number") {
		normalizedMetadata.averageSpeed = metadata.averageSpeed;
	} else if (metadata.averageSpeed !== undefined) {
		normalizedMetadata.averageSpeed = Number(metadata.averageSpeed) || 0;
	}
	if (typeof metadata.averageHeartRate === "number") {
		normalizedMetadata.averageHeartRate = metadata.averageHeartRate;
	} else if (metadata.averageHeartRate !== undefined) {
		normalizedMetadata.averageHeartRate =
			Number(metadata.averageHeartRate) || 0;
	}
	if (typeof metadata.maximumHeartRate === "number") {
		normalizedMetadata.maximumHeartRate = metadata.maximumHeartRate;
	} else if (metadata.maximumHeartRate !== undefined) {
		normalizedMetadata.maximumHeartRate =
			Number(metadata.maximumHeartRate) || 0;
	}
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
	return normalizedMetadata as ActivityMetadata;
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
	private _dialect: DbDialect;

	constructor(client: DbClient) {
		this._client = client;
		this._dialect = getDbClientDialect(client);
	}

	setClient(client: DbClient) {
		this._client = client;
		this._dialect = getDbClientDialect(client);
	}

	private _nowIso() {
		return new Date().toISOString();
	}

	private async _getLatestSyncUserId(): Promise<string | null> {
		const state = await this._client
			.select({ userId: syncState.userId })
			.from(syncState)
			.orderBy(desc(syncState.updatedAt))
			.limit(1)
			.then((rows) => rows[0]);
		return state?.userId ?? null;
	}

	private async _buildSyncMetadata(params?: {
		userId?: string | null;
		deletedAt?: string | null;
	}) {
		return {
			userId:
				params && "userId" in params
					? (params.userId ?? null)
					: await this._getLatestSyncUserId(),
			updatedAt: this._nowIso(),
			deletedAt: params?.deletedAt ?? null,
		};
	}

	private _monthIdentifier() {
		return this._dialect === "postgres"
			? sql<string>`to_char(to_timestamp(${activities.timestamp} / 1000.0), 'YYYY MM')`
			: sql<string>`strftime('%Y %m', ${activities.timestamp} / 1000, 'unixepoch')`;
	}

	private _weekIdentifier() {
		return this._dialect === "postgres"
			? sql<string>`to_char(date_trunc('week', to_timestamp(${activities.timestamp} / 1000.0)), 'IYYY-IW')`
			: sql<string>`strftime('%Y-%W', ${activities.timestamp} / 1000, 'unixepoch')`;
	}

	private _dayIdentifier() {
		return this._dialect === "postgres"
			? sql<string>`to_char(to_timestamp(${activities.timestamp} / 1000.0), 'YYYY-MM-DD')`
			: sql<string>`strftime('%Y-%m-%d', ${activities.timestamp} / 1000, 'unixepoch')`;
	}

	async getOrCreateAppUser(params: {
		provider: string;
		providerUserId: string;
		email?: string | null;
		displayName?: string | null;
	}): Promise<IResolvedAppUserData> {
		const provider = params.provider.trim();
		const providerUserId = params.providerUserId.trim();
		if (!provider) {
			throw new Error("Missing auth provider");
		}
		if (!providerUserId) {
			throw new Error("Missing provider user id");
		}

		const email = params.email?.trim() || null;
		const displayName = params.displayName?.trim() || null;
		const existing = await this._client
			.select({
				userId: authIdentities.userId,
				email: appUsers.email,
				displayName: appUsers.displayName,
			})
			.from(authIdentities)
			.innerJoin(appUsers, eq(authIdentities.userId, appUsers.id))
			.where(
				and(
					eq(authIdentities.provider, provider),
					eq(authIdentities.providerUserId, providerUserId),
				),
			)
			.limit(1)
			.then((rows) => rows[0]);

		if (existing) {
			const updatedAt = this._nowIso();
			await this._client
				.update(authIdentities)
				.set({
					email,
					displayName,
					updatedAt,
				})
				.where(
					and(
						eq(authIdentities.provider, provider),
						eq(authIdentities.providerUserId, providerUserId),
					),
				);
			await this._client
				.update(appUsers)
				.set({
					email,
					displayName,
					updatedAt,
				})
				.where(eq(appUsers.id, existing.userId));

			return {
				userId: existing.userId,
				email,
				displayName,
				created: false,
			};
		}

		const userId = uuidv7();
		const timestamp = this._nowIso();

		await this._client.transaction(async (tx) => {
			await tx.insert(appUsers).values({
				id: userId,
				email,
				displayName,
				createdAt: timestamp,
				updatedAt: timestamp,
			});

			await tx
				.insert(authIdentities)
				.values({
					provider,
					providerUserId,
					userId,
					email,
					displayName,
					createdAt: timestamp,
					updatedAt: timestamp,
				})
				.onConflictDoNothing();

			const resolvedIdentity = await tx
				.select({ userId: authIdentities.userId })
				.from(authIdentities)
				.where(
					and(
						eq(authIdentities.provider, provider),
						eq(authIdentities.providerUserId, providerUserId),
					),
				)
				.limit(1)
				.then((rows) => rows[0]);

			if (!resolvedIdentity) {
				throw new Error("Failed to resolve app user identity");
			}

			if (resolvedIdentity.userId !== userId) {
				await tx.delete(appUsers).where(eq(appUsers.id, userId));
			}
		});

		const resolvedUser = await this._client
			.select({
				userId: appUsers.id,
				email: appUsers.email,
				displayName: appUsers.displayName,
			})
			.from(appUsers)
			.where(eq(appUsers.id, userId))
			.limit(1)
			.then((rows) => rows[0]);

		if (resolvedUser) {
			return {
				userId: resolvedUser.userId,
				email: resolvedUser.email,
				displayName: resolvedUser.displayName,
				created: true,
			};
		}

		const fallbackResolvedUser = await this._client
			.select({
				userId: appUsers.id,
				email: appUsers.email,
				displayName: appUsers.displayName,
			})
			.from(authIdentities)
			.innerJoin(appUsers, eq(authIdentities.userId, appUsers.id))
			.where(
				and(
					eq(authIdentities.provider, provider),
					eq(authIdentities.providerUserId, providerUserId),
				),
			)
			.limit(1)
			.then((rows) => rows[0]);

		if (!fallbackResolvedUser) {
			throw new Error("Failed to load resolved app user");
		}

		return {
			userId: fallbackResolvedUser.userId,
			email: fallbackResolvedUser.email,
			displayName: fallbackResolvedUser.displayName,
			created: false,
		};
	}

	private _activityConnectionsJson() {
		return this._dialect === "postgres"
			? sql<string>`coalesce(json_agg(json_build_object('id', ${providerActivities.id}, 'provider', ${providerActivities.provider}, 'original', ${providerActivities.original})) filter (where ${providerActivities.id} is not null), '[]'::json)::text`
			: sql<string>`json_group_array(json_object('id', ${providerActivities.id}, 'provider', ${providerActivities.provider}, 'original', ${providerActivities.original}))`;
	}

	private _activityGearsJson() {
		return this._dialect === "postgres"
			? sql<string>`coalesce(json_agg(json_build_object('id', ${gears.id}, 'type', ${gears.type})) filter (where ${gears.id} is not null), '[]'::json)::text`
			: sql<string>`json_group_array(json_object('id', ${gears.id}, 'type', ${gears.type}))`;
	}

	private _gearConnectionsJson() {
		return this._dialect === "postgres"
			? sql<string>`coalesce(json_agg(json_build_object('provider', ${providerGears.provider}, 'providerId', ${providerGears.providerId})) filter (where ${providerGears.id} is not null), '[]'::json)::text`
			: sql<string>`json_group_array(json_object('provider', ${providerGears.provider}, 'providerId', ${providerGears.providerId}))`;
	}

	private _activeActivityCondition() {
		return isNull(activities.deletedAt);
	}

	private _activeProviderActivityCondition() {
		return isNull(providerActivities.deletedAt);
	}

	private _activeGearCondition() {
		return isNull(gears.deletedAt);
	}

	private _activeProviderGearCondition() {
		return isNull(providerGears.deletedAt);
	}

	private _activeActivityGearCondition() {
		return isNull(activityGears.deletedAt);
	}

	private _activeActivitiesConnectionCondition() {
		return isNull(activitiesConnection.deletedAt);
	}

	private _activeGearsConnectionCondition() {
		return isNull(gearsConnection.deletedAt);
	}

	private _activeInbodyCondition() {
		return isNull(inbody.deletedAt);
	}

	async findNearestLocationByCoordinates({
		latitude,
		longitude,
		maxDistanceDegrees = 0.1,
	}: {
		latitude: number;
		longitude: number;
		maxDistanceDegrees?: number;
	}): Promise<
		| {
				locationName: string;
				locationCountry: string;
		  }
		| undefined
	> {
		if (
			!Number.isFinite(latitude) ||
			!Number.isFinite(longitude) ||
			latitude === 0 ||
			longitude === 0
		) {
			return undefined;
		}

		const distanceSq = sql<number>`
			((${activities.startLatitude} - ${latitude}) * (${activities.startLatitude} - ${latitude}))
			+ ((${activities.startLongitude} - ${longitude}) * (${activities.startLongitude} - ${longitude}))
		`;
		const maxDistanceSq = maxDistanceDegrees * maxDistanceDegrees;

		const nearest = await this._client
			.select({
				locationName: activities.locationName,
				locationCountry: activities.locationCountry,
			})
			.from(activities)
			.where(
				and(
					this._activeActivityCondition(),
					sql`
						${activities.startLatitude} IS NOT NULL
						AND ${activities.startLongitude} IS NOT NULL
						AND ${activities.startLatitude} != 0
						AND ${activities.startLongitude} != 0
						AND (trim(${activities.locationName}) != '' OR trim(${activities.locationCountry}) != '')
						AND ${distanceSq} <= ${maxDistanceSq}
					`,
				),
			)
			.orderBy(asc(distanceSq))
			.limit(1);

		const location = nearest[0];
		if (!location) return undefined;

		return {
			locationName: location.locationName ?? "",
			locationCountry: location.locationCountry ?? "",
		};
	}

	async getActivitiesOverview(limit = 12): Promise<IOverviewData[]> {
		const monthIdentifier = this._monthIdentifier();
		const subquery = this._client
			.select({
				distance: min(activities.distance).as("distance"),
				timestamp: activities.timestamp,
				month: monthIdentifier.as("month"),
			})
			.from(activities)
			.where(
				and(
					gte(activities.timestamp, monthsBefore(limit).getTime()),
					this._activeActivityCondition(),
				),
			)
			.groupBy(activities.timestamp)
			.orderBy(desc(activities.timestamp))
			.as("subquery");

		const result = await this._client
			.select({
				distance: sum(subquery.distance),
				count: count(),
				month: subquery.month,
				minTimestamp: min(subquery.timestamp),
			})
			.from(subquery)
			.groupBy(({ month }) => month)
			.orderBy(desc(min(subquery.timestamp)));
		return fillEmptyMonths(result, limit);
	}

	async getWeeklyActivitiesOverview(limit = 4): Promise<IWeeklyOverviewData[]> {
		const weekIdentifier = this._weekIdentifier().as("week");

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
					this._activeActivityCondition(),
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
			.groupBy(({ week }) => week)
			.orderBy(desc(min(subquery.timestamp)));

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

		const dayIdentifier = this._dayIdentifier().as("day");

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
					this._activeActivityCondition(),
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
			.groupBy(({ date }) => date)
			.orderBy(asc(subquery.day));

		return fillEmptyDays(result, startDateValue, endDateValue);
	}

	getActivity(activityId: string): Promise<DbActivityPopulated | undefined> {
		const connections = this._client.$with("connections").as(
			this._client
				.select({
					activityId: activitiesConnection.activityId,
					connections: this._activityConnectionsJson().as("connections"),
				})
				.from(activitiesConnection)
				.where(this._activeActivitiesConnectionCondition())
				.leftJoin(
					providerActivities,
					and(
						eq(activitiesConnection.providerActivityId, providerActivities.id),
						this._activeProviderActivityCondition(),
					),
				)
				.groupBy(activitiesConnection.activityId),
		);

		const groupedGears = this._client.$with("groupedGears").as(
			this._client
				.select({
					activityId: activityGears.activityId,
					gears: this._activityGearsJson().as("gears"),
				})
				.from(activityGears)
				.where(this._activeActivityGearCondition())
				.leftJoin(
					gears,
					and(eq(activityGears.gearId, gears.id), this._activeGearCondition()),
				)
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
			.where(
				and(eq(activities.id, activityId), this._activeActivityCondition()),
			)
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
		withoutGear,
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
		withoutGear?: 0 | 1;
	}): Promise<ActivitiesData> {
		const connections = this._client.$with("connections").as(
			this._client
				.select({
					activityId: activitiesConnection.activityId,
					connections: this._activityConnectionsJson().as("connections"),
				})
				.from(activitiesConnection)
				.where(this._activeActivitiesConnectionCondition())
				.leftJoin(
					providerActivities,
					and(
						eq(activitiesConnection.providerActivityId, providerActivities.id),
						this._activeProviderActivityCondition(),
					),
				)
				.groupBy(activitiesConnection.activityId),
		);

		const groupedGears = this._client.$with("groupedGears").as(
			this._client
				.select({
					activityId: activityGears.activityId,
					gears: this._activityGearsJson().as("gears"),
				})
				.from(activityGears)
				.where(this._activeActivityGearCondition())
				.leftJoin(
					gears,
					and(eq(activityGears.gearId, gears.id), this._activeGearCondition()),
				)
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

		const baseConditions = [this._activeActivityCondition()];
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
		if (withoutGear === 1) {
			baseConditions.push(eq(activities.type, ActivityType.RUN));
			baseConditions.push(
				sql`not exists (
					select 1
					from ${activityGears}
					where ${activityGears.activityId} = ${activities.id}
					and ${activityGears.deletedAt} is null
				)`,
			);
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
		const [countRows, dataRows] = await Promise.all([
			baseWhere
				? this._client
						.select({ count: count() })
						.from(activities)
						.where(baseWhere)
				: this._client
						.select({ count: count() })
						.from(activities)
						.where(this._activeActivityCondition()),
			dataQuery.limit(limit),
		]);

		const dataCount = countRows[0]?.count || 0;
		const data = dataRows.map(mapActivityRow);
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
				connections: this._gearConnectionsJson().as("connections"),
			})
			.from(gearsConnection)
			.where(this._activeGearsConnectionCondition())
			.leftJoin(
				providerGears,
				and(
					eq(gearsConnection.providerGearId, providerGears.id),
					this._activeProviderGearCondition(),
				),
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
			.where(this._activeActivityGearCondition())
			.leftJoin(
				activities,
				and(
					eq(activityGears.activityId, activities.id),
					this._activeActivityCondition(),
				),
			)
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
					.where(and(gt(gears.id, cursor), this._activeGearCondition()))
			: this._client
					.select({
						...getTableColumns(gears),
						distance: sql`COALESCE(subquery.distance, 0)`.as("distance"),
						providerConnections: gearConnections.connections,
					})
					.from(gears)
					.leftJoin(subquery, eq(gears.id, subquery.gearId))
					.leftJoin(gearConnections, eq(gears.id, gearConnections.gearId))
					.where(this._activeGearCondition());

		const [countRows, dataRows] = await Promise.all([
			this._client
				.select({ count: count() })
				.from(gears)
				.where(this._activeGearCondition()),
			dataQuery.limit(limit).offset(offset),
		]);
		const dataCount = countRows[0]?.count || 0;
		const parseConnections = (value?: unknown) =>
			(value ? JSON.parse(value as string) : []) as IGearConnection[];
		const data = dataRows.map((record) => {
			const parsedRecord = record as unknown as {
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
				connections: this._gearConnectionsJson().as("connections"),
			})
			.from(gearsConnection)
			.where(this._activeGearsConnectionCondition())
			.leftJoin(
				providerGears,
				and(
					eq(gearsConnection.providerGearId, providerGears.id),
					this._activeProviderGearCondition(),
				),
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
			.where(this._activeActivityGearCondition())
			.leftJoin(
				activities,
				and(
					eq(activityGears.activityId, activities.id),
					this._activeActivityCondition(),
				),
			)
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
			.where(and(eq(gears.id, gearId), this._activeGearCondition()))
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
		const metadata = await this._buildSyncMetadata();
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
			...metadata,
		});
		return { id };
	}

	async editGear(id: string, data: Record<string, string>) {
		const metadata = await this._buildSyncMetadata();
		return this._client
			.update(gears)
			.set({
				...data,
				...metadata,
			})
			.where(eq(gears.id, id));
	}

	async editActivity(
		id: string,
		data: Record<string, string | number | null | Record<string, unknown>>,
	) {
		const updateData = { ...data };
		if ("metadata" in updateData && typeof updateData.metadata === "object") {
			updateData.metadata = JSON.stringify(updateData.metadata);
		}
		const metadata = await this._buildSyncMetadata();
		return this._client
			.update(activities)
			.set({
				...updateData,
				...metadata,
			})
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
			insight: data.insight ?? "",
			description: data.description ?? "",
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
			const deletedAt = this._nowIso();
			const userId = await this._getLatestSyncUserId();
			await tx
				.update(activityGears)
				.set({
					userId,
					updatedAt: deletedAt,
					deletedAt,
				})
				.where(eq(activityGears.activityId, activityId));
			await tx
				.update(activitiesConnection)
				.set({
					userId,
					updatedAt: deletedAt,
					deletedAt,
				})
				.where(eq(activitiesConnection.activityId, activityId));
			await tx
				.update(activities)
				.set({
					userId,
					updatedAt: deletedAt,
					deletedAt,
				})
				.where(eq(activities.id, activityId));
		});
	}

	async insertActivity({ activity, gears }: IInsertActivityPayload) {
		let activityId = "";
		const providerActivity = activity.providerActivity;
		const hasMissingLocation =
			!activity.data.locationName?.trim() ||
			!activity.data.locationCountry?.trim();
		if (
			hasMissingLocation &&
			activity.data.startLatitude !== 0 &&
			activity.data.startLongitude !== 0
		) {
			const nearestLocation = await this.findNearestLocationByCoordinates({
				latitude: activity.data.startLatitude,
				longitude: activity.data.startLongitude,
			});
			if (nearestLocation) {
				if (
					!activity.data.locationName?.trim() &&
					nearestLocation.locationName
				) {
					activity.data.locationName = nearestLocation.locationName;
				}
				if (
					!activity.data.locationCountry?.trim() &&
					nearestLocation.locationCountry
				) {
					activity.data.locationCountry = nearestLocation.locationCountry;
				}
			}
		}
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
				metadata: activities.metadata,
				type: activities.type,
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
			const updateData: Record<string, string | Record<string, unknown>> = {};

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
			if (
				activity.data.metadata &&
				Object.keys(activity.data.metadata).length > 0
			) {
				const currentMetadata = normalizeMetadata(
					activity.data.type,
					dbActivity.metadata ?? "{}",
				) as Record<string, unknown>;
				updateData.metadata = {
					...currentMetadata,
					...activity.data.metadata,
				};
			}
			if (Object.keys(updateData).length > 0) {
				await this.editActivity(activityId, updateData);
			}
		} else {
			activityId = uuidv7();
			const metadata = await this._buildSyncMetadata();
			const values: typeof activities.$inferInsert = {
				...(activity.data as typeof activities.$inferInsert),
				metadata: activity.data.metadata
					? JSON.stringify(activity.data.metadata)
					: "{}",
				id: activityId,
				...metadata,
			};
			await this._client.insert(activities).values({
				...values,
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
					await txClient
						.update(providerActivities)
						.set({
							provider: providerActivity.provider,
							timestamp: providerActivity.timestamp,
							original: providerActivity.original ? 1 : 0,
							data: providerActivity.data,
							...(await this._buildSyncMetadata()),
						})
						.where(eq(providerActivities.id, providerActivity.id));
				} else {
					const metadata = await this._buildSyncMetadata();
					await txClient.insert(providerActivities).values({
						id: providerActivity.id,
						provider: providerActivity.provider,
						timestamp: providerActivity.timestamp,
						original: providerActivity.original ? 1 : 0,
						data: providerActivity.data,
						...metadata,
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
					await txClient
						.update(activitiesConnection)
						.set({
							...(await this._buildSyncMetadata()),
						})
						.where(
							and(
								eq(activitiesConnection.activityId, activityId),
								eq(
									activitiesConnection.providerActivityId,
									providerActivity.id,
								),
							),
						);
				} else {
					const metadata = await this._buildSyncMetadata();
					await txClient.insert(activitiesConnection).values({
						activityId,
						providerActivityId: providerActivity.id,
						...metadata,
					});
				}
			});
		}
		if (gears && gears.length > 0) {
			await pMap(
				gears,
				(gear) =>
					this.insertGear(gear).then((gearId) =>
						this._client
							.insert(activityGears)
							.values({
								activityId,
								gearId,
								userId: null,
								updatedAt: this._nowIso(),
								deletedAt: null,
							})
							.onConflictDoUpdate({
								target: [activityGears.gearId, activityGears.activityId],
								set: {
									userId: sql`excluded.user_id`,
									updatedAt: sql`excluded.updated_at`,
									deletedAt: sql`excluded.deleted_at`,
								},
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
			.where(
				and(
					eq(providerActivities.provider, provider),
					this._activeProviderActivityCondition(),
				),
			)
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
				const metadata = await this._buildSyncMetadata();
				await tx
					.update(providerGears)
					.set({
						data: JSON.stringify(data),
						...metadata,
					})
					.where(eq(providerGears.id, providerGearId));
			} else {
				// create new one
				providerGearId = uuidv7();
				const metadata = await this._buildSyncMetadata();
				await tx.insert(providerGears).values({
					id: providerGearId,
					providerId: providerGear.id,
					provider: providerGear.provider,
					data: JSON.stringify(data),
					...metadata,
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
						const metadata = await this._buildSyncMetadata();
						await tx
							.update(gears)
							.set({
								dateEnd: data.dateEnd,
								...metadata,
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
						const metadata = await this._buildSyncMetadata();
						await tx
							.update(gears)
							.set({
								dateEnd: data.dateEnd,
								...metadata,
							})
							.where(eq(gears.id, gearId))
							.returning();
					}
				} else {
					gearId = uuidv7();
					const metadata = await this._buildSyncMetadata();
					const values: typeof gears.$inferInsert = {
						...(data as typeof gears.$inferInsert),
						id: gearId,
						...metadata,
					};
					await tx.insert(gears).values(values).returning();
				}
				const metadata = await this._buildSyncMetadata();
				await tx
					.insert(gearsConnection)
					.values({
						gearId,
						providerGearId,
						...metadata,
					})
					.onConflictDoUpdate({
						target: [gearsConnection.gearId, gearsConnection.providerGearId],
						set: {
							userId: sql`excluded.user_id`,
							updatedAt: sql`excluded.updated_at`,
							deletedAt: sql`excluded.deleted_at`,
						},
					});
			}
			return gearId;
		});
	}

	async linkActivityGear(activityId: string, gearId: string) {
		const metadata = await this._buildSyncMetadata();
		return this._client
			.insert(activityGears)
			.values({
				gearId,
				activityId,
				...metadata,
			})
			.onConflictDoUpdate({
				target: [activityGears.gearId, activityGears.activityId],
				set: {
					userId: sql`excluded.user_id`,
					updatedAt: sql`excluded.updated_at`,
					deletedAt: sql`excluded.deleted_at`,
				},
			});
	}

	async unlinkActivityGear(activityId: string, gearId: string) {
		const deletedAt = this._nowIso();
		const userId = await this._getLatestSyncUserId();
		return this._client
			.update(activityGears)
			.set({
				userId,
				updatedAt: deletedAt,
				deletedAt,
			})
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
			.where(
				and(
					eq(gearsConnection.gearId, gearId),
					this._activeGearsConnectionCondition(),
				),
			)
			.leftJoin(
				providerGears,
				and(
					eq(gearsConnection.providerGearId, providerGears.id),
					this._activeProviderGearCondition(),
				),
			);
	}

	async deleteGearConnection(params: { gearId: string; provider: string }) {
		const connection = await this._client
			.select({
				providerGearId: gearsConnection.providerGearId,
			})
			.from(gearsConnection)
			.leftJoin(
				providerGears,
				and(
					eq(gearsConnection.providerGearId, providerGears.id),
					this._activeProviderGearCondition(),
				),
			)
			.where(
				and(
					eq(gearsConnection.gearId, params.gearId),
					eq(providerGears.provider, params.provider),
					this._activeGearsConnectionCondition(),
				),
			)
			.limit(1);

		const providerGearId = connection[0]?.providerGearId;
		if (!providerGearId) return;

		await this._client.transaction(async (tx) => {
			const deletedAt = this._nowIso();
			const userId = await this._getLatestSyncUserId();
			await tx
				.update(gearsConnection)
				.set({
					userId,
					updatedAt: deletedAt,
					deletedAt,
				})
				.where(
					and(
						eq(gearsConnection.gearId, params.gearId),
						eq(gearsConnection.providerGearId, providerGearId),
					),
				);
			await tx
				.update(providerGears)
				.set({
					userId,
					updatedAt: deletedAt,
					deletedAt,
				})
				.where(eq(providerGears.id, providerGearId));
		});
	}

	getActivityProvider(activityId: string, provider: Providers) {
		return this._client
			.select({
				activityId: providerActivities.id,
			})
			.from(activitiesConnection)
			.leftJoin(
				providerActivities,
				and(
					eq(providerActivities.id, activitiesConnection.providerActivityId),
					this._activeProviderActivityCondition(),
				),
			)
			.where(
				and(
					eq(activitiesConnection.activityId, activityId),
					eq(providerActivities.provider, provider),
					this._activeActivitiesConnectionCondition(),
				),
			);
	}

	getActivityByProviderActivityId(providerActivityId: string) {
		return this._client
			.select({
				...getTableColumns(activities),
			})
			.from(activitiesConnection)
			.leftJoin(
				activities,
				and(
					eq(activities.id, activitiesConnection.activityId),
					this._activeActivityCondition(),
				),
			)
			.where(
				and(
					eq(activitiesConnection.providerActivityId, providerActivityId),
					this._activeActivitiesConnectionCondition(),
				),
			)
			.limit(1)
			.then((rows) => rows[0]);
	}

	async linkActivityConnection(activityId: string, providerActivityId: string) {
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
			const metadata = await this._buildSyncMetadata();
			await tx
				.insert(activitiesConnection)
				.values({ activityId, providerActivityId, ...metadata })
				.onConflictDoUpdate({
					target: [
						activitiesConnection.activityId,
						activitiesConnection.providerActivityId,
					],
					set: {
						userId: sql`excluded.user_id`,
						updatedAt: sql`excluded.updated_at`,
						deletedAt: sql`excluded.deleted_at`,
					},
				});
		});
	}

	async unlinkActivityConnection(
		activityId: string,
		providerActivityId: string,
	) {
		const deletedAt = this._nowIso();
		const userId = await this._getLatestSyncUserId();
		return this._client
			.update(activitiesConnection)
			.set({
				userId,
				updatedAt: deletedAt,
				deletedAt,
			})
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
			.where(and(eq(inbody.type, type), this._activeInbodyCondition()))
			.orderBy(desc(inbody.date));
	}

	async createInbodyData(data: IInbodyCreateInput): Promise<IInbodyData> {
		const id = uuidv7();

		const toRequired = (value: number) => Math.round(value * 100);
		const toOptional = (value?: number | null) =>
			value === undefined || value === null ? null : Math.round(value * 100);

		const metadata = await this._buildSyncMetadata();
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
			...metadata,
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

		const metadata = await this._buildSyncMetadata();
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
				...metadata,
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

	getSyncTables(): SyncTableName[] {
		return [...SYNC_TABLES];
	}

	getSyncBatchLimit(): number {
		return SYNC_BATCH_LIMIT;
	}

	async exportSyncRows(params: {
		table: SyncTableName;
		limit?: number;
		offset?: number;
		updatedAfter?: string;
		userId?: string;
	}): Promise<Record<string, unknown>[]> {
		const limit = Math.max(1, Math.min(params.limit ?? SYNC_BATCH_LIMIT, 1000));
		const offset = Math.max(0, params.offset ?? 0);
		const updatedAfter = params.updatedAfter;

		switch (params.table) {
			case "activities": {
				const conditions = [
					updatedAfter ? gt(activities.updatedAt, updatedAfter) : undefined,
					params.userId ? eq(activities.userId, params.userId) : undefined,
				].filter((condition) => condition !== undefined);
				const where = conditions.length > 0 ? and(...conditions) : undefined;
				const query = this._client
					.select()
					.from(activities)
					.orderBy(asc(activities.id));
				return (where ? query.where(where) : query).limit(limit).offset(offset);
			}
			case "provider_activities": {
				const conditions = [
					updatedAfter
						? gt(providerActivities.updatedAt, updatedAfter)
						: undefined,
					params.userId
						? eq(providerActivities.userId, params.userId)
						: undefined,
				].filter((condition) => condition !== undefined);
				const where = conditions.length > 0 ? and(...conditions) : undefined;
				const query = this._client
					.select()
					.from(providerActivities)
					.orderBy(asc(providerActivities.id));
				return (where ? query.where(where) : query).limit(limit).offset(offset);
			}
			case "activities_connection": {
				const conditions = [
					updatedAfter
						? gt(activitiesConnection.updatedAt, updatedAfter)
						: undefined,
					params.userId
						? eq(activitiesConnection.userId, params.userId)
						: undefined,
				].filter((condition) => condition !== undefined);
				const where = conditions.length > 0 ? and(...conditions) : undefined;
				const query = this._client
					.select()
					.from(activitiesConnection)
					.orderBy(
						asc(activitiesConnection.activityId),
						asc(activitiesConnection.providerActivityId),
					);
				return (where ? query.where(where) : query).limit(limit).offset(offset);
			}
			case "gears": {
				const conditions = [
					updatedAfter ? gt(gears.updatedAt, updatedAfter) : undefined,
					params.userId ? eq(gears.userId, params.userId) : undefined,
				].filter((condition) => condition !== undefined);
				const where = conditions.length > 0 ? and(...conditions) : undefined;
				const query = this._client.select().from(gears).orderBy(asc(gears.id));
				return (where ? query.where(where) : query).limit(limit).offset(offset);
			}
			case "provider_gears": {
				const conditions = [
					updatedAfter ? gt(providerGears.updatedAt, updatedAfter) : undefined,
					params.userId ? eq(providerGears.userId, params.userId) : undefined,
				].filter((condition) => condition !== undefined);
				const where = conditions.length > 0 ? and(...conditions) : undefined;
				const query = this._client
					.select()
					.from(providerGears)
					.orderBy(asc(providerGears.id));
				return (where ? query.where(where) : query).limit(limit).offset(offset);
			}
			case "gears_connection": {
				const conditions = [
					updatedAfter
						? gt(gearsConnection.updatedAt, updatedAfter)
						: undefined,
					params.userId ? eq(gearsConnection.userId, params.userId) : undefined,
				].filter((condition) => condition !== undefined);
				const where = conditions.length > 0 ? and(...conditions) : undefined;
				const query = this._client
					.select()
					.from(gearsConnection)
					.orderBy(
						asc(gearsConnection.gearId),
						asc(gearsConnection.providerGearId),
					);
				return (where ? query.where(where) : query).limit(limit).offset(offset);
			}
			case "activity_gears": {
				const conditions = [
					updatedAfter ? gt(activityGears.updatedAt, updatedAfter) : undefined,
					params.userId ? eq(activityGears.userId, params.userId) : undefined,
				].filter((condition) => condition !== undefined);
				const where = conditions.length > 0 ? and(...conditions) : undefined;
				const query = this._client
					.select()
					.from(activityGears)
					.orderBy(asc(activityGears.activityId), asc(activityGears.gearId));
				return (where ? query.where(where) : query).limit(limit).offset(offset);
			}
			case "inbody": {
				const conditions = [
					updatedAfter ? gt(inbody.updatedAt, updatedAfter) : undefined,
					params.userId ? eq(inbody.userId, params.userId) : undefined,
				].filter((condition) => condition !== undefined);
				const where = conditions.length > 0 ? and(...conditions) : undefined;
				const query = this._client
					.select()
					.from(inbody)
					.orderBy(asc(inbody.id));
				return (where ? query.where(where) : query).limit(limit).offset(offset);
			}
		}

		throw new Error("Unsupported sync table");
	}

	async pullSyncRows(params: {
		userId: string;
		syncSessionId: string;
		table: SyncTableName;
		limit?: number;
		offset?: number;
		updatedAfter?: string;
	}): Promise<ISyncPullData> {
		if (!syncTableSet.has(params.table)) {
			throw new Error("Unsupported sync table");
		}

		const session = await this._client
			.select()
			.from(syncSessions)
			.where(
				and(
					eq(syncSessions.id, params.syncSessionId),
					eq(syncSessions.userId, params.userId),
				),
			)
			.limit(1)
			.then((rows) => rows[0]);

		if (!session) {
			throw new Error("Sync session not found");
		}

		const normalizedLimit = Math.max(
			1,
			Math.min(params.limit ?? SYNC_BATCH_LIMIT, SYNC_BATCH_LIMIT),
		);
		const normalizedOffset = Math.max(0, params.offset ?? 0);
		const rows = await this.exportSyncRows({
			table: params.table,
			limit: normalizedLimit,
			offset: normalizedOffset,
			updatedAfter: params.updatedAfter,
			userId: params.userId,
		});

		return {
			syncSessionId: params.syncSessionId,
			table: params.table,
			rows,
			nextOffset: normalizedOffset + rows.length,
			hasMore: rows.length === normalizedLimit,
		};
	}

	async applySyncRows(params: {
		table: SyncTableName;
		rows: Record<string, unknown>[];
		userId?: string;
	}): Promise<number> {
		if (!syncTableSet.has(params.table)) {
			throw new Error("Unsupported sync table");
		}
		if (!Array.isArray(params.rows)) {
			throw new Error("Sync rows must be an array");
		}
		if (params.rows.length > 1000) {
			throw new Error("Sync apply batch exceeds limit of 1000 rows");
		}
		if (
			params.rows.some(
				(row) => !row || typeof row !== "object" || Array.isArray(row),
			)
		) {
			throw new Error("Sync rows must contain plain objects");
		}
		if (params.rows.length === 0) {
			return 0;
		}

		const normalizedRows = params.rows.map((row) => ({
			...row,
			...(params.userId ? { userId: params.userId } : {}),
			updatedAt:
				typeof row.updatedAt === "string" && row.updatedAt
					? row.updatedAt
					: this._nowIso(),
			deletedAt:
				"deletedAt" in row && typeof row.deletedAt !== "undefined"
					? row.deletedAt
					: null,
		}));

		await this._client.transaction(async (tx) => {
			await this._applySyncRows(tx, params.table, normalizedRows);
		});

		return normalizedRows.length;
	}

	async getSyncState(params: {
		userId: string;
	}): Promise<ISyncStateData | null> {
		const state = await this._client
			.select()
			.from(syncState)
			.where(eq(syncState.userId, params.userId))
			.limit(1)
			.then((rows) => rows[0]);

		return (state as ISyncStateData | undefined) ?? null;
	}

	async upsertSyncState(params: {
		userId: string;
		lastSyncSessionId?: string | null;
		lastSchemaVersion?: string | null;
		lastSyncedAt?: string | null;
		lastPushCompletedAt?: string | null;
		lastPullCompletedAt?: string | null;
	}): Promise<ISyncStateData> {
		const updatedAt = new Date().toISOString();
		const values = {
			userId: params.userId,
			lastSyncSessionId: params.lastSyncSessionId ?? null,
			lastSchemaVersion: params.lastSchemaVersion ?? null,
			lastSyncedAt: params.lastSyncedAt ?? null,
			lastPushCompletedAt: params.lastPushCompletedAt ?? null,
			lastPullCompletedAt: params.lastPullCompletedAt ?? null,
			updatedAt,
		};

		await this._client
			.insert(syncState)
			.values(values)
			.onConflictDoUpdate({
				target: syncState.userId,
				set: {
					lastSyncSessionId: values.lastSyncSessionId,
					lastSchemaVersion: values.lastSchemaVersion,
					lastSyncedAt: values.lastSyncedAt,
					lastPushCompletedAt: values.lastPushCompletedAt,
					lastPullCompletedAt: values.lastPullCompletedAt,
					updatedAt: values.updatedAt,
				},
			});

		const state = await this.getSyncState({ userId: params.userId });
		if (!state) {
			throw new Error("Failed to persist sync state");
		}
		return state;
	}

	async createSyncSession(params: {
		userId: string;
		clientId?: string;
		schemaVersion?: string;
	}): Promise<ISyncStartData> {
		const syncSessionId = uuidv7();
		await this._client.insert(syncSessions).values({
			id: syncSessionId,
			userId: params.userId,
			clientId: params.clientId ?? "",
			schemaVersion: params.schemaVersion ?? "",
			status: "started",
		});

		return {
			syncSessionId,
			allowedTables: this.getSyncTables(),
			batchLimit: this.getSyncBatchLimit(),
			status: "started",
		};
	}

	async getSyncSessionStatus(params: {
		userId: string;
		syncSessionId: string;
	}): Promise<ISyncStatusData> {
		const session = await this._client
			.select()
			.from(syncSessions)
			.where(
				and(
					eq(syncSessions.id, params.syncSessionId),
					eq(syncSessions.userId, params.userId),
				),
			)
			.limit(1)
			.then((rows) => rows[0]);

		if (!session) {
			throw new Error("Sync session not found");
		}

		return session as ISyncStatusData;
	}

	async pushSyncRows(params: {
		userId: string;
		syncSessionId: string;
		table: SyncTableName;
		batchIndex: number;
		rows: Record<string, unknown>[];
	}): Promise<ISyncPushData> {
		if (!syncTableSet.has(params.table)) {
			throw new Error("Unsupported sync table");
		}
		if (!Number.isInteger(params.batchIndex) || params.batchIndex < 0) {
			throw new Error("Invalid sync batch index");
		}
		if (!Array.isArray(params.rows)) {
			throw new Error("Sync rows must be an array");
		}
		if (params.rows.length > SYNC_BATCH_LIMIT) {
			throw new Error(
				`Sync batch exceeds limit of ${SYNC_BATCH_LIMIT} rows for a single request`,
			);
		}
		if (
			params.rows.some(
				(row) => !row || typeof row !== "object" || Array.isArray(row),
			)
		) {
			throw new Error("Sync rows must contain plain objects");
		}

		const normalizedRows = params.rows.map((row) => ({
			...row,
			userId: params.userId,
			updatedAt:
				typeof row.updatedAt === "string" && row.updatedAt
					? row.updatedAt
					: this._nowIso(),
			deletedAt:
				"deletedAt" in row && typeof row.deletedAt !== "undefined"
					? row.deletedAt
					: null,
		}));

		try {
			return await this._client.transaction(async (tx) => {
				const session = await tx
					.select()
					.from(syncSessions)
					.where(
						and(
							eq(syncSessions.id, params.syncSessionId),
							eq(syncSessions.userId, params.userId),
						),
					)
					.limit(1)
					.then((rows) => rows[0]);

				if (!session) {
					throw new Error("Sync session not found");
				}
				if (session.status === "completed") {
					throw new Error("Sync session is already completed");
				}

				await this._applySyncRows(tx, params.table, normalizedRows);

				const totalRows = session.totalRows + normalizedRows.length;
				await tx
					.update(syncSessions)
					.set({
						status: "started",
						lastTable: params.table,
						lastBatchIndex: params.batchIndex,
						totalRows,
						error: null,
					})
					.where(eq(syncSessions.id, params.syncSessionId));

				return {
					syncSessionId: params.syncSessionId,
					table: params.table,
					batchIndex: params.batchIndex,
					processed: normalizedRows.length,
					totalRows,
				};
			});
		} catch (error) {
			await this._client
				.update(syncSessions)
				.set({
					status: "failed",
					lastTable: params.table,
					lastBatchIndex: params.batchIndex,
					error: (error as Error).message,
				})
				.where(
					and(
						eq(syncSessions.id, params.syncSessionId),
						eq(syncSessions.userId, params.userId),
					),
				);
			throw error;
		}
	}

	async finishSyncSession(params: {
		userId: string;
		syncSessionId: string;
	}): Promise<ISyncStatusData> {
		const completedAt = new Date().toISOString();
		await this._client
			.update(syncSessions)
			.set({
				status: "completed",
				completedAt,
				error: null,
			})
			.where(
				and(
					eq(syncSessions.id, params.syncSessionId),
					eq(syncSessions.userId, params.userId),
				),
			);

		return this.getSyncSessionStatus(params);
	}

	private async _applySyncRows(
		tx: {
			insert: DbClient["insert"];
		},
		table: SyncTableName,
		rows: Record<string, unknown>[],
	): Promise<void> {
		switch (table) {
			case "activities": {
				const values = rows as Array<typeof activities.$inferInsert>;
				if (values.length === 0) return;
				await tx
					.insert(activities)
					.values(values)
					.onConflictDoUpdate({
						target: activities.id,
						set: {
							name: sql`excluded.name`,
							timestamp: sql`excluded.timestamp`,
							timezone: sql`excluded.timezone`,
							distance: sql`excluded.distance`,
							duration: sql`excluded.duration`,
							manufacturer: sql`excluded.manufacturer`,
							device: sql`excluded.device`,
							locationName: sql`excluded.location_name`,
							locationCountry: sql`excluded.location_country`,
							type: sql`excluded.type`,
							subtype: sql`excluded.subtype`,
							notes: sql`excluded.notes`,
							insight: sql`excluded.insight`,
							description: sql`excluded.description`,
							metadata: sql`excluded.metadata`,
							isEvent: sql`excluded.is_event`,
							startLatitude: sql`excluded.start_latitude`,
							startLongitude: sql`excluded.start_longitude`,
							userId: sql`excluded.user_id`,
							updatedAt: sql`excluded.updated_at`,
							deletedAt: sql`excluded.deleted_at`,
						},
					});
				return;
			}
			case "provider_activities": {
				const values = rows as Array<typeof providerActivities.$inferInsert>;
				if (values.length === 0) return;
				await tx
					.insert(providerActivities)
					.values(values)
					.onConflictDoUpdate({
						target: providerActivities.id,
						set: {
							provider: sql`excluded.provider`,
							timestamp: sql`excluded.timestamp`,
							original: sql`excluded.original`,
							data: sql`excluded.data`,
							userId: sql`excluded.user_id`,
							updatedAt: sql`excluded.updated_at`,
							deletedAt: sql`excluded.deleted_at`,
						},
					});
				return;
			}
			case "activities_connection": {
				const values = rows as Array<typeof activitiesConnection.$inferInsert>;
				if (values.length === 0) return;
				await tx
					.insert(activitiesConnection)
					.values(values)
					.onConflictDoUpdate({
						target: [
							activitiesConnection.activityId,
							activitiesConnection.providerActivityId,
						],
						set: {
							userId: sql`excluded.user_id`,
							updatedAt: sql`excluded.updated_at`,
							deletedAt: sql`excluded.deleted_at`,
						},
					});
				return;
			}
			case "gears": {
				const values = rows as Array<typeof gears.$inferInsert>;
				if (values.length === 0) return;
				await tx
					.insert(gears)
					.values(values)
					.onConflictDoUpdate({
						target: gears.id,
						set: {
							name: sql`excluded.name`,
							code: sql`excluded.code`,
							brand: sql`excluded.brand`,
							type: sql`excluded.type`,
							dateBegin: sql`excluded.date_begin`,
							dateEnd: sql`excluded.date_end`,
							maximumDistance: sql`excluded.maximum_distance`,
							userId: sql`excluded.user_id`,
							updatedAt: sql`excluded.updated_at`,
							deletedAt: sql`excluded.deleted_at`,
						},
					});
				return;
			}
			case "provider_gears": {
				const values = rows as Array<typeof providerGears.$inferInsert>;
				if (values.length === 0) return;
				await tx
					.insert(providerGears)
					.values(values)
					.onConflictDoUpdate({
						target: providerGears.id,
						set: {
							provider: sql`excluded.provider`,
							providerId: sql`excluded.provider_id`,
							data: sql`excluded.data`,
							userId: sql`excluded.user_id`,
							updatedAt: sql`excluded.updated_at`,
							deletedAt: sql`excluded.deleted_at`,
						},
					});
				return;
			}
			case "gears_connection": {
				const values = rows as Array<typeof gearsConnection.$inferInsert>;
				if (values.length === 0) return;
				await tx
					.insert(gearsConnection)
					.values(values)
					.onConflictDoUpdate({
						target: [gearsConnection.gearId, gearsConnection.providerGearId],
						set: {
							userId: sql`excluded.user_id`,
							updatedAt: sql`excluded.updated_at`,
							deletedAt: sql`excluded.deleted_at`,
						},
					});
				return;
			}
			case "activity_gears": {
				const values = rows as Array<typeof activityGears.$inferInsert>;
				if (values.length === 0) return;
				await tx
					.insert(activityGears)
					.values(values)
					.onConflictDoUpdate({
						target: [activityGears.gearId, activityGears.activityId],
						set: {
							userId: sql`excluded.user_id`,
							updatedAt: sql`excluded.updated_at`,
							deletedAt: sql`excluded.deleted_at`,
						},
					});
				return;
			}
			case "inbody": {
				const values = rows as Array<typeof inbody.$inferInsert>;
				if (values.length === 0) return;
				await tx
					.insert(inbody)
					.values(values)
					.onConflictDoUpdate({
						target: inbody.id,
						set: {
							weight: sql`excluded.weight`,
							muscleMass: sql`excluded.muscle_mass`,
							bodyFatMass: sql`excluded.body_fat_mass`,
							bmi: sql`excluded.bmi`,
							percentageBodyFat: sql`excluded.percentage_body_fat`,
							leanCore: sql`excluded.lean_core`,
							leanLeftArm: sql`excluded.lean_left_arm`,
							leanRightArm: sql`excluded.lean_right_arm`,
							leanLeftLeg: sql`excluded.lean_left_leg`,
							leanRightLeg: sql`excluded.lean_right_leg`,
							fatCore: sql`excluded.fat_core`,
							fatLeftArm: sql`excluded.fat_left_arm`,
							fatRightArm: sql`excluded.fat_right_arm`,
							fatLeftLeg: sql`excluded.fat_left_leg`,
							fatRightLeg: sql`excluded.fat_right_leg`,
							compositionBodyWater: sql`excluded.composition_body_water`,
							compositionProtein: sql`excluded.composition_protein`,
							compositionMinerals: sql`excluded.composition_minerals`,
							compositionBodyFat: sql`excluded.composition_body_fat`,
							type: sql`excluded.type`,
							date: sql`excluded.date`,
							createdAt: sql`excluded.created_at`,
							userId: sql`excluded.user_id`,
							updatedAt: sql`excluded.updated_at`,
							deletedAt: sql`excluded.deleted_at`,
						},
					});
				return;
			}
		}
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
