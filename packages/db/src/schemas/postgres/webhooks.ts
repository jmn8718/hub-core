import { sql } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const webhooks = pgTable("webhooks", {
	id: integer("id").primaryKey(),
	aspect_type: text("aspect_type"),
	object_type: text("object_type"),
	updates: text("updates"),
	event: text("event"),
	owner_id: text("owner_id"),
	object_id: text("object_id"),
	subscription_id: text("subscription_id"),
	event_time: text("event_time").notNull(),
	created_at: text("created_at")
		.notNull()
		.default(sql`CURRENT_TIMESTAMP::text`),
});
