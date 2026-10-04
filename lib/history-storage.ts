import {historyPageSize, type HistoryStream} from './history';

// Only this allowlist chooses SQL identifiers. Caller values are always bound.
const streams = {
  tasks: {table: 'events', entity: 'task_id', columns: 'sequence,action,snapshot,previous,happened_at AS happenedAt,local_date AS localDate'},
  applications: {table: 'application_events', entity: 'application_id', columns: 'sequence,application_id AS applicationId,action,snapshot,previous,happened_at AS happenedAt,local_date AS localDate'},
  workspace: {table: 'workspace_events', entity: 'entity_id', columns: 'sequence,entity_id AS entityId,entity_type AS entityType,action,snapshot,previous,happened_at AS happenedAt,local_date AS localDate'},
  habits: {table: 'habit_events', entity: 'entity_id', columns: 'sequence,entity_id AS entityId,entity_type AS entityType,action,snapshot,previous,happened_at AS happenedAt,local_date AS localDate'},
  points: {table: 'points_ledger', entity: 'activity_key', columns: 'sequence,event_key AS eventKey,activity_key AS activityKey,action,delta,activity_date AS activityDate,previous_date AS previousDate,label,happened_at AS happenedAt,local_date AS localDate'},
} as const;

export function historyStatement(db: D1Database, owner: string, stream: HistoryStream, entity?: string, before?: number) {
  const config = streams[stream], conditions = ['owner_id=?'], args: (string | number)[] = [owner];
  if (entity) {
    conditions.push(config.entity + '=?'); args.push(entity);
    if (stream === 'workspace') conditions.push("entity_type='record'");
  }
  if (before !== undefined) {conditions.push('sequence<?'); args.push(before);}
  return db.prepare(`SELECT ${config.columns} FROM ${config.table} WHERE ${conditions.join(' AND ')} ORDER BY sequence DESC LIMIT ${historyPageSize + 1}`).bind(...args);
}
