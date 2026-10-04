export const historyStreams = ['tasks', 'applications', 'workspace', 'habits', 'points'] as const;
export type HistoryStream = typeof historyStreams[number];
export type HistoryRow = {sequence: number};
export const historyPageSize = 50;

export function isHistoryStream(value: string): value is HistoryStream {
  return (historyStreams as readonly string[]).includes(value);
}

export function historyPage<T extends HistoryRow>(rows: T[]) {
  return {events: rows.slice(0, historyPageSize), hasMore: rows.length > historyPageSize};
}

// History is immutable. Newer seed rows win when a refresh overlaps a loaded page.
export function mergeHistory<T extends HistoryRow>(latest: T[], older: T[]): T[] {
  const rows = new Map(older.map(row => [row.sequence, row]));
  latest.forEach(row => rows.set(row.sequence, row));
  return [...rows.values()].sort((a, b) => b.sequence - a.sequence);
}

export function historyURL(stream: HistoryStream, entity?: string, before?: number) {
  const query = new URLSearchParams({stream});
  if (entity) query.set('entity', entity);
  if (before !== undefined) query.set('before', String(before));
  return '/api/history?' + query;
}
