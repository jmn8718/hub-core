ALTER TABLE `activities` ADD COLUMN `user_id` text;
ALTER TABLE `activities` ADD COLUMN `updated_at` text;
ALTER TABLE `activities` ADD COLUMN `deleted_at` text;

ALTER TABLE `provider_activities` ADD COLUMN `user_id` text;
ALTER TABLE `provider_activities` ADD COLUMN `updated_at` text;
ALTER TABLE `provider_activities` ADD COLUMN `deleted_at` text;

ALTER TABLE `activities_connection` ADD COLUMN `user_id` text;
ALTER TABLE `activities_connection` ADD COLUMN `updated_at` text;
ALTER TABLE `activities_connection` ADD COLUMN `deleted_at` text;

ALTER TABLE `gears` ADD COLUMN `user_id` text;
ALTER TABLE `gears` ADD COLUMN `updated_at` text;
ALTER TABLE `gears` ADD COLUMN `deleted_at` text;

ALTER TABLE `provider_gears` ADD COLUMN `user_id` text;
ALTER TABLE `provider_gears` ADD COLUMN `updated_at` text;
ALTER TABLE `provider_gears` ADD COLUMN `deleted_at` text;

ALTER TABLE `gears_connection` ADD COLUMN `user_id` text;
ALTER TABLE `gears_connection` ADD COLUMN `updated_at` text;
ALTER TABLE `gears_connection` ADD COLUMN `deleted_at` text;

ALTER TABLE `activity_gears` ADD COLUMN `user_id` text;
ALTER TABLE `activity_gears` ADD COLUMN `updated_at` text;
ALTER TABLE `activity_gears` ADD COLUMN `deleted_at` text;

ALTER TABLE `inbody` ADD COLUMN `user_id` text;
ALTER TABLE `inbody` ADD COLUMN `updated_at` text;
ALTER TABLE `inbody` ADD COLUMN `deleted_at` text;

ALTER TABLE `weight` ADD COLUMN `user_id` text;
ALTER TABLE `weight` ADD COLUMN `updated_at` text;
ALTER TABLE `weight` ADD COLUMN `deleted_at` text;
