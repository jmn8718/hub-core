ALTER TABLE `provider_activities` RENAME COLUMN "provider_id" TO "timestamp";--> statement-breakpoint
ALTER TABLE `provider_activities` ADD `original` integer DEFAULT 0;