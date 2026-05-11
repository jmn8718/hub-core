import { sql } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const weight = pgTable("weight", {
	id: text("id").primaryKey(),
	weight: integer("weight").notNull(),
	date: text("date").notNull(),
	userId: text("user_id"),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
	deletedAt: text("deleted_at"),
});
