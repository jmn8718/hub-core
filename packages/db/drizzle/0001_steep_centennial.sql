PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timestamp` text NOT NULL,
	`distance` real DEFAULT 0,
	`duration` real DEFAULT 0,
	`manufacturer` text DEFAULT '',
	`location_name` text DEFAULT '',
	`location_country` text DEFAULT '',
	`type` text NOT NULL,
	`subtype` text DEFAULT '',
	`is_event` integer DEFAULT 0,
	`start_latitude` real DEFAULT 0,
	`start_longitude` real DEFAULT 0
);
--> statement-breakpoint
INSERT INTO `__new_activities`("id", "name", "timestamp", "distance", "duration", "manufacturer", "location_name", "location_country", "type", "subtype", "is_event", "start_latitude", "start_longitude") SELECT "id", "name", "timestamp", "distance", "duration", "manufacturer", "location_name", "location_country", "type", "subtype", "is_event", "start_latitude", "start_longitude" FROM `activities`;--> statement-breakpoint
DROP TABLE `activities`;--> statement-breakpoint
ALTER TABLE `__new_activities` RENAME TO `activities`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `activities` (`timestamp`);