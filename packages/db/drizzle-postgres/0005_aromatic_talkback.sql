CREATE TYPE "public"."lap_identifier" AS ENUM('run', 'speed', 'rest', 'warm up');--> statement-breakpoint
ALTER TABLE "activity_laps" ALTER COLUMN "identifier" SET DEFAULT 'run'::"public"."lap_identifier";--> statement-breakpoint
ALTER TABLE "activity_laps" ALTER COLUMN "identifier" SET DATA TYPE "public"."lap_identifier" USING "identifier"::"public"."lap_identifier";