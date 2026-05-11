ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text;
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "deleted_at" text;

ALTER TABLE "provider_activities" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "provider_activities" ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text;
ALTER TABLE "provider_activities" ADD COLUMN IF NOT EXISTS "deleted_at" text;

ALTER TABLE "activities_connection" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "activities_connection" ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text;
ALTER TABLE "activities_connection" ADD COLUMN IF NOT EXISTS "deleted_at" text;

ALTER TABLE "gears" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "gears" ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text;
ALTER TABLE "gears" ADD COLUMN IF NOT EXISTS "deleted_at" text;

ALTER TABLE "provider_gears" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "provider_gears" ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text;
ALTER TABLE "provider_gears" ADD COLUMN IF NOT EXISTS "deleted_at" text;

ALTER TABLE "gears_connection" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "gears_connection" ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text;
ALTER TABLE "gears_connection" ADD COLUMN IF NOT EXISTS "deleted_at" text;

ALTER TABLE "activity_gears" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "activity_gears" ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text;
ALTER TABLE "activity_gears" ADD COLUMN IF NOT EXISTS "deleted_at" text;

ALTER TABLE "inbody" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "inbody" ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text;
ALTER TABLE "inbody" ADD COLUMN IF NOT EXISTS "deleted_at" text;

ALTER TABLE "weight" ADD COLUMN IF NOT EXISTS "user_id" text;
ALTER TABLE "weight" ADD COLUMN IF NOT EXISTS "updated_at" text NOT NULL DEFAULT CURRENT_TIMESTAMP::text;
ALTER TABLE "weight" ADD COLUMN IF NOT EXISTS "deleted_at" text;
