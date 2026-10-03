import {logFailure} from '@/lib/safe-log';
import {repairOpportunityOwnership} from '@/lib/opportunity-ownership';
import {awardStatements,transferAward,workoutStatements} from '@/lib/points';
import {pointKindForTask,type HabitRecord} from '@/lib/motivation';
import {readHabit,habitEvent,habitUpdate,habitTask} from '@/lib/motivation-storage';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {getDb} from '@/db';
import {indiaDate,goalKinds,type Task} from '@/lib/tasks';
import type {Application} from '@/lib/applications';
import {dateSchema} from '@/lib/validation';
import {readApplication,readTask,readState,json,isWriteRequest,taskEvent,appEvent,taskUpdate,applicationUpdate} from '@/lib/storage';
import {z} from 'zod';
import {readWorkspaceRecord,workspaceEvent,workspaceRecordUpdate,followupKey} from '@/lib/workspace-storage';
import {recordTaskKind,type WorkspaceRecord} from '@/lib/workspace';
export const dynamic='force-dynamic';
const fields=z.object({title:z.string().trim().min(1).max(180),goal:z.enum(['phd','net','research']),kind:z.enum(['application','preparation','lecture','revision','practice','research','other']),dueDate:dateSchema,minutes:z.number().int().min(1).max(1440),applicationId:z.string().uuid().nullable().optional(),customPoints:z.number().int().min(0).max(100000).default(0)}).refine(v=>goalKinds[v.goal].includes(v.kind),'Choose a matching activity type.');
const operation=z.discriminatedUnion('action',[
  z.object({action:z.literal('create'),operationId:z.string().uuid(),id:z.string().uuid(),fields}),
  z.object({action:z.literal('edit'),operationId:z.string().uuid(),id:z.string().uuid(),version:z.number().int().positive(),fields}),
  z.object({action:z.literal('complete'),operationId:z.string().uuid(),id:z.string().uuid(),version:z.number().int().positive(),completed:z.boolean()})
]);
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Sign in to see your private tasks.'},401);try{await repairOpportunityOwnership(user);return json(await readState(user.userId));}catch{logFailure('tasks.read');return json({error:'Your tasks could not be loaded. Please retry.'},503);}}
export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return json({error:'Your session has ended. Reload to sign in again.'},401);if(!isWriteRequest(request))return json({error:'Unsupported request.'},403);
  let result;try{const text=await request.text();if(text.length>8000)return json({error:'Task is too long.'},400);result=operation.safeParse(JSON.parse(text));}catch{return json({error:'Invalid task data.'},400);}
  if(!result.success)return json({error:result.error.issues[0]?.message||'Check your task details.'},400);
  const op=result.data,owner=user.userId,fingerprint=JSON.stringify(op),now=new Date().toISOString(),day=indiaDate();
  try{
    const db=getDb(),duplicate=await db.prepare('SELECT request FROM events WHERE operation_id=? AND owner_id=?').bind(op.operationId,owner).first<{request:string}>();
    if(duplicate)return duplicate.request===fingerprint?json(await readState(owner)):json({error:'This save was already processed. Close and reopen the task for another change.'},409);
    let before:Task|null=null;
    if(op.action!=='create'){before=await readTask(owner,op.id);if(!before)return json({error:'Task not found.'},404);if(before.version!==op.version)return json({error:'This task changed in another tab. Your latest tasks have been loaded; reopen it to edit.'},409);}
    if(before?.habitRecordId&&op.action!=='create'){
      if(op.action==='edit')return json({error:'Edit workouts and rest days from Habits.'},400);
      const record=await readHabit(owner,before.habitRecordId);if(!record)return json({error:'Workout not found.'},404);if(record.status==='Rest')return json({error:'Rest days need no completion checkbox.'},400);
      if(Boolean(before.completedAt)===op.completed)return json(await readState(owner));
      const nextRecord:HabitRecord={...record,status:op.completed?'Completed':'Planned',completionDate:op.completed?day:null,updatedAt:now,version:record.version+1},nextTask=habitTask(nextRecord,before.id,now,before),proof={table:'events' as const,operationId:op.operationId};
      const done=await db.batch([taskEvent(db,owner,nextTask,before,op.completed?'completed':'reopened',op.operationId,fingerprint,'EXISTS(SELECT 1 FROM tasks WHERE owner_id=? AND id=? AND version=?) AND EXISTS(SELECT 1 FROM habit_records WHERE owner_id=? AND id=? AND version=?)',[owner,before.id,before.version,owner,record.id,record.version]),habitEvent(db,owner,record.id,'habit',nextRecord,record,op.completed?'completed':'completion_undone','habit:'+op.operationId,fingerprint,now,'EXISTS(SELECT 1 FROM events WHERE owner_id=? AND operation_id=?)',[owner,op.operationId]),habitUpdate(db,owner,nextRecord,proof),taskUpdate(db,owner,nextTask,op.operationId),...workoutStatements(db,owner,proof,record.status==='Completed'?record.completionDate:null,nextRecord.completionDate,record.status!=='Completed'&&op.completed,now)]);
      if(!done[0].meta.changes)return json({error:'Workout changed. Reopen it to use its latest version.'},409);return json(await readState(owner));
    }
    if(before?.workspaceRecordId&&op.action!=='create'){
      const record=await readWorkspaceRecord(owner,before.workspaceRecordId);if(!record)return json({error:'The linked record is unavailable. Please retry.'},503);
      if(op.action==='edit'&&(op.fields.goal!==before.goal||op.fields.kind!==recordTaskKind(record)||op.fields.applicationId))return json({error:'Change this record’s activity details from its Study or Research page.'},400);
      if(op.action==='complete'&&Boolean(before.completedAt)===op.completed)return json(await readState(owner));
      const nextTask:Task={...before,...(op.action==='edit'?op.fields:{completedAt:op.completed?now:null,completedDate:op.completed?day:null}),workspaceRecordId:before.workspaceRecordId,updatedAt:now,version:before.version+1};
      const nextRecord:WorkspaceRecord={...record,...(op.action==='edit'?{title:nextTask.title,plannedDate:nextTask.dueDate,estimatedMinutes:nextTask.minutes}:{status:op.completed?'Completed':'In progress',completionDate:op.completed?day:null}),updatedAt:now,version:record.version+1};
      if(nextRecord.sourceRecordId&&op.action==='edit'){const conflict=await db.prepare('SELECT id FROM workspace_records WHERE owner_id=? AND source_record_id=? AND followup_key=? AND id<>?').bind(owner,nextRecord.sourceRecordId,followupKey(nextRecord),nextRecord.id).first();if(conflict)return json({error:'A revision with this title and date already exists. Choose a different title or date.'},409);}
      const action=op.action==='edit'?'edited':op.completed?'completed':'reopened';
      const done=await db.batch([
        taskEvent(db,owner,nextTask,before,action,op.operationId,fingerprint,'EXISTS(SELECT 1 FROM tasks WHERE owner_id=? AND id=? AND version=?) AND EXISTS(SELECT 1 FROM workspace_records WHERE owner_id=? AND id=? AND version=?)',[owner,before.id,before.version,owner,record.id,record.version]),
        workspaceEvent(db,owner,record.id,'record',nextRecord,record,op.action==='edit'?'edited':op.completed?'completed':'completion_undone','record:'+op.operationId,fingerprint,now,'EXISTS(SELECT 1 FROM events WHERE owner_id=? AND operation_id=?)',[owner,op.operationId]),
        workspaceRecordUpdate(db,owner,nextRecord,op.operationId,'events'),taskUpdate(db,owner,nextTask,op.operationId),...awardStatements(db,owner,{table:'events',operationId:op.operationId},'workspace:'+record.id,record.kind==='session'?'session':record.kind,record.title,nextRecord.completionDate,record.status==='Completed',nextRecord.status==='Completed',now)
      ]);
      if(!done[0].meta.changes)return json({error:'The linked record changed. Reopen the task to use its latest version.'},409);
      return json(await readState(owner));
    }
    const applicationId=op.action==='complete'?before!.applicationId??null:op.fields.applicationId===undefined?before?.applicationId??null:op.fields.applicationId;
    const next:Task=op.action==='create'?{id:op.id,...op.fields,applicationId,applicationActionKey:null,completedAt:null,completedDate:null,createdAt:now,updatedAt:now,version:1}:{...before!,...(op.action==='edit'?op.fields:{completedAt:op.completed?now:null,completedDate:op.completed?day:null}),applicationId,applicationActionKey:before!.applicationId===applicationId?before!.applicationActionKey??null:null,updatedAt:now,version:before!.version+1};
    if(next.applicationId&&next.goal!=='phd')return json({error:'Only PhD tasks can link to an application.'},400);
    if(op.action==='edit'&&before!.completedAt&&(before!.goal!==next.goal||before!.kind!==next.kind||(before!.applicationId&&before!.applicationId!==next.applicationId)))return json({error:'Undo completion before changing the goal, activity type, or an existing application link.'},400);
    let app:Application|null=null,updatedApp:Application|null=null;
    if(next.applicationId){app=await readApplication(owner,next.applicationId);if(!app)return json({error:'Application not found.'},404);
      const justLinked=op.action==='edit'&&!before!.applicationId;
      if(next.kind==='application'&&next.completedAt&&!app.submissionDate&&(op.action==='complete'||justLinked))updatedApp={...app,submissionDate:justLinked?next.completedDate:day,submissionTaskId:next.id,stage:['Shortlisted','Preparing'].includes(app.stage)?'Submitted':app.stage,updatedAt:now,version:app.version+1};
      if(op.action==='complete'&&!op.completed&&app.submissionTaskId===next.id)updatedApp={...app,submissionDate:null,submissionTaskId:null,stage:app.stage==='Submitted'?'Preparing':app.stage,updatedAt:now,version:app.version+1};
    }
    if(op.action==='complete'&&Boolean(before!.completedAt)===op.completed)return json(await readState(owner));
    const action=op.action==='create'?'created':op.action==='edit'?'edited':op.completed?'completed':'reopened';
    const appGuard=app?' AND EXISTS(SELECT 1 FROM applications WHERE id=? AND owner_id=? AND version=?)':'',appParams=app?[app.id,owner,app.version]:[];
    const statements:D1PreparedStatement[]=[];
    if(op.action==='create'){
      statements.push(db.prepare(`INSERT INTO tasks (id,owner_id,title,goal,kind,due_date,minutes,completed_at,completed_date,created_at,updated_at,version,application_id,application_action_key,custom_points) SELECT ?,?,?,?,?,?,?,NULL,NULL,?,?,1,?,NULL,? WHERE 1${appGuard}`).bind(next.id,owner,next.title,next.goal,next.kind,next.dueDate,next.minutes,now,now,applicationId,next.customPoints??0,...appParams));
      statements.push(taskEvent(db,owner,next,null,action,op.operationId,fingerprint,'EXISTS(SELECT 1 FROM tasks WHERE id=? AND owner_id=?)',[next.id,owner]));
    }else{
      statements.push(taskEvent(db,owner,next,before,action,op.operationId,fingerprint,`EXISTS(SELECT 1 FROM tasks WHERE id=? AND owner_id=? AND version=?)${appGuard}`,[next.id,owner,op.version,...appParams]));
      if(updatedApp){statements.push(appEvent(db,owner,updatedApp,app,updatedApp.submissionDate?'submitted':'submission_undone','app:'+op.operationId,fingerprint,'EXISTS(SELECT 1 FROM events WHERE operation_id=? AND owner_id=?)',[op.operationId,owner]),applicationUpdate(db,owner,updatedApp,op.operationId,'events'));}
      statements.push(taskUpdate(db,owner,next,op.operationId));
    }
    if(op.action!=='create'){
      const proof={table:'events' as const,operationId:op.operationId};
      if(next.applicationId&&next.kind==='application'){
        if(!before!.applicationId)statements.push(...transferAward(db,owner,proof,'task:'+next.id,'application:'+next.applicationId,now));
        const application=updatedApp||app!;
        statements.push(...awardStatements(db,owner,proof,'application:'+application.id,'application',application.institution,application.submissionDate,Boolean(app!.submissionDate)||Boolean(!before!.applicationId&&before!.completedAt),Boolean(application.submissionDate),now));
      }else statements.push(...awardStatements(db,owner,proof,'task:'+next.id,pointKindForTask(next.kind),next.title,next.completedDate,Boolean(before!.completedAt),Boolean(next.completedAt),now,next.customPoints??0));
    }
    const done=await db.batch(statements);if(!done[0].meta.changes)return json({error:'A linked record changed. Reopen the task to use the latest version.'},409);
    return json(await readState(owner));
  }catch{logFailure('tasks.save');try{const d=await getDb().prepare('SELECT request FROM events WHERE operation_id=? AND owner_id=?').bind(op.operationId,owner).first<{request:string}>();if(d?.request===fingerprint)return json(await readState(owner));}catch{}return json({error:'We could not confirm this save. Your input is still here; please retry.'},503);}
}
