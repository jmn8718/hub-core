import { sql } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";

export const cacheRecords = pgTable("cache_records", {
	id: text("id").primaryKey(),
	provider: text("provider").notNull(),
	resource: text("resource").notNull(),
	resourceId: text("resource_id").notNull(),
	value: text("value").notNull(),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});
