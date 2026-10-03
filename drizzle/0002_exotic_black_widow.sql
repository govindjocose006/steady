CREATE TABLE `workspace_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`parent_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_catalog_owner` ON `workspace_catalog` (`owner_id`);--> statement-breakpoint
CREATE TABLE `workspace_events` (
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
CREATE UNIQUE INDEX `idx_workspace_events_operation` ON `workspace_events` (`operation_id`);--> statement-breakpoint
CREATE INDEX `idx_workspace_events_owner_sequence` ON `workspace_events` (`owner_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `workspace_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`data` text NOT NULL,
	`source_record_id` text,
	`followup_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workspace_records_owner` ON `workspace_records` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workspace_records_followup` ON `workspace_records` (`owner_id`,`source_record_id`,`followup_key`);--> statement-breakpoint
CREATE TABLE `workspace_settings` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `workspace_record_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_tasks_workspace_record` ON `tasks` (`owner_id`,`workspace_record_id`);