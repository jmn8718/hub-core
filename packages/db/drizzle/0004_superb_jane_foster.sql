PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_webhooks` (
	`id` integer PRIMARY KEY NOT NULL,
	`aspect_type` text,
	`object_type` text,
	`updates` text,
	`event` text,
	`owner_id` text,
	`object_id` text,
	`subscription_id` text,
	`event_time` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_webhooks`("id", "aspect_type", "object_type", "updates", "event", "owner_id", "object_id", "subscription_id", "event_time", "created_at") SELECT "id", "aspect_type", "object_type", "updates", "event", "owner_id", "object_id", "subscription_id", "event_time", "created_at" FROM `webhooks`;--> statement-breakpoint
DROP TABLE `webhooks`;--> statement-breakpoint
ALTER TABLE `__new_webhooks` RENAME TO `webhooks`;--> statement-breakpoint
PRAGMA foreign_keys=ON;