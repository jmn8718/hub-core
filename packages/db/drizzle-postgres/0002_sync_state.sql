CREATE TABLE "sync_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"last_sync_session_id" text,
	"last_schema_version" text,
	"last_synced_at" text,
	"last_push_completed_at" text,
	"last_pull_completed_at" text,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
