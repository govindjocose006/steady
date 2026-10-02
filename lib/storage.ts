import {motivationReadStatements,decodeMotivation} from './motivation-storage';
import {getDb} from '@/db';
import {indiaDate,type Task,type State} from './tasks';
import type {Application} from './applications';
import {workspaceReadStatements,decodeWorkspace} from './workspace-storage';
export const taskColumns='id, title, goal, kind, due_date AS dueDate, minutes, completed_at AS completedAt, completed_date AS completedDate, created_at AS createdAt, updated_at AS updatedAt, version, application_id AS applicationId, application_action_key AS applicationActionKey, workspace_record_id AS workspaceRecordId, habit_record_id AS habitRecordId, custom_points AS customPoints';
export const applicationColumns='id, institution, country, project_title AS projectTitle, supervisor, link, deadline, notes, next_action AS nextAction, stage, checklist, submission_date AS submissionDate, submission_task_id AS submissionTaskId, created_at AS createdAt, updated_at AS updatedAt, version, opportunity';
type ApplicationRow=Omit<Application,'checklist'|'opportunity'> & {checklist:string;opportunity:string};
export function decodeApplication(row:ApplicationRow):Application{const {opportunity,...rest}=row,details=JSON.parse(opportunity||'{}');return {...rest,checklist:JSON.parse(row.checklist),...(Object.keys(details).length?{opportunity:details}:{})};}
export async function readApplication(owner:string,id:string) {const row=await getDb().prepare(`SELECT ${applicationColumns} FROM applications WHERE owner_id=? AND id=?`).bind(owner,id).first<ApplicationRow>();return row?decodeApplication(row):null;}
export async function readTask(owner:string,id:string) {return getDb().prepare(`SELECT ${taskColumns} FROM tasks WHERE owner_id=? AND id=?`).bind(owner,id).first<Task>();}
export async function readState(owner:string):Promise<State>{
  const db=getDb(),r=await db.batch([
    db.prepare(`SELECT ${taskColumns} FROM tasks WHERE owner_id=? ORDER BY due_date,created_at`).bind(owner),
    db.prepare('SELECT sequence,action,snapshot,previous,happened_at AS happenedAt,local_date AS localDate FROM events WHERE owner_id=? ORDER BY sequence DESC LIMIT 51').bind(owner),
    db.prepare(`SELECT ${applicationColumns} FROM applications WHERE owner_id=? ORDER BY CASE WHEN deadline IS NULL THEN 1 ELSE 0 END,deadline,institution`).bind(owner),
    db.prepare('SELECT sequence,application_id AS applicationId,action,snapshot,previous,happened_at AS happenedAt,local_date AS localDate FROM application_events WHERE owner_id=? ORDER BY sequence DESC').bind(owner),
    ...workspaceReadStatements(db,owner),...motivationReadStatements(db,owner)
  ]);
  return {tasks:r[0].results as Task[],events:r[1].results.slice(0,50) as State['events'],hasMore:r[1].results.length>50,today:indiaDate(),applications:(r[2].results as ApplicationRow[]).map(decodeApplication),applicationEvents:r[3].results as State['applicationEvents'],...decodeWorkspace(r.slice(4,8)),...decodeMotivation(r.slice(8))};
}
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});}
export function isWriteRequest(request:Request){return request.headers.get('sec-fetch-site')!=='cross-site'&&!!request.headers.get('content-type')?.includes('application/json');}
export function applicationUpdate(db:D1Database,owner:string,next:Application,operationId:string,proofTable='application_events'){
  // proofTable is chosen only by the route, never by user input.
  return db.prepare(`UPDATE applications SET opportunity=?,institution=?,country=?,project_title=?,supervisor=?,link=?,deadline=?,notes=?,next_action=?,stage=?,checklist=?,submission_date=?,submission_task_id=?,updated_at=?,version=? WHERE id=? AND owner_id=? AND version=? AND EXISTS(SELECT 1 FROM ${proofTable} WHERE operation_id=? AND owner_id=?)`).bind(JSON.stringify(next.opportunity||{}),next.institution,next.country,next.projectTitle,next.supervisor,next.link,next.deadline,next.notes,next.nextAction,next.stage,JSON.stringify(next.checklist),next.submissionDate,next.submissionTaskId,next.updatedAt,next.version,next.id,owner,next.version-1,operationId,owner);
}
export function taskUpdate(db:D1Database,owner:string,next:Task,operationId:string){return db.prepare('UPDATE tasks SET title=?,goal=?,kind=?,due_date=?,minutes=?,completed_at=?,completed_date=?,updated_at=?,version=?,application_id=?,application_action_key=?,workspace_record_id=?,habit_record_id=?,custom_points=? WHERE id=? AND owner_id=? AND version=? AND EXISTS(SELECT 1 FROM events WHERE operation_id=? AND owner_id=?)').bind(next.title,next.goal,next.kind,next.dueDate,next.minutes,next.completedAt,next.completedDate,next.updatedAt,next.version,next.applicationId??null,next.applicationActionKey??null,next.workspaceRecordId??null,next.habitRecordId??null,next.customPoints??0,next.id,owner,next.version-1,operationId,owner);}
export function appEvent(db:D1Database,owner:string,next:Application,previous:Application|null,action:string,op:string,request:string,guard='1',guardParams:(string|number|null)[]=[]){return db.prepare(`INSERT INTO application_events (operation_id,owner_id,application_id,action,snapshot,previous,happened_at,local_date,request) SELECT ?,?,?,?,?,?,?,?,? WHERE ${guard}`).bind(op,owner,next.id,action,JSON.stringify(next),previous?JSON.stringify(previous):null,next.updatedAt,indiaDate(),request,...guardParams);}
export function taskEvent(db:D1Database,owner:string,next:Task,previous:Task|null,action:string,op:string,request:string,guard='1',guardParams:(string|number|null)[]=[]){return db.prepare(`INSERT INTO events (operation_id,owner_id,task_id,action,snapshot,previous,happened_at,local_date,request) SELECT ?,?,?,?,?,?,?,?,? WHERE ${guard}`).bind(op,owner,next.id,action,JSON.stringify(next),previous?JSON.stringify(previous):null,next.updatedAt,indiaDate(),request,...guardParams);}
