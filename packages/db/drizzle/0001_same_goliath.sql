CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`external_id` text NOT NULL,
	`refresh_token` text NOT NULL,
	`access_token` text NOT NULL,
	`expires_at` integer NOT NULL,
	`token_type` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
