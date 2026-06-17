PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activity_laps` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`lap_number` integer NOT NULL,
	`identifier` text DEFAULT 'run' NOT NULL,
	`distance` real DEFAULT 0 NOT NULL,
	`elapsed_time` integer DEFAULT 0 NOT NULL,
	`moving_time` integer DEFAULT 0 NOT NULL,
	`average_heart_rate` real,
	`maximum_heart_rate` real,
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_activity_laps`("id", "activity_id", "lap_number", "identifier", "distance", "elapsed_time", "moving_time", "average_heart_rate", "maximum_heart_rate", "user_id", "updated_at", "deleted_at") SELECT "id", "activity_id", "lap_number", "identifier", "distance", "elapsed_time", "moving_time", "average_heart_rate", "maximum_heart_rate", "user_id", "updated_at", "deleted_at" FROM `activity_laps`;--> statement-breakpoint
DROP TABLE `activity_laps`;--> statement-breakpoint
ALTER TABLE `__new_activity_laps` RENAME TO `activity_laps`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `activity_laps_activity_id_lap_number_idx` ON `activity_laps` (`activity_id`,`lap_number`);