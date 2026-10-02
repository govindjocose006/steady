CREATE TABLE `focus_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`remaining_ms` integer NOT NULL,
	`end_at` text,
	`status` text NOT NULL,
	`phone_free` integer,
	`completion_date` text,
	`active_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_focus_sessions_active` ON `focus_sessions` (`owner_id`,`active_key`);--> statement-breakpoint
CREATE TABLE `habit_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`action` text NOT NULL,
	`snapshot` text NOT NULL,
	`previous` text,
	`happened_at` text NOT NULL,
	`local_date` text NOT NULL,
	`request` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_habit_events_operation` ON `habit_events` (`operation_id`);--> statement-breakpoint
CREATE INDEX `idx_habit_events_owner` ON `habit_events` (`owner_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `habit_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`activity_date` text NOT NULL,
	`completion_date` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_habit_records_day` ON `habit_records` (`owner_id`,`kind`,`completion_date`,`status`);--> statement-breakpoint
CREATE TABLE `motivation_settings` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `points_awards` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`activity_key` text NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`active` integer DEFAULT 0 NOT NULL,
	`activity_date` text NOT NULL,
	`label` text NOT NULL,
	`first_awarded_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_points_awards_activity` ON `points_awards` (`owner_id`,`activity_key`);--> statement-breakpoint
CREATE INDEX `idx_points_awards_daily` ON `points_awards` (`owner_id`,`kind`,`activity_date`,`active`);--> statement-breakpoint
CREATE TABLE `points_ledger` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_key` text NOT NULL,
	`owner_id` text NOT NULL,
	`activity_key` text NOT NULL,
	`action` text NOT NULL,
	`delta` integer NOT NULL,
	`activity_date` text,
	`previous_date` text,
	`label` text NOT NULL,
	`happened_at` text NOT NULL,
	`local_date` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_points_ledger_event` ON `points_ledger` (`owner_id`,`event_key`);--> statement-breakpoint
CREATE INDEX `idx_points_ledger_owner` ON `points_ledger` (`owner_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `redemptions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`reward_id` text NOT NULL,
	`name` text NOT NULL,
	`cost` integer NOT NULL,
	`refunded` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`local_date` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_redemptions_owner` ON `redemptions` (`owner_id`);--> statement-breakpoint
CREATE TABLE `rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`cost` integer NOT NULL,
	`archived` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rewards_owner` ON `rewards` (`owner_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `habit_record_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `custom_points` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tasks_habit_record` ON `tasks` (`owner_id`,`habit_record_id`);