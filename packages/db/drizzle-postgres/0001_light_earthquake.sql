CREATE TABLE "app_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_identities" (
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"user_id" text NOT NULL,
	"email" text,
	"display_name" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	CONSTRAINT "auth_identities_provider_provider_user_id_pk" PRIMARY KEY("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "sync_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" text DEFAULT '' NOT NULL,
	"schema_version" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'started' NOT NULL,
	"last_table" text,
	"last_batch_index" integer DEFAULT 0 NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"started_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	"completed_at" text,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "sync_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"last_sync_session_id" text,
	"last_schema_version" text,
	"last_synced_at" text,
	"last_push_completed_at" text,
	"last_pull_completed_at" text,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "deleted_at" text;--> statement-breakpoint
ALTER TABLE "activities_connection" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "activities_connection" ADD COLUMN IF NOT EXISTS "updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL;--> statement-breakpoint
ALTER TABLE "activities_connection" ADD COLUMN IF NOT EXISTS "deleted_at" text;--> statement-breakpoint
ALTER TABLE "activity_gears" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "activity_gears" ADD COLUMN IF NOT EXISTS "updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_gears" ADD COLUMN IF NOT EXISTS "deleted_at" text;--> statement-breakpoint
ALTER TABLE "gears" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "gears" ADD COLUMN IF NOT EXISTS "updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL;--> statement-breakpoint
ALTER TABLE "gears" ADD COLUMN IF NOT EXISTS "deleted_at" text;--> statement-breakpoint
ALTER TABLE "gears_connection" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "gears_connection" ADD COLUMN IF NOT EXISTS "updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL;--> statement-breakpoint
ALTER TABLE "gears_connection" ADD COLUMN IF NOT EXISTS "deleted_at" text;--> statement-breakpoint
ALTER TABLE "provider_activities" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "provider_activities" ADD COLUMN IF NOT EXISTS "updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_activities" ADD COLUMN IF NOT EXISTS "deleted_at" text;--> statement-breakpoint
ALTER TABLE "provider_gears" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "provider_gears" ADD COLUMN IF NOT EXISTS "updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL;--> statement-breakpoint
ALTER TABLE "provider_gears" ADD COLUMN IF NOT EXISTS "deleted_at" text;--> statement-breakpoint
ALTER TABLE "inbody" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "inbody" ADD COLUMN IF NOT EXISTS "updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL;--> statement-breakpoint
ALTER TABLE "inbody" ADD COLUMN IF NOT EXISTS "deleted_at" text;--> statement-breakpoint
ALTER TABLE "weight" ADD COLUMN IF NOT EXISTS "user_id" text;--> statement-breakpoint
ALTER TABLE "weight" ADD COLUMN IF NOT EXISTS "updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL;--> statement-breakpoint
ALTER TABLE "weight" ADD COLUMN IF NOT EXISTS "deleted_at" text;--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_app_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_users"("id") ON DELETE no action ON UPDATE no action;