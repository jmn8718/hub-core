import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const inbody = sqliteTable("inbody", {
	id: text("id").primaryKey(),
	weight: integer("weight").notNull(),
	muscleMass: integer("muscle_mass").notNull(),
	bodyFatMass: integer("body_fat_mass").notNull(),
	bmi: integer("bmi").notNull(),
	percentageBodyFat: integer("percentage_body_fat").notNull(),
	leanCore: integer("lean_core"),
	leanLeftArm: integer("lean_left_arm"),
	leanRightArm: integer("lean_right_arm"),
	leanLeftLeg: integer("lean_left_leg"),
	leanRightLeg: integer("lean_right_leg"),
	fatCore: integer("fat_core"),
	fatLeftArm: integer("fat_left_arm"),
	fatRightArm: integer("fat_right_arm"),
	fatLeftLeg: integer("fat_left_leg"),
	fatRightLeg: integer("fat_right_leg"),
	compositionBodyWater: integer("composition_body_water"),
	compositionProtein: integer("composition_protein"),
	compositionMinerals: integer("composition_minerals"),
	compositionBodyFat: integer("composition_body_fat"),
	type: text("type").notNull(),
	date: text("date").notNull(),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
