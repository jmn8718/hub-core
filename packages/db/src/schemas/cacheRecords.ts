import { sql } from "drizzle-orm";
import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cacheRecords = sqliteTable("cache_records", {
	id: text("id").primaryKey(),
	provider: text("provider").notNull(),
	resource: text("resource").notNull(),
	resourceId: text("resource_id").notNull(),
	value: text("value").notNull(),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
