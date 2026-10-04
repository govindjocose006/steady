CREATE TABLE `events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`task_id` text NOT NULL,
	`action` text NOT NULL,
	`snapshot` text NOT NULL,
	`previous` text,
	`happened_at` text NOT NULL,
	`local_date` text NOT NULL,
	`request` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_events_operation` ON `events` (`operation_id`);--> statement-breakpoint
CREATE INDEX `idx_events_owner_sequence` ON `events` (`owner_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`goal` text NOT NULL,
	`kind` text NOT NULL,
	`due_date` text NOT NULL,
	`minutes` integer NOT NULL,
	`completed_at` text,
	`completed_date` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_owner` ON `tasks` (`owner_id`);