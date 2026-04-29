import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const weight = pgTable("weight", {
	id: text("id").primaryKey(),
	weight: integer("weight").notNull(),
	date: text("date").notNull(),
});
