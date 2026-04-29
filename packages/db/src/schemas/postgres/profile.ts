import { sql } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
	id: text("id").primaryKey(),
	provider: text("provider").notNull().default(""),
	externalId: text("external_id").notNull(),
	refreshToken: text("refresh_token").notNull(),
	accessToken: text("access_token").notNull(),
	expiresAt: integer("expires_at").notNull(),
	tokenType: text("token_type").notNull(),
	tokenData: text("token_data"),
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});
