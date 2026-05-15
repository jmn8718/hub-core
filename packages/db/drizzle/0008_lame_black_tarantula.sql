CREATE TABLE `app_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`display_name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `auth_identities` (
	`provider` text NOT NULL,
	`provider_user_id` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text,
	`display_name` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`provider`, `provider_user_id`),
	FOREIGN KEY (`user_id`) REFERENCES `app_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sync_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text DEFAULT '' NOT NULL,
	`schema_version` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'started' NOT NULL,
	`last_table` text,
	`last_batch_index` integer DEFAULT 0 NOT NULL,
	`total_rows` integer DEFAULT 0 NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	`error` text
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`last_sync_session_id` text,
	`last_schema_version` text,
	`last_synced_at` text,
	`last_push_completed_at` text,
	`last_pull_completed_at` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `activities` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `activities` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `activities_connection` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `activities_connection` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `activities_connection` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `activity_gears` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `activity_gears` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `activity_gears` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `gears` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `gears` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `gears` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `gears_connection` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `gears_connection` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `gears_connection` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `provider_activities` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `provider_activities` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `provider_activities` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `provider_gears` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `provider_gears` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `provider_gears` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `inbody` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `inbody` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `inbody` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `weight` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `weight` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `weight` ADD `deleted_at` text;