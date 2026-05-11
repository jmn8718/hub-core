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
