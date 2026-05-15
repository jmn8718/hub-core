PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timestamp` real NOT NULL,
	`timezone` text DEFAULT '',
	`distance` real DEFAULT 0,
	`duration` real DEFAULT 0,
	`manufacturer` text DEFAULT '',
	`device` text DEFAULT '',
	`location_name` text DEFAULT '',
	`location_country` text DEFAULT '',
	`type` text NOT NULL,
	`subtype` text,
	`notes` text DEFAULT '',
	`insight` text DEFAULT '',
	`description` text DEFAULT '',
	`metadata` text DEFAULT '{}',
	`is_event` integer DEFAULT 0,
	`start_latitude` real DEFAULT 0,
	`start_longitude` real DEFAULT 0,
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_activities`("id", "name", "timestamp", "timezone", "distance", "duration", "manufacturer", "device", "location_name", "location_country", "type", "subtype", "notes", "insight", "description", "metadata", "is_event", "start_latitude", "start_longitude", "user_id", "updated_at", "deleted_at") SELECT "id", "name", "timestamp", "timezone", "distance", "duration", "manufacturer", "device", "location_name", "location_country", "type", "subtype", "notes", "insight", "description", "metadata", "is_event", "start_latitude", "start_longitude", "user_id", "updated_at", "deleted_at" FROM `activities`;--> statement-breakpoint
DROP TABLE `activities`;--> statement-breakpoint
ALTER TABLE `__new_activities` RENAME TO `activities`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `timestamp_idx` ON `activities` (`timestamp`);--> statement-breakpoint
CREATE TABLE `__new_activities_connection` (
	`activity_id` text NOT NULL,
	`provider_activity_id` text NOT NULL,
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	PRIMARY KEY(`activity_id`, `provider_activity_id`),
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider_activity_id`) REFERENCES `provider_activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_activities_connection`("activity_id", "provider_activity_id", "user_id", "updated_at", "deleted_at") SELECT "activity_id", "provider_activity_id", "user_id", "updated_at", "deleted_at" FROM `activities_connection`;--> statement-breakpoint
DROP TABLE `activities_connection`;--> statement-breakpoint
ALTER TABLE `__new_activities_connection` RENAME TO `activities_connection`;--> statement-breakpoint
CREATE TABLE `__new_activity_gears` (
	`gear_id` text NOT NULL,
	`activity_id` text NOT NULL,
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	PRIMARY KEY(`gear_id`, `activity_id`),
	FOREIGN KEY (`gear_id`) REFERENCES `gears`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_activity_gears`("gear_id", "activity_id", "user_id", "updated_at", "deleted_at") SELECT "gear_id", "activity_id", "user_id", "updated_at", "deleted_at" FROM `activity_gears`;--> statement-breakpoint
DROP TABLE `activity_gears`;--> statement-breakpoint
ALTER TABLE `__new_activity_gears` RENAME TO `activity_gears`;--> statement-breakpoint
CREATE TABLE `__new_gears` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`brand` text DEFAULT '',
	`type` text NOT NULL,
	`date_begin` text,
	`date_end` text,
	`maximum_distance` integer DEFAULT 0,
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_gears`("id", "name", "code", "brand", "type", "date_begin", "date_end", "maximum_distance", "user_id", "updated_at", "deleted_at") SELECT "id", "name", "code", "brand", "type", "date_begin", "date_end", "maximum_distance", "user_id", "updated_at", "deleted_at" FROM `gears`;--> statement-breakpoint
DROP TABLE `gears`;--> statement-breakpoint
ALTER TABLE `__new_gears` RENAME TO `gears`;--> statement-breakpoint
CREATE TABLE `__new_gears_connection` (
	`gear_id` text NOT NULL,
	`provider_gear_id` text NOT NULL,
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	PRIMARY KEY(`gear_id`, `provider_gear_id`),
	FOREIGN KEY (`gear_id`) REFERENCES `gears`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`provider_gear_id`) REFERENCES `provider_gears`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_gears_connection`("gear_id", "provider_gear_id", "user_id", "updated_at", "deleted_at") SELECT "gear_id", "provider_gear_id", "user_id", "updated_at", "deleted_at" FROM `gears_connection`;--> statement-breakpoint
DROP TABLE `gears_connection`;--> statement-breakpoint
ALTER TABLE `__new_gears_connection` RENAME TO `gears_connection`;--> statement-breakpoint
CREATE TABLE `__new_provider_activities` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`timestamp` real NOT NULL,
	`original` integer DEFAULT 0,
	`data` text DEFAULT '{}',
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_provider_activities`("id", "provider", "timestamp", "original", "data", "user_id", "updated_at", "deleted_at") SELECT "id", "provider", "timestamp", "original", "data", "user_id", "updated_at", "deleted_at" FROM `provider_activities`;--> statement-breakpoint
DROP TABLE `provider_activities`;--> statement-breakpoint
ALTER TABLE `__new_provider_activities` RENAME TO `provider_activities`;--> statement-breakpoint
CREATE TABLE `__new_provider_gears` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_id` text NOT NULL,
	`data` text DEFAULT '{}',
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_provider_gears`("id", "provider", "provider_id", "data", "user_id", "updated_at", "deleted_at") SELECT "id", "provider", "provider_id", "data", "user_id", "updated_at", "deleted_at" FROM `provider_gears`;--> statement-breakpoint
DROP TABLE `provider_gears`;--> statement-breakpoint
ALTER TABLE `__new_provider_gears` RENAME TO `provider_gears`;--> statement-breakpoint
CREATE TABLE `__new_inbody` (
	`id` text PRIMARY KEY NOT NULL,
	`weight` integer NOT NULL,
	`muscle_mass` integer NOT NULL,
	`body_fat_mass` integer NOT NULL,
	`bmi` integer NOT NULL,
	`percentage_body_fat` integer NOT NULL,
	`lean_core` integer,
	`lean_left_arm` integer,
	`lean_right_arm` integer,
	`lean_left_leg` integer,
	`lean_right_leg` integer,
	`fat_core` integer,
	`fat_left_arm` integer,
	`fat_right_arm` integer,
	`fat_left_leg` integer,
	`fat_right_leg` integer,
	`composition_body_water` integer,
	`composition_protein` integer,
	`composition_minerals` integer,
	`composition_body_fat` integer,
	`type` text NOT NULL,
	`date` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`user_id` text,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
INSERT INTO `__new_inbody`("id", "weight", "muscle_mass", "body_fat_mass", "bmi", "percentage_body_fat", "lean_core", "lean_left_arm", "lean_right_arm", "lean_left_leg", "lean_right_leg", "fat_core", "fat_left_arm", "fat_right_arm", "fat_left_leg", "fat_right_leg", "composition_body_water", "composition_protein", "composition_minerals", "composition_body_fat", "type", "date", "created_at", "user_id", "updated_at", "deleted_at") SELECT "id", "weight", "muscle_mass", "body_fat_mass", "bmi", "percentage_body_fat", "lean_core", "lean_left_arm", "lean_right_arm", "lean_left_leg", "lean_right_leg", "fat_core", "fat_left_arm", "fat_right_arm", "fat_left_leg", "fat_right_leg", "composition_body_water", "composition_protein", "composition_minerals", "composition_body_fat", "type", "date", "created_at", "user_id", "updated_at", "deleted_at" FROM `inbody`;--> statement-breakpoint
DROP TABLE `inbody`;--> statement-breakpoint
ALTER TABLE `__new_inbody` RENAME TO `inbody`;