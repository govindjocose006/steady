CREATE TABLE `day_plans` (
	`owner_id` text NOT NULL,
	`date` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_day_plans_owner_date` ON `day_plans` (`owner_id`,`date`);--> statement-breakpoint
CREATE TABLE `day_templates` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_day_templates_owner` ON `day_templates` (`owner_id`);--> statement-breakpoint
CREATE TABLE `planning_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`entity_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`snapshot` text NOT NULL,
	`previous` text,
	`happened_at` text NOT NULL,
	`request` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_planning_events_operation` ON `planning_events` (`operation_id`);--> statement-breakpoint
CREATE INDEX `idx_planning_events_owner` ON `planning_events` (`owner_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `weekly_reviews` (
	`owner_id` text NOT NULL,
	`week_start` text NOT NULL,
	`data` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_weekly_reviews_owner_week` ON `weekly_reviews` (`owner_id`,`week_start`);