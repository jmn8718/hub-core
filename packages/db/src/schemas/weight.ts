import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const weight = sqliteTable("weight", {
	id: text("id").primaryKey(),
	weight: integer("weight").notNull(),
	date: text("date").notNull(),
	userId: text("user_id"),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
	deletedAt: text("deleted_at"),
});
