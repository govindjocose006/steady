import type {MotivationState} from './motivation';
import type {Application,ApplicationEvent} from './applications';
import type {WorkspaceRecord,WorkspaceEvent,CatalogItem,WorkspaceSettings} from './workspace';
export const goals = ['phd', 'net', 'research'] as const;
export type MainGoal = typeof goals[number];
export type Goal = MainGoal | 'habits';
export type Kind = 'application' | 'preparation' | 'lecture' | 'revision' | 'practice' | 'research' | 'other' | 'workout';
export type Task = { id: string; title: string; goal: Goal; kind: Kind; dueDate: string; minutes: number; completedAt: string | null; completedDate: string | null; createdAt: string; updatedAt: string; version: number; applicationId?:string|null; applicationActionKey?:string|null; workspaceRecordId?:string|null; habitRecordId?:string|null; customPoints?:number };
export type TaskEvent = { sequence: number; action: 'created' | 'edited' | 'completed' | 'reopened'; snapshot: string; previous: string | null; happenedAt: string; localDate: string };
export type State = MotivationState & { tasks: Task[]; events: TaskEvent[]; today: string; hasMore: boolean; applications:Application[]; applicationEvents:ApplicationEvent[]; workspaceRecords:WorkspaceRecord[]; workspaceEvents:WorkspaceEvent[]; catalog:CatalogItem[]; settings:WorkspaceSettings };
export const goalNames: Record<Goal,string> = { phd: 'PhD applications', net: 'CSIR NET', research: 'Research', habits: 'Habits' };
export const kindNames: Record<Kind,string> = { application: 'Application submission', preparation: 'Application preparation', lecture: 'Lecture', revision: 'Revision', practice: 'Practice', research: 'Research task', other:'Other task', workout:'Workout' };
export const goalKinds: Record<Goal,Kind[]> = { phd: ['application','preparation','other'], net: ['lecture','revision','practice','other'], research: ['research','other'], habits:['workout'] };
export function indiaDate(now = new Date()) { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); }
export function previousDate(day: string) { return new Date(Date.parse(day + 'T12:00:00Z') - 86400000).toISOString().slice(0,10); }
export function prettyDate(day: string, long = false) { return new Intl.DateTimeFormat('en-IN', { day:'numeric', month: long ? 'long' : 'short', ...(long ? {weekday:'long' as const} : {}), timeZone:'Asia/Kolkata' }).format(new Date(day+'T06:00:00Z')); }
export function isTodayTask(task: Task, day: string) { return task.completedAt ? task.completedDate === day : task.dueDate <= day; }
export function progress(tasks: Task[], day: string, applications: Application[] = [], records:WorkspaceRecord[] = []) {
  const done = tasks.filter(t=>t.completedAt), research = tasks.filter(t=>t.goal==='research' && isTodayTask(t,day));
  const inWindow=(date:string|null|undefined)=>!!date&&date>=previousDate(day)&&date<=day;
  const submitted=new Set(applications.filter(a=>inWindow(a.submissionDate)).map(a=>a.id));
  // Unlinked tasks retain their earlier credit until reconciled with a record.
  const legacy=done.filter(t=>t.kind==='application'&&!t.applicationId&&inWindow(t.completedDate));
  return { phd: submitted.size + new Set(legacy.map(t=>t.id)).size,
    net: new Set(records.filter(r=>r.kind==='lecture'&&r.status==='Completed'&&r.completionDate===day).map(r=>r.id)).size+done.filter(t=>t.kind==='lecture'&&!t.workspaceRecordId&&t.completedDate===day).length,
    research: records.filter(r=>r.kind==='research'&&r.status==='Completed'&&r.completionDate===day).length+research.filter(t=>t.completedAt&&!t.workspaceRecordId).length, researchTotal: research.length };
}
export function duration(n: number) { return n < 60 ? `${n} min` : `${Math.floor(n/60)}h${n%60 ? ` ${n%60}m` : ''}`; }
