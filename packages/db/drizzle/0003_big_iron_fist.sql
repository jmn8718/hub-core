CREATE TABLE `cache_records` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`resource` text NOT NULL,
	`resource_id` text NOT NULL,
	`value` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
