import {progress, type State} from './tasks';

export type CompletionFeedback = {
  operationId: string;
  title: string;
  milestone: string | null;
  points: number;
  taskId?: string;
};

// Called only after a successful mutation, never during refresh or offline replay.
export function completionFeedback(before: State | null, after: State, payload: unknown, endpoint: string): CompletionFeedback | null {
  if (!before || !payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.id !== 'string' || typeof p.operationId !== 'string') return null;
  let title: string | undefined, kind: string | undefined, date: string | null = null, taskId: string | undefined;
  if (endpoint === '/api/tasks' && p.action === 'complete' && p.completed === true) {
    const old = before.tasks.find(t => t.id === p.id), next = after.tasks.find(t => t.id === p.id);
    if (old && !old.completedAt && next?.completedAt) {
      title = next.title; kind = next.kind; date = next.completedDate; taskId = next.id;
      // Completing an extra linked submission task is not a new submission.
      if (kind === 'application' && next.applicationId && before.applications.some(a => a.id === next.applicationId && a.submissionDate)) kind = 'preparation';
    }
  } else if (endpoint === '/api/workspace' && ['create', 'edit', 'status'].includes(String(p.action))) {
    const old = before.workspaceRecords.find(r => r.id === p.id), next = after.workspaceRecords.find(r => r.id === p.id);
    if (old?.status !== 'Completed' && next?.status === 'Completed') {
      title = next.title; kind = next.kind; date = next.completionDate;
    }
  } else if (endpoint === '/api/applications' && ['create', 'edit'].includes(String(p.action))) {
    const old = before.applications.find(a => a.id === p.id), next = after.applications.find(a => a.id === p.id);
    if (!old?.submissionDate && next?.submissionDate) {
      title = next.institution; kind = 'application'; date = next.submissionDate;
    }
  } else if (endpoint === '/api/motivation' && p.action === 'habit') {
    const old = before.habits.find(h => h.id === p.id), next = after.habits.find(h => h.id === p.id);
    if (old?.status !== 'Completed' && next?.kind === 'workout' && next.status === 'Completed') {
      title = next.activityName; kind = 'workout'; date = next.completionDate;
    }
  } else if (endpoint === '/api/motivation' && p.action === 'focus' && p.command === 'confirm') {
    const old = before.focusSessions.find(f => f.id === p.id), next = after.focusSessions.find(f => f.id === p.id);
    if (old?.phoneFree === null && next?.status === 'Finished' && next.phoneFree !== null) {
      title = 'Focus session'; kind = 'focus'; date = next.completionDate;
    }
  }
  if (!title) return null;
  const points = after.pointsHistory.filter(e => e.eventKey.startsWith(p.operationId + ':') && e.action === 'award' && e.delta > 0).reduce((sum, e) => sum + e.delta, 0);
  let milestone: string | null = kind === 'application' ? 'Application submitted!' : null;
  if (kind === 'lecture' && date === after.today) {
    const previous = progress(before.tasks, after.today, before.applications, before.workspaceRecords).net;
    const current = progress(after.tasks, after.today, after.applications, after.workspaceRecords).net;
    const target = after.settings.lectureTarget, stretch = after.settings.lectureStretch;
    if (previous < stretch && current >= stretch) milestone = 'Lecture stretch goal reached!';
    else if (previous < target && current >= target) milestone = 'Daily lecture target reached!';
  }
  return {operationId: p.operationId, title, milestone, points, taskId};
}
