import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
	id: text("id").primaryKey(),
	provider: text("provider").notNull().default(""),
	externalId: text("external_id").notNull(),
	refreshToken: text("refresh_token").notNull(),
	accessToken: text("access_token").notNull(),
	expiresAt: integer("expires_at").notNull(),
	tokenType: text("token_type").notNull(),
	tokenData: text("token_data"), // JSON field for provider-specific token data (e.g., Garmin OAuth1/OAuth2 tokens)
	createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
