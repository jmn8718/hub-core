CREATE TABLE `webhooks` (
	`id` integer PRIMARY KEY NOT NULL,
	`aspect_type` text,
	`object_type` text,
	`updates` text,
	`event` text,
	`owner_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
