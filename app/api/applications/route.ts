import {logFailure} from '@/lib/safe-log';
import {repairOpportunityOwnership} from '@/lib/opportunity-ownership';
import {awardStatements,transferAward} from '@/lib/points';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {getDb} from '@/db';
import {indiaDate,type Task} from '@/lib/tasks';
import {actionKey,needsPreparation,type Application} from '@/lib/applications';
import {applicationFields,dateSchema} from '@/lib/validation';
import {readApplication,readTask,readState,taskColumns,json,isWriteRequest,appEvent,taskEvent,applicationUpdate,taskUpdate} from '@/lib/storage';
import {z} from 'zod';
export const dynamic='force-dynamic';
const operation=z.discriminatedUnion('action',[
  z.object({action:z.literal('create'),operationId:z.string().uuid(),id:z.string().uuid(),fields:applicationFields,existingTaskId:z.string().uuid().optional(),taskVersion:z.number().int().positive().optional()}),
  z.object({action:z.literal('edit'),operationId:z.string().uuid(),id:z.string().uuid(),version:z.number().int().positive(),fields:applicationFields}),
  z.object({action:z.literal('plan'),operationId:z.string().uuid(),id:z.string().uuid(),version:z.number().int().positive(),taskId:z.string().uuid(),dueDate:dateSchema,minutes:z.number().int().min(1).max(1440),kind:z.enum(['preparation','application']).default('preparation')})
]);
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Sign in to view your applications.'},401);try{await repairOpportunityOwnership(user);return json(await readState(user.userId));}catch{logFailure('applications.read');return json({error:'Could not load applications. Please retry.'},503);}}
export async function POST(request:Request){
  const user=await getChatGPTUser();if(!user)return json({error:'Your session ended. Reload to sign in.'},401);if(!isWriteRequest(request))return json({error:'Unsupported request.'},403);
  let result;try{const text=await request.text();if(text.length>40000)return json({error:'Application details are too long.'},400);result=operation.safeParse(JSON.parse(text));}catch{return json({error:'Invalid application data.'},400);}
  if(!result.success)return json({error:result.error.issues[0]?.message||'Check your application details.'},400);
  const op=result.data,owner=user.userId,now=new Date().toISOString(),fingerprint=JSON.stringify(op);let linkedTaskId:string|undefined;
  try{
    const db=getDb(),duplicate=await db.prepare('SELECT request FROM application_events WHERE owner_id=? AND operation_id=?').bind(owner,op.operationId).first<{request:string}>();
    if(duplicate)return duplicate.request===fingerprint?json({...await readState(owner),...(op.action==='plan'?{linkedTaskId:op.taskId}: {})}):json({error:'This save was already processed. Close and reopen the editor for another change.'},409);
    let before:Application|null=null;
    if(op.action!=='create'){
      before=await readApplication(owner,op.id);if(!before)return json({error:'Application not found.'},404);
      if(op.action==='plan'){
        if(!needsPreparation(before))return json({error:'This application is archived. Undo submission or reopen its stage before planning.'},400);
        if(!before.nextAction.trim())return json({error:'Add a next action before planning a task.'},400);
        const existing=await db.prepare('SELECT id FROM tasks WHERE owner_id=? AND application_id=? AND application_action_key=?').bind(owner,op.id,actionKey(before.nextAction)).first<{id:string}>();
        if(existing)return json({...await readState(owner),linkedTaskId:existing.id,reused:true});
      }
      if(before.version!==op.version)return json({error:'This application changed in another tab. Your latest records have been loaded; reopen it before saving.'},409);
    }
    if(op.action!=='plan'&&op.fields.submissionDate&&op.fields.submissionDate>indiaDate())return json({error:'A submission date cannot be in the future.'},400);
    if(op.action==='create'){
      let previousTask:Task|null=null;
      if(op.existingTaskId){previousTask=await readTask(owner,op.existingTaskId);if(!previousTask)return json({error:'Task not found.'},404);if(previousTask.goal!=='phd'||previousTask.applicationId)return json({error:'Choose an unlinked PhD task.'},400);if(previousTask.version!==op.taskVersion)return json({error:'This task changed. Reopen the application form to use its latest version.'},409);}
      const next:Application={id:op.id,...op.fields,opportunity:op.fields.opportunity,submissionTaskId:previousTask?.kind==='application'&&previousTask.completedAt&&previousTask.completedDate===op.fields.submissionDate?previousTask.id:null,createdAt:now,updatedAt:now,version:1};
      const guard=previousTask?'EXISTS(SELECT 1 FROM tasks WHERE id=? AND owner_id=? AND version=? AND application_id IS NULL)':'1',guardArgs=previousTask?[previousTask.id,owner,previousTask.version]:[];
      const insert=db.prepare(`INSERT INTO applications (id,owner_id,institution,country,project_title,supervisor,link,deadline,notes,next_action,stage,checklist,submission_date,submission_task_id,created_at,updated_at,version,opportunity) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,? WHERE ${guard}`).bind(next.id,owner,next.institution,next.country,next.projectTitle,next.supervisor,next.link,next.deadline,next.notes,next.nextAction,next.stage,JSON.stringify(next.checklist),next.submissionDate,next.submissionTaskId,now,now,JSON.stringify(next.opportunity||{}),...guardArgs);
      const statements=[insert,appEvent(db,owner,next,null,'created',op.operationId,fingerprint,'EXISTS(SELECT 1 FROM applications WHERE id=? AND owner_id=?)',[next.id,owner])];
      if(previousTask){const nextTask:Task={...previousTask,applicationId:next.id,applicationActionKey:null,updatedAt:now,version:previousTask.version+1};const proof='task:'+op.operationId;statements.push(taskEvent(db,owner,nextTask,previousTask,'edited',proof,fingerprint,'EXISTS(SELECT 1 FROM application_events WHERE operation_id=? AND owner_id=?)',[op.operationId,owner]),taskUpdate(db,owner,nextTask,proof));}
      const pointProof={table:'application_events' as const,operationId:op.operationId};
      if(previousTask?.kind==='application')statements.push(...transferAward(db,owner,pointProof,'task:'+previousTask.id,'application:'+next.id,now));
      statements.push(...awardStatements(db,owner,pointProof,'application:'+next.id,'application',next.institution,next.submissionDate,previousTask?.kind==='application'&&Boolean(previousTask.completedAt),Boolean(next.submissionDate),now));
      const done=await db.batch(statements);if(!done[0].meta.changes)return json({error:'The linked task changed. Reopen the application form.'},409);
    }else if(op.action==='edit'){
      const next:Application={...before!,...op.fields,opportunity:op.fields.opportunity??before!.opportunity,submissionTaskId:op.fields.submissionDate===before!.submissionDate?before!.submissionTaskId:null,updatedAt:now,version:before!.version+1};
      if(next.deadline!==before!.deadline)next.opportunity={...next.opportunity,deadlineEdited:true};
      if(next.deadline!==before!.deadline&&next.opportunity?.closingAt&&next.opportunity.closingAt===before!.opportunity?.closingAt)next.opportunity={...next.opportunity,closingAt:null,closingLabel:'',closingTimezone:'',closingVerification:'unverified',deadlineEdited:true};
      const action=next.submissionDate!==before!.submissionDate?(next.submissionDate?(before!.submissionDate?'submission_corrected':'submitted'):'submission_undone'):next.stage!==before!.stage?'stage_changed':JSON.stringify(next.checklist)!==JSON.stringify(before!.checklist)?'checklist_updated':'edited';
      const linked=next.submissionDate!==before!.submissionDate?(await db.prepare(`SELECT ${taskColumns} FROM tasks WHERE owner_id=? AND application_id=? AND kind='application'`).bind(owner,next.id).all<Task>()).results:[];
      const taskGuards=linked.map(()=> ' AND EXISTS(SELECT 1 FROM tasks WHERE id=? AND owner_id=? AND version=?)').join('');
      const statements=[appEvent(db,owner,next,before,action,op.operationId,fingerprint,'EXISTS(SELECT 1 FROM applications WHERE id=? AND owner_id=? AND version=?)'+taskGuards,[op.id,owner,op.version,...linked.flatMap(t=>[t.id,owner,t.version])]),applicationUpdate(db,owner,next,op.operationId)];
      for(const task of linked){
        const updated:Task={...task,completedAt:next.submissionDate?(task.completedAt||now):null,completedDate:next.submissionDate,updatedAt:now,version:task.version+1};
        const proof='application-sync:'+op.operationId+':'+task.id;
        statements.push(taskEvent(db,owner,updated,task,next.submissionDate?(task.completedAt?'edited':'completed'):'reopened',proof,fingerprint,'EXISTS(SELECT 1 FROM application_events WHERE owner_id=? AND operation_id=?)',[owner,op.operationId]),taskUpdate(db,owner,updated,proof));
      }
      statements.push(...awardStatements(db,owner,{table:'application_events',operationId:op.operationId},'application:'+next.id,'application',next.institution,next.submissionDate,Boolean(before!.submissionDate),Boolean(next.submissionDate),now));
      const done=await db.batch(statements);if(!done[0].meta.changes)return json({error:'This application or its task changed. Reopen it to use its latest version.'},409);
    }else{
      const next:Application={...before!,updatedAt:now,version:before!.version+1};
      const task:Task={id:op.taskId,title:before!.nextAction,goal:'phd',kind:op.kind,dueDate:op.dueDate,minutes:op.minutes,completedAt:null,completedDate:null,applicationId:op.id,applicationActionKey:actionKey(before!.nextAction),createdAt:now,updatedAt:now,version:1};
      const proof='task:'+op.operationId,guard='EXISTS(SELECT 1 FROM application_events WHERE operation_id=? AND owner_id=?)';
      const done=await db.batch([
        appEvent(db,owner,next,before,'task_planned',op.operationId,fingerprint,'EXISTS(SELECT 1 FROM applications WHERE id=? AND owner_id=? AND version=?)',[op.id,owner,op.version]),
        db.prepare(`INSERT INTO tasks (id,owner_id,title,goal,kind,due_date,minutes,completed_at,completed_date,created_at,updated_at,version,application_id,application_action_key) SELECT ?,?,?,?,?,?,?,NULL,NULL,?,?,1,?,? WHERE ${guard}`).bind(task.id,owner,task.title,task.goal,task.kind,task.dueDate,task.minutes,now,now,task.applicationId,task.applicationActionKey,op.operationId,owner),
        taskEvent(db,owner,task,null,'created',proof,fingerprint,guard,[op.operationId,owner]),applicationUpdate(db,owner,next,op.operationId)
      ]);
      if(!done[0].meta.changes)return json({error:'This application changed. Reopen the planner.'},409);linkedTaskId=task.id;
    }
    return json({...await readState(owner),...(linkedTaskId?{linkedTaskId}: {})});
  }catch{logFailure('applications.save');try{const duplicate=await getDb().prepare('SELECT request FROM application_events WHERE owner_id=? AND operation_id=?').bind(owner,op.operationId).first<{request:string}>();if(duplicate?.request===fingerprint)return json({...await readState(owner),...(op.action==='plan'?{linkedTaskId:op.taskId}: {})});if(op.action==='plan'){const app=await readApplication(owner,op.id);if(app){const existing=await getDb().prepare('SELECT id FROM tasks WHERE owner_id=? AND application_id=? AND application_action_key=?').bind(owner,op.id,actionKey(app.nextAction)).first<{id:string}>();if(existing)return json({...await readState(owner),linkedTaskId:existing.id,reused:true});}}}catch{}return json({error:'We could not confirm this save. Your input is still here; please retry.'},503);}
}
