CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timestamp` text NOT NULL,
	`distance` real DEFAULT 0,
	`duration` real DEFAULT 0,
	`manufacturer` text DEFAULT '',
	`location_name` text DEFAULT '',
	`location_country` text DEFAULT '',
	`type` text NOT NULL,
	`subtype` text,
	`is_event` integer DEFAULT 0,
	`start_latitude` real DEFAULT 0,
	`start_longitude` real DEFAULT 0
);
--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `activities` (`timestamp`);--> statement-breakpoint
CREATE TABLE `activities_connection` (
	`activity_id` text NOT NULL,
	`provider_activity_id` text NOT NULL,
	PRIMARY KEY(`activity_id`, `provider_activity_id`),
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider_activity_id`) REFERENCES `provider_activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `activity_gears` (
	`gear_id` text NOT NULL,
	`activity_id` text NOT NULL,
	PRIMARY KEY(`gear_id`, `activity_id`),
	FOREIGN KEY (`gear_id`) REFERENCES `gears`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gears` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`brand` text DEFAULT '',
	`type` text NOT NULL,
	`date_begin` text,
	`date_end` text,
	`maximum_distance` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `gears_connection` (
	`gear_id` text NOT NULL,
	`provider_gear_id` text NOT NULL,
	PRIMARY KEY(`gear_id`, `provider_gear_id`),
	FOREIGN KEY (`gear_id`) REFERENCES `gears`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider_gear_id`) REFERENCES `provider_gears`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `provider_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_id` text NOT NULL,
	`data` text DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE `provider_gears` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_id` text NOT NULL,
	`data` text DEFAULT '{}'
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` integer PRIMARY KEY NOT NULL,
	`aspect_type` text,
	`object_type` text,
	`updates` text,
	`event` text,
	`owner_id` integer,
	`event_time` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
