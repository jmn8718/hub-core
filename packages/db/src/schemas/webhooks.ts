import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const webhooks = sqliteTable("webhooks", {
  id: integer("id").primaryKey(),
  aspect_type: text("aspect_type"),
  object_type: text("object_type"),
  updates: text("updates"),
  event: text("event"),
  owner_id: integer("owner_id"),
  object_id: integer("owner_id"),
  subscription_id: integer("owner_id"),
  event_time: text("event_time").notNull(),
  created_at: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
