CREATE TABLE `activity_laps` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`lap_number` integer NOT NULL,
	`identifier` text DEFAULT '' NOT NULL,
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
CREATE INDEX `activity_laps_activity_id_lap_number_idx` ON `activity_laps` (`activity_id`,`lap_number`);