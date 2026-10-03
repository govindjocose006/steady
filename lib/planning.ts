import {taskApplicationActive} from './applications';
import type {State,Task} from './tasks';
export type PlanDecision={kind:'pending'|'rescheduled';date?:string};
export type PlanFields={availableMinutes:number|null;taskIds:string[];priorityIds:string[];decisions:Record<string,PlanDecision>};
export type DayPlan=PlanFields&{date:string;version:number;updatedAt:string};
export type DayTemplate={id:string;name:string;availableMinutes:number|null;taskIds:string[];priorityIds:string[];version:number;updatedAt:string};
export type WeeklyReview={weekStart:string;wentWell:string;obstacles:string;change:string;priorityIds:string[];version:number;updatedAt:string};
export type PlanningState={dayPlans:DayPlan[];dayTemplates:DayTemplate[];weeklyReviews:WeeklyReview[]};
export const emptyPlan=(date:string):DayPlan=>({date,availableMinutes:null,taskIds:[],priorityIds:[],decisions:{},version:0,updatedAt:''});
export function activityKey(t:Task){return t.workspaceRecordId?'work:'+t.workspaceRecordId:t.habitRecordId?'habit:'+t.habitRecordId:t.applicationId&&t.kind==='application'?'application:'+t.applicationId:t.applicationId&&t.applicationActionKey?'application-action:'+t.applicationId+':'+t.applicationActionKey:'task:'+t.id;}
export function activeTask(t:Task,s:Pick<State,'applications'|'habits'>){return taskApplicationActive(t,s.applications)&&(!t.habitRecordId||s.habits.find(h=>h.id===t.habitRecordId)?.status!=='Rest');}
export function pendingTasks(s:Pick<State,'tasks'|'applications'|'habits'>){return uniqueTasks(s.tasks.filter(t=>!t.completedAt&&activeTask(t,s)&&t.goal!=='habits'));}
export function uniqueTasks(tasks:Task[]){const seen=new Set<string>();return tasks.filter(t=>{const key=activityKey(t);if(seen.has(key))return false;seen.add(key);return true;});}
export function planTasks(plan:DayPlan,s:Pick<State,'tasks'|'applications'|'habits'>){return uniqueTasks(plan.taskIds.map(id=>s.tasks.find(t=>t.id===id)).filter((t):t is Task=>!!t&&activeTask(t,s)&&!plan.decisions[t.id]));}
export function planTotals(plan:DayPlan,s:Pick<State,'tasks'|'applications'|'habits'>){const tasks=planTasks(plan,s),missing=tasks.filter(t=>!Number.isFinite(t.minutes)||t.minutes<=0);return {tasks,minutes:tasks.reduce((n,t)=>n+(Number.isFinite(t.minutes)&&t.minutes>0?t.minutes:0),0),remainingMinutes:tasks.filter(t=>!t.completedAt).reduce((n,t)=>n+(Number.isFinite(t.minutes)&&t.minutes>0?t.minutes:0),0),missing:missing.length};}
export function addDays(date:string,n:number){return new Date(Date.parse(date+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
export function weekStart(date:string){const d=new Date(date+'T12:00:00Z');return addDays(date,-((d.getUTCDay()+6)%7));}
export function weekDates(date:string){const start=weekStart(date);return Array.from({length:7},(_,i)=>addDays(start,i));}

export type UpcomingWork={task:Task;plannedDates:string[];sortDate:string};
// Presentation selector only: completed allocations remain in their saved plans.
export function upcomingWork(s:Pick<State,'today'|'tasks'|'applications'|'habits'|'workspaceRecords'|'dayPlans'>):UpcomingWork[]{
 const candidates=new Map<string,UpcomingWork>();
 const pending=(task:Task)=>!task.completedAt&&activeTask(task,s)&&(!task.workspaceRecordId||s.workspaceRecords.find(r=>r.id===task.workspaceRecordId)?.status!=='Completed')&&(!task.habitRecordId||s.habits.find(r=>r.id===task.habitRecordId)?.status!=='Completed');
 const add=(task:Task,date?:string)=>{if(!pending(task))return;const key=activityKey(task),entry=candidates.get(key)||{task,plannedDates:[],sortDate:task.dueDate};if(date&&!entry.plannedDates.includes(date))entry.plannedDates.push(date);candidates.set(key,entry);};
 for(const plan of s.dayPlans.filter(p=>p.date>s.today).sort((a,b)=>a.date.localeCompare(b.date)))for(const task of planTasks(plan,s))add(task,plan.date);
 for(const task of s.tasks.filter(t=>t.dueDate>s.today))add(task);
 return [...candidates.values()].map(entry=>({...entry,plannedDates:entry.plannedDates.sort(),sortDate:[...entry.plannedDates,...(entry.task.dueDate>s.today?[entry.task.dueDate]:[])].sort()[0]})).sort((a,b)=>a.sortDate.localeCompare(b.sortDate)||a.task.title.localeCompare(b.task.title));
}
