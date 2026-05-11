import { sql } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const syncSessions = pgTable("sync_sessions", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	clientId: text("client_id").notNull().default(""),
	schemaVersion: text("schema_version").notNull().default(""),
	status: text("status").notNull().default("started"),
	lastTable: text("last_table"),
	lastBatchIndex: integer("last_batch_index").notNull().default(0),
	totalRows: integer("total_rows").notNull().default(0),
	startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
	completedAt: text("completed_at"),
	error: text("error"),
});

export const syncState = pgTable("sync_state", {
	userId: text("user_id").primaryKey(),
	lastSyncSessionId: text("last_sync_session_id"),
	lastSchemaVersion: text("last_schema_version"),
	lastSyncedAt: text("last_synced_at"),
	lastPushCompletedAt: text("last_push_completed_at"),
	lastPullCompletedAt: text("last_pull_completed_at"),
	updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP::text`),
});
