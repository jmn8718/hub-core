CREATE TABLE "activity_laps" (
	"id" text PRIMARY KEY NOT NULL,
	"activity_id" text NOT NULL,
	"lap_number" integer NOT NULL,
	"identifier" text DEFAULT '' NOT NULL,
	"distance" double precision DEFAULT 0 NOT NULL,
	"elapsed_time" integer DEFAULT 0 NOT NULL,
	"moving_time" integer DEFAULT 0 NOT NULL,
	"average_heart_rate" double precision,
	"maximum_heart_rate" double precision,
	"user_id" text,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL,
	"deleted_at" text
);
--> statement-breakpoint
ALTER TABLE "activity_laps" ADD CONSTRAINT "activity_laps_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_laps_activity_id_lap_number_idx" ON "activity_laps" USING btree ("activity_id","lap_number");