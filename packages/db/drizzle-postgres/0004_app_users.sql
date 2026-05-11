CREATE TABLE IF NOT EXISTS "app_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"display_name" text,
	"created_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text,
	"updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text
);

CREATE TABLE IF NOT EXISTS "auth_identities" (
	"provider" text NOT NULL,
	"provider_user_id" text NOT NULL,
	"user_id" text NOT NULL REFERENCES "app_users"("id"),
	"email" text,
	"display_name" text,
	"created_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text,
	"updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text,
	PRIMARY KEY("provider", "provider_user_id")
);
