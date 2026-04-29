CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"timestamp" double precision NOT NULL,
	"timezone" text DEFAULT '',
	"distance" double precision DEFAULT 0,
	"duration" double precision DEFAULT 0,
	"manufacturer" text DEFAULT '',
	"device" text DEFAULT '',
	"location_name" text DEFAULT '',
	"location_country" text DEFAULT '',
	"type" text NOT NULL,
	"subtype" text,
	"notes" text DEFAULT '',
	"insight" text DEFAULT '',
	"description" text DEFAULT '',
	"metadata" text DEFAULT '{}',
	"is_event" integer DEFAULT 0,
	"start_latitude" double precision DEFAULT 0,
	"start_longitude" double precision DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "activities_connection" (
	"activity_id" text NOT NULL,
	"provider_activity_id" text NOT NULL,
	CONSTRAINT "activities_connection_activity_id_provider_activity_id_pk" PRIMARY KEY("activity_id","provider_activity_id")
);
--> statement-breakpoint
CREATE TABLE "activity_gears" (
	"gear_id" text NOT NULL,
	"activity_id" text NOT NULL,
	CONSTRAINT "activity_gears_gear_id_activity_id_pk" PRIMARY KEY("gear_id","activity_id")
);
--> statement-breakpoint
CREATE TABLE "gears" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"brand" text DEFAULT '',
	"type" text NOT NULL,
	"date_begin" text,
	"date_end" text,
	"maximum_distance" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "gears_connection" (
	"gear_id" text NOT NULL,
	"provider_gear_id" text NOT NULL,
	CONSTRAINT "gears_connection_gear_id_provider_gear_id_pk" PRIMARY KEY("gear_id","provider_gear_id")
);
--> statement-breakpoint
CREATE TABLE "provider_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"timestamp" double precision NOT NULL,
	"original" integer DEFAULT 0,
	"data" text DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "provider_gears" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"provider_id" text NOT NULL,
	"data" text DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE "cache_records" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"resource" text NOT NULL,
	"resource_id" text NOT NULL,
	"value" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inbody" (
	"id" text PRIMARY KEY NOT NULL,
	"weight" integer NOT NULL,
	"muscle_mass" integer NOT NULL,
	"body_fat_mass" integer NOT NULL,
	"bmi" integer NOT NULL,
	"percentage_body_fat" integer NOT NULL,
	"lean_core" integer,
	"lean_left_arm" integer,
	"lean_right_arm" integer,
	"lean_left_leg" integer,
	"lean_right_leg" integer,
	"fat_core" integer,
	"fat_left_arm" integer,
	"fat_right_arm" integer,
	"fat_left_leg" integer,
	"fat_right_leg" integer,
	"composition_body_water" integer,
	"composition_protein" integer,
	"composition_minerals" integer,
	"composition_body_fat" integer,
	"type" text NOT NULL,
	"date" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT '' NOT NULL,
	"external_id" text NOT NULL,
	"refresh_token" text NOT NULL,
	"access_token" text NOT NULL,
	"expires_at" integer NOT NULL,
	"token_type" text NOT NULL,
	"token_data" text,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" integer PRIMARY KEY NOT NULL,
	"aspect_type" text,
	"object_type" text,
	"updates" text,
	"event" text,
	"owner_id" text,
	"object_id" text,
	"subscription_id" text,
	"event_time" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP::text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight" (
	"id" text PRIMARY KEY NOT NULL,
	"weight" integer NOT NULL,
	"date" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities_connection" ADD CONSTRAINT "activities_connection_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities_connection" ADD CONSTRAINT "activities_connection_provider_activity_id_provider_activities_id_fk" FOREIGN KEY ("provider_activity_id") REFERENCES "public"."provider_activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_gears" ADD CONSTRAINT "activity_gears_gear_id_gears_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gears"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_gears" ADD CONSTRAINT "activity_gears_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gears_connection" ADD CONSTRAINT "gears_connection_gear_id_gears_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gears"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gears_connection" ADD CONSTRAINT "gears_connection_provider_gear_id_provider_gears_id_fk" FOREIGN KEY ("provider_gear_id") REFERENCES "public"."provider_gears"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "timestamp_idx" ON "activities" USING btree ("timestamp");