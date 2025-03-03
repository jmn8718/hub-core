import {
  foreignKey,
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";

export const activities = sqliteTable(
  "activities",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: text("name").notNull(),
    timestamp: text("timestamp").notNull(),
    distance: real("distance").default(0),
    duration: real("duration").default(0),
    manufacturer: text("manufacturer"),
    locationName: text("location_name"),
    locationCountry: text("location_country"),
    type: text("type"),
    subtype: text("subtype"),
    is_event: integer("is_event").default(0),
    startLatitude: real("start_latitude"),
    startLongitude: real("start_longitude"),
  },
  (table) => [index("timestamp_idx").on(table.timestamp)],
);

export const providerActivities = sqliteTable("provider_activities", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  providerId: text("provider_id").notNull(),
  data: text("data").default("{}"),
});

export const gears = sqliteTable("gears", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text("name").notNull(),
  code: text("code"),
  brand: text("brand"),
  type: text("type"),
  dateBegin: text("date_begin"),
  dateEnd: text("date_end"),
  maximumDistance: integer("maximum_distance").default(0),
});

export const providerGears = sqliteTable("provider_gears", {
  id: text("id").primaryKey(),
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
    foreignKey({
      columns: [table.gearId, table.activityId],
      foreignColumns: [gears.id, activities.id],
    }),
  ],
);

export const activitiesConnection = sqliteTable(
  "activities_connection",
  {
    activityId: text("activity_id")
      .references(() => gears.id)
      .notNull(),
    providerActivityId: text("provider_activity_id")
      .references(() => activities.id)
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.activityId, table.providerActivityId],
    }),
    foreignKey({
      columns: [table.activityId, table.providerActivityId],
      foreignColumns: [activities.id, providerActivities.id],
    }),
    unique().on(table.activityId, table.providerActivityId),
  ],
);

export const gearsConnection = sqliteTable(
  "gears_connection",
  {
    gearId: text("gear_id")
      .references(() => gears.id)
      .notNull(),
    providerGearId: text("provider_gear_id")
      .references(() => gears.id)
      .notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.gearId, table.providerGearId],
    }),
    foreignKey({
      columns: [table.gearId, table.providerGearId],
      foreignColumns: [gears.id, providerGears.id],
    }),
    unique().on(table.gearId, table.providerGearId),
  ],
);
