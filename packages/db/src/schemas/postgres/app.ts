import { sql } from "drizzle-orm";
import {
	doublePrecision,
	index,
	integer,
	pgTable,
	primaryKey,
	text,
} from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

export const activities = pgTable(
	"activities",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		name: text("name").notNull(),
		timestamp: doublePrecision("timestamp").notNull(),
		timezone: text("timezone").default(""),
		distance: doublePrecision("distance").default(0),
		duration: doublePrecision("duration").default(0),
		manufacturer: text("manufacturer").default(""),
		device: text("device").default(""),
		locationName: text("location_name").default(""),
		locationCountry: text("location_country").default(""),
		type: text("type").notNull(),
		subtype: text("subtype"),
		notes: text("notes").default(""),
		insight: text("insight").default(""),
		description: text("description").default(""),
		metadata: text("metadata").default("{}"),
		isEvent: integer("is_event").default(0),
		startLatitude: doublePrecision("start_latitude").default(0),
		startLongitude: doublePrecision("start_longitude").default(0),
		userId: text("user_id"),
		updatedAt: text("updated_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP::text`),
		deletedAt: text("deleted_at"),
	},
	(table) => [index("timestamp_idx").on(table.timestamp)],
);

export const providerActivities = pgTable("provider_activities", {
	id: text("id").primaryKey(),
	provider: text("provider").notNull(),
	timestamp: doublePrecision("timestamp").notNull(),
	original: integer("original").default(0),
	data: text("data").default("{}"),
	userId: text("user_id"),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
	deletedAt: text("deleted_at"),
});

export const gears = pgTable("gears", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	name: text("name").notNull(),
	code: text("code").notNull(),
	brand: text("brand").default(""),
	type: text("type").notNull(),
	dateBegin: text("date_begin"),
	dateEnd: text("date_end"),
	maximumDistance: integer("maximum_distance").default(0),
	userId: text("user_id"),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
	deletedAt: text("deleted_at"),
});

export const providerGears = pgTable("provider_gears", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	provider: text("provider").notNull(),
	providerId: text("provider_id").notNull(),
	data: text("data").default("{}"),
	userId: text("user_id"),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
	deletedAt: text("deleted_at"),
});

export const activityGears = pgTable(
	"activity_gears",
	{
		gearId: text("gear_id")
			.references(() => gears.id)
			.notNull(),
		activityId: text("activity_id")
			.references(() => activities.id)
			.notNull(),
		userId: text("user_id"),
		updatedAt: text("updated_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP::text`),
		deletedAt: text("deleted_at"),
	},
	(table) => [
		primaryKey({
			columns: [table.gearId, table.activityId],
		}),
	],
);

export const activityLaps = pgTable(
	"activity_laps",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		activityId: text("activity_id")
			.references(() => activities.id)
			.notNull(),
		lapNumber: integer("lap_number").notNull(),
		identifier: text("identifier").default("").notNull(),
		distance: doublePrecision("distance").default(0).notNull(),
		elapsedTime: integer("elapsed_time").default(0).notNull(),
		movingTime: integer("moving_time").default(0).notNull(),
		averageHeartRate: doublePrecision("average_heart_rate"),
		maximumHeartRate: doublePrecision("maximum_heart_rate"),
		userId: text("user_id"),
		updatedAt: text("updated_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP::text`),
		deletedAt: text("deleted_at"),
	},
	(table) => [
		index("activity_laps_activity_id_lap_number_idx").on(
			table.activityId,
			table.lapNumber,
		),
	],
);

export const activitiesConnection = pgTable(
	"activities_connection",
	{
		activityId: text("activity_id")
			.references(() => activities.id)
			.notNull(),
		providerActivityId: text("provider_activity_id")
			.references(() => providerActivities.id)
			.notNull(),
		userId: text("user_id"),
		updatedAt: text("updated_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP::text`),
		deletedAt: text("deleted_at"),
	},
	(table) => [
		primaryKey({
			columns: [table.activityId, table.providerActivityId],
		}),
	],
);

export const gearsConnection = pgTable(
	"gears_connection",
	{
		gearId: text("gear_id")
			.references(() => gears.id)
			.notNull(),
		providerGearId: text("provider_gear_id")
			.references(() => providerGears.id)
			.notNull(),
		userId: text("user_id"),
		updatedAt: text("updated_at")
			.notNull()
			.default(sql`CURRENT_TIMESTAMP::text`),
		deletedAt: text("deleted_at"),
	},
	(table) => [
		primaryKey({
			columns: [table.gearId, table.providerGearId],
		}),
	],
);
