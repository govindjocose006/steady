CREATE TABLE `application_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`application_id` text NOT NULL,
	`action` text NOT NULL,
	`snapshot` text NOT NULL,
	`previous` text,
	`happened_at` text NOT NULL,
	`local_date` text NOT NULL,
	`request` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_application_events_operation` ON `application_events` (`operation_id`);--> statement-breakpoint
CREATE INDEX `idx_application_events_owner_sequence` ON `application_events` (`owner_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`institution` text NOT NULL,
	`country` text DEFAULT '' NOT NULL,
	`project_title` text DEFAULT '' NOT NULL,
	`supervisor` text DEFAULT '' NOT NULL,
	`link` text DEFAULT '' NOT NULL,
	`deadline` text,
	`notes` text DEFAULT '' NOT NULL,
	`next_action` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'Shortlisted' NOT NULL,
	`checklist` text DEFAULT '[]' NOT NULL,
	`submission_date` text,
	`submission_task_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_applications_owner` ON `applications` (`owner_id`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `application_id` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `application_action_key` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tasks_application_action` ON `tasks` (`owner_id`,`application_id`,`application_action_key`);