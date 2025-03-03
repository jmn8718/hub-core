CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timestamp` text NOT NULL,
	`distance` real DEFAULT 0,
	`duration` real DEFAULT 0,
	`manufacturer` text,
	`location_name` text,
	`location_country` text,
	`type` text,
	`subtype` text,
	`is_event` integer DEFAULT 0,
	`start_latitude` real,
	`start_longitude` real
);
--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `activities` (`timestamp`);--> statement-breakpoint
CREATE TABLE `activities_connection` (
	`activity_id` text NOT NULL,
	`provider_activity_id` text NOT NULL,
	PRIMARY KEY(`activity_id`, `provider_activity_id`),
	FOREIGN KEY (`activity_id`) REFERENCES `gears`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider_activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity_id`,`provider_activity_id`) REFERENCES `activities`(`id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `activities_connection_activity_id_provider_activity_id_unique` ON `activities_connection` (`activity_id`,`provider_activity_id`);--> statement-breakpoint
CREATE TABLE `activity_gears` (
	`gear_id` text NOT NULL,
	`activity_id` text NOT NULL,
	PRIMARY KEY(`gear_id`, `activity_id`),
	FOREIGN KEY (`gear_id`) REFERENCES `gears`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gear_id`,`activity_id`) REFERENCES `gears`(`id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `gears` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text,
	`brand` text,
	`type` text,
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
	FOREIGN KEY (`provider_gear_id`) REFERENCES `gears`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`gear_id`,`provider_gear_id`) REFERENCES `gears`(`id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gears_connection_gear_id_provider_gear_id_unique` ON `gears_connection` (`gear_id`,`provider_gear_id`);--> statement-breakpoint
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
ALTER TABLE `webhooks` ADD `event_time` text NOT NULL;