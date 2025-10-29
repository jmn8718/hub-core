import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const weight = sqliteTable("weight", {
	id: text("id").primaryKey(),
	weight: integer("weight").notNull(),
	date: text("date").notNull(),
});
