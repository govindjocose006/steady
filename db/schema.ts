import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), title: text('title').notNull(), goal: text('goal').notNull(), kind: text('kind').notNull(),
  dueDate: text('due_date').notNull(), minutes: integer('minutes').notNull(), completedAt: text('completed_at'), completedDate: text('completed_date'),
  createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(), version: integer('version').notNull().default(1),
  applicationId: text('application_id'), applicationActionKey: text('application_action_key'),
  workspaceRecordId: text('workspace_record_id'),
  habitRecordId:text('habit_record_id'),customPoints:integer('custom_points').notNull().default(0),
}, t => [index('idx_tasks_owner').on(t.ownerId), uniqueIndex('idx_tasks_application_action').on(t.ownerId, t.applicationId, t.applicationActionKey), uniqueIndex('idx_tasks_workspace_record').on(t.ownerId,t.workspaceRecordId),uniqueIndex('idx_tasks_habit_record').on(t.ownerId,t.habitRecordId)]);
export const events = sqliteTable('events', {
  sequence: integer('sequence').primaryKey({ autoIncrement: true }), operationId: text('operation_id').notNull(), ownerId: text('owner_id').notNull(),
  taskId: text('task_id').notNull(), action: text('action').notNull(), snapshot: text('snapshot').notNull(), previous: text('previous'),
  happenedAt: text('happened_at').notNull(), localDate: text('local_date').notNull(), request: text('request').notNull(),
}, t => [uniqueIndex('idx_events_operation').on(t.operationId), index('idx_events_owner_sequence').on(t.ownerId, t.sequence)]);

export const applications = sqliteTable('applications', {
  id: text('id').primaryKey(), ownerId: text('owner_id').notNull(), institution: text('institution').notNull(), country: text('country').notNull().default(''),
  projectTitle: text('project_title').notNull().default(''), supervisor: text('supervisor').notNull().default(''), link: text('link').notNull().default(''),
  opportunity:text('opportunity').notNull().default('{}'),
  deadline: text('deadline'), notes: text('notes').notNull().default(''), nextAction: text('next_action').notNull().default(''), stage: text('stage').notNull().default('Shortlisted'),
  checklist: text('checklist').notNull().default('[]'), submissionDate: text('submission_date'), submissionTaskId: text('submission_task_id'),
  createdAt: text('created_at').notNull(), updatedAt: text('updated_at').notNull(), version: integer('version').notNull().default(1),
}, t => [index('idx_applications_owner').on(t.ownerId)]);

export const applicationEvents = sqliteTable('application_events', {
  sequence: integer('sequence').primaryKey({ autoIncrement: true }), operationId: text('operation_id').notNull(), ownerId: text('owner_id').notNull(),
  applicationId: text('application_id').notNull(), action: text('action').notNull(), snapshot: text('snapshot').notNull(), previous: text('previous'),
  happenedAt: text('happened_at').notNull(), localDate: text('local_date').notNull(), request: text('request').notNull(),
}, t => [uniqueIndex('idx_application_events_operation').on(t.operationId), index('idx_application_events_owner_sequence').on(t.ownerId, t.sequence)]);

export const workspaceRecords=sqliteTable('workspace_records',{
  id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),kind:text('kind').notNull(),data:text('data').notNull(),sourceRecordId:text('source_record_id'),followupKey:text('followup_key'),
  createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),version:integer('version').notNull().default(1),
},t=>[index('idx_workspace_records_owner').on(t.ownerId),uniqueIndex('idx_workspace_records_followup').on(t.ownerId,t.sourceRecordId,t.followupKey)]);
export const workspaceCatalog=sqliteTable('workspace_catalog',{
  id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),kind:text('kind').notNull(),name:text('name').notNull(),parentId:text('parent_id'),
  createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),version:integer('version').notNull().default(1),
},t=>[index('idx_workspace_catalog_owner').on(t.ownerId)]);
export const workspaceSettings=sqliteTable('workspace_settings',{
  ownerId:text('owner_id').primaryKey(),data:text('data').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull(),
});
export const workspaceEvents=sqliteTable('workspace_events',{
  sequence:integer('sequence').primaryKey({autoIncrement:true}),operationId:text('operation_id').notNull(),ownerId:text('owner_id').notNull(),entityId:text('entity_id').notNull(),entityType:text('entity_type').notNull(),action:text('action').notNull(),snapshot:text('snapshot').notNull(),previous:text('previous'),happenedAt:text('happened_at').notNull(),localDate:text('local_date').notNull(),request:text('request').notNull(),
},t=>[uniqueIndex('idx_workspace_events_operation').on(t.operationId),index('idx_workspace_events_owner_sequence').on(t.ownerId,t.sequence)]);

export const motivationSettings=sqliteTable('motivation_settings',{ownerId:text('owner_id').primaryKey(),data:text('data').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()});
export const pointsAwards=sqliteTable('points_awards',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),activityKey:text('activity_key').notNull(),kind:text('kind').notNull(),amount:integer('amount').notNull(),active:integer('active').notNull().default(0),activityDate:text('activity_date').notNull(),label:text('label').notNull(),firstAwardedAt:text('first_awarded_at').notNull()},t=>[uniqueIndex('idx_points_awards_activity').on(t.ownerId,t.activityKey),index('idx_points_awards_daily').on(t.ownerId,t.kind,t.activityDate,t.active)]);
export const pointsLedger=sqliteTable('points_ledger',{sequence:integer('sequence').primaryKey({autoIncrement:true}),eventKey:text('event_key').notNull(),ownerId:text('owner_id').notNull(),activityKey:text('activity_key').notNull(),action:text('action').notNull(),delta:integer('delta').notNull(),activityDate:text('activity_date'),previousDate:text('previous_date'),label:text('label').notNull(),happenedAt:text('happened_at').notNull(),localDate:text('local_date').notNull()},t=>[uniqueIndex('idx_points_ledger_event').on(t.ownerId,t.eventKey),index('idx_points_ledger_owner').on(t.ownerId,t.sequence)]);
export const rewards=sqliteTable('rewards',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),name:text('name').notNull(),description:text('description').notNull().default(''),cost:integer('cost').notNull(),archived:integer('archived').notNull().default(0),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),version:integer('version').notNull().default(1)},t=>[index('idx_rewards_owner').on(t.ownerId)]);
export const redemptions=sqliteTable('redemptions',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),rewardId:text('reward_id').notNull(),name:text('name').notNull(),cost:integer('cost').notNull(),refunded:integer('refunded').notNull().default(0),createdAt:text('created_at').notNull(),localDate:text('local_date').notNull(),version:integer('version').notNull().default(1)},t=>[index('idx_redemptions_owner').on(t.ownerId)]);
export const habitRecords=sqliteTable('habit_records',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),kind:text('kind').notNull(),data:text('data').notNull(),activityDate:text('activity_date').notNull(),completionDate:text('completion_date'),status:text('status').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),version:integer('version').notNull().default(1)},t=>[index('idx_habit_records_day').on(t.ownerId,t.kind,t.completionDate,t.status)]);
export const focusSessions=sqliteTable('focus_sessions',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),durationMs:integer('duration_ms').notNull(),remainingMs:integer('remaining_ms').notNull(),endAt:text('end_at'),status:text('status').notNull(),phoneFree:integer('phone_free'),completionDate:text('completion_date'),activeKey:text('active_key'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),version:integer('version').notNull().default(1)},t=>[uniqueIndex('idx_focus_sessions_active').on(t.ownerId,t.activeKey)]);
export const habitEvents=sqliteTable('habit_events',{sequence:integer('sequence').primaryKey({autoIncrement:true}),operationId:text('operation_id').notNull(),ownerId:text('owner_id').notNull(),entityId:text('entity_id').notNull(),entityType:text('entity_type').notNull(),action:text('action').notNull(),snapshot:text('snapshot').notNull(),previous:text('previous'),happenedAt:text('happened_at').notNull(),localDate:text('local_date').notNull(),request:text('request').notNull()},t=>[uniqueIndex('idx_habit_events_operation').on(t.operationId),index('idx_habit_events_owner').on(t.ownerId,t.sequence)]);
