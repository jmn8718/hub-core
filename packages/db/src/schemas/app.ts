import {
	index,
	integer,
	primaryKey,
	real,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";

export const activities = sqliteTable(
	"activities",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => uuidv7()),
		name: text("name").notNull(),
		timestamp: real("timestamp").notNull(),
		timezone: text("timezone").default(""),
		distance: real("distance").default(0),
		duration: real("duration").default(0),
		manufacturer: text("manufacturer").default(""),
		device: text("device").default(""),
		locationName: text("location_name").default(""),
		locationCountry: text("location_country").default(""),
		type: text("type").notNull(),
		subtype: text("subtype"),
		notes: text("notes").default(""),
		metadata: text("metadata").default("{}"),
		isEvent: integer("is_event").default(0),
		startLatitude: real("start_latitude").default(0),
		startLongitude: real("start_longitude").default(0),
	},
	(table) => [index("timestamp_idx").on(table.timestamp)],
);

export const providerActivities = sqliteTable("provider_activities", {
	id: text("id").primaryKey(),
	provider: text("provider").notNull(),
	timestamp: real("timestamp").notNull(),
	original: integer("original").default(0),
	data: text("data").default("{}"),
});

export const gears = sqliteTable("gears", {
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
});

export const providerGears = sqliteTable("provider_gears", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	provider: text("provider").notNull(),
	providerId: text("provider_id").notNull(),
	data: text("data").default("{}"),
});

export const activityGears = sqliteTable(
	"activity_gears",
	{
		gearId: text("gear_id")
			.references(() => gears.id)
			.notNull(),
		activityId: text("activity_id")
			.references(() => activities.id)
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.gearId, table.activityId],
		}),
		// foreignKey({
		//   columns: [table.gearId, table.activityId],
		//   foreignColumns: [gears.id, activities.id],
		// }),
	],
);

export const activitiesConnection = sqliteTable(
	"activities_connection",
	{
		activityId: text("activity_id")
			.references(() => activities.id)
			.notNull(),
		providerActivityId: text("provider_activity_id")
			.references(() => providerActivities.id)
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.activityId, table.providerActivityId],
		}),
		// foreignKey({
		//   columns: [table.activityId, table.providerActivityId],
		//   foreignColumns: [activities.id, providerActivities.id],
		// }),
	],
);

export const gearsConnection = sqliteTable(
	"gears_connection",
	{
		gearId: text("gear_id")
			.references(() => gears.id)
			.notNull(),
		providerGearId: text("provider_gear_id")
			.references(() => providerGears.id)
			.notNull(),
	},
	(table) => [
		primaryKey({
			columns: [table.gearId, table.providerGearId],
		}),
		// foreignKey({
		//   columns: [table.gearId, table.providerGearId],
		//   foreignColumns: [gears.id, providerGears.id],
		// }),
	],
);
