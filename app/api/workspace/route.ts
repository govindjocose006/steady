import {logFailure} from '@/lib/safe-log';
import {awardStatements,transferAward} from '@/lib/points';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {getDb} from '@/db';
import {z} from 'zod';
import {indiaDate,type Task} from '@/lib/tasks';
import {workspaceFields,settingsFields} from '@/lib/workspace-validation';
import {type WorkspaceRecord,type WorkFields,type CatalogItem,type WorkspaceSettings,defaultSettings,recordTaskKind,workFields} from '@/lib/workspace';
import {readState,readTask,json,isWriteRequest,taskColumns,taskEvent,taskUpdate} from '@/lib/storage';
import {readWorkspaceRecord,readCatalogItem,workspaceEvent,workspaceRecordUpdate,followupKey,taskFromRecord} from '@/lib/workspace-storage';
export const dynamic='force-dynamic';
const common={operationId:z.string().uuid(),id:z.string().uuid()};
const operation=z.discriminatedUnion('action',[
 z.object({...common,action:z.literal('create'),kind:z.enum(['lecture','session','research']),fields:workspaceFields,taskId:z.string().uuid(),existingTaskId:z.string().uuid().optional(),taskVersion:z.number().int().positive().optional()}),
 z.object({...common,action:z.literal('edit'),version:z.number().int().positive(),fields:workspaceFields}),
 z.object({...common,action:z.literal('status'),version:z.number().int().positive(),status:z.enum(['Planned','In progress','Completed'])}),
 z.object({...common,action:z.literal('catalog'),kind:z.enum(['subject','topic','project','category']),name:z.string().trim().min(1,'Enter a name.').max(180),parentId:z.string().uuid().nullable().default(null),version:z.number().int().positive().optional()}),
 z.object({...common,action:z.literal('settings'),version:z.number().int().min(0),fields:settingsFields}),
 z.object({...common,action:z.literal('categories'),items:z.array(z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(180)})).min(1).max(5)})
]);
async function references(owner:string,kind:WorkspaceRecord['kind'],fields:WorkFields){
 for(const [id,expected] of (kind==='research'?[[fields.projectId,'project'],[fields.categoryId,'category']]:[[fields.subjectId,'subject'],[fields.topicId,'topic']]) as [string|null,CatalogItem['kind']][]){if(!id)continue;const item=await readCatalogItem(owner,id);if(!item||item.kind!==expected)return 'Choose a valid '+expected+'.';if(expected==='topic'&&item.parentId!==fields.subjectId)return 'Choose a topic belonging to the selected subject.';}
 if(fields.sourceRecordId){const source=await readWorkspaceRecord(owner,fields.sourceRecordId);if(!source||source.kind==='research'||kind!=='session')return 'Choose a study record for this follow-up.';}
 return null;
}
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Sign in to view your private workspace.'},401);try{return json(await readState(user.userId));}catch{logFailure('workspace.read');return json({error:'Could not load your workspace. Please retry.'},503);}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Your session ended. Reload to sign in.'},401);if(!isWriteRequest(request,user.userId))return json({error:'Unsupported request.'},403);
 let result;try{const text=await request.text();if(text.length>50000)return json({error:'This record is too long.'},400);result=operation.safeParse(JSON.parse(text));}catch{return json({error:'Invalid record data.'},400);}if(!result.success)return json({error:result.error.issues[0]?.message||'Check the record details.'},400);
 const op=result.data,owner=user.userId,now=new Date().toISOString(),fingerprint=JSON.stringify(op);let db:D1Database|undefined;
 try{
 db=getDb();
 const duplicate=await db.prepare('SELECT request FROM workspace_events WHERE owner_id=? AND operation_id=?').bind(owner,op.operationId).first<{request:string}>();
 if(duplicate)return duplicate.request===fingerprint?json(await readState(owner)):json({error:'This save was already processed. Reopen the editor for another change.'},409);
 if(op.action==='settings'){
 const row=await db.prepare('SELECT data,version FROM workspace_settings WHERE owner_id=?').bind(owner).first<{data:string;version:number}>();const before:WorkspaceSettings=row?{...defaultSettings,...JSON.parse(row.data),version:row.version}:defaultSettings;if(before.version!==op.version)return json({error:'Settings changed. Reopen settings to use the latest values.'},409);
 const next={...op.fields,version:before.version+1};const guard=row?'EXISTS(SELECT 1 FROM workspace_settings WHERE owner_id=? AND version=?)':'NOT EXISTS(SELECT 1 FROM workspace_settings WHERE owner_id=?)',args=row?[owner,op.version]:[owner];
 const event=workspaceEvent(db,owner,owner,'settings',next,before,'settings_updated',op.operationId,fingerprint,now,guard,args);
 const write=row?db.prepare('UPDATE workspace_settings SET data=?,version=?,updated_at=? WHERE owner_id=? AND version=? AND EXISTS(SELECT 1 FROM workspace_events WHERE owner_id=? AND operation_id=?)').bind(JSON.stringify(next),next.version,now,owner,op.version,owner,op.operationId):db.prepare('INSERT INTO workspace_settings(owner_id,data,version,updated_at) SELECT ?,?,?,? WHERE EXISTS(SELECT 1 FROM workspace_events WHERE owner_id=? AND operation_id=?)').bind(owner,JSON.stringify(next),next.version,now,owner,op.operationId);
 const done=await db.batch([event,write]);if(!done[0].meta.changes)return json({error:'Settings changed. Reopen settings before saving.'},409);
 }else if(op.action==='categories'){
 if(new Set(op.items.map(i=>i.id)).size!==op.items.length)return json({error:'Category IDs must be unique.'},400);
 const statements:D1PreparedStatement[]=[];for(const item of op.items){statements.push(db.prepare('INSERT INTO workspace_catalog(id,owner_id,kind,name,parent_id,created_at,updated_at,version) SELECT ?,?,?,?,NULL,?,?,1 WHERE NOT EXISTS(SELECT 1 FROM workspace_catalog WHERE owner_id=? AND kind=? AND lower(name)=lower(?))').bind(item.id,owner,'category',item.name,now,now,owner,'category',item.name));}
 statements.push(workspaceEvent(db,owner,op.id,'catalog',op.items,null,'categories_added',op.operationId,fingerprint,now));await db.batch(statements);
 }else if(op.action==='catalog'){
 const before=op.version?await readCatalogItem(owner,op.id):null;if(op.version&&!before)return json({error:'This item was not found.'},404);if(before&&(before.version!==op.version||before.kind!==op.kind))return json({error:'This item changed. Reopen the editor.'},409);
 if(op.kind==='topic'){if(!op.parentId)return json({error:'Choose a subject for this topic.'},400);const parent=await readCatalogItem(owner,op.parentId);if(parent?.kind!=='subject')return json({error:'Subject not found.'},404);if(before&&before.parentId!==op.parentId){const linked=await db.prepare("SELECT id FROM workspace_records WHERE owner_id=? AND json_extract(data,'$.topicId')=? LIMIT 1").bind(owner,op.id).first();if(linked)return json({error:'This topic is in use. Keep its subject, or create a new topic under the other subject.'},400);}}
 else if(op.parentId)return json({error:'Only topics have a parent subject.'},400);
 const next:CatalogItem={id:op.id,kind:op.kind,name:op.name,parentId:op.parentId,createdAt:before?.createdAt||now,updatedAt:now,version:(before?.version||0)+1};
 let done;if(before){done=await db.batch([workspaceEvent(db,owner,next.id,'catalog',next,before,'catalog_edited',op.operationId,fingerprint,now,'EXISTS(SELECT 1 FROM workspace_catalog WHERE id=? AND owner_id=? AND version=?)',[op.id,owner,op.version!]),db.prepare('UPDATE workspace_catalog SET name=?,parent_id=?,updated_at=?,version=? WHERE id=? AND owner_id=? AND version=? AND EXISTS(SELECT 1 FROM workspace_events WHERE owner_id=? AND operation_id=?)').bind(next.name,next.parentId,now,next.version,op.id,owner,op.version,owner,op.operationId)]);}else{done=await db.batch([db.prepare('INSERT INTO workspace_catalog(id,owner_id,kind,name,parent_id,created_at,updated_at,version) VALUES(?,?,?,?,?,?,?,1)').bind(next.id,owner,next.kind,next.name,next.parentId,now,now),workspaceEvent(db,owner,next.id,'catalog',next,null,'catalog_created',op.operationId,fingerprint,now)]);}if(!done[0].meta.changes)return json({error:'This item changed. Reopen the editor.'},409);
 }else{
 const before=op.action!=='create'?await readWorkspaceRecord(owner,op.id):null;if(op.action!=='create'&&!before)return json({error:'Record not found.'},404);if(before&&op.action!=='create'&&before.version!==op.version)return json({error:'This record changed. Reopen it before saving.'},409);
 const kind=before?.kind||('kind' in op?op.kind:'lecture');const fields=op.action==='status'?{...workFields(before!),status:op.status,completionDate:op.status==='Completed'?indiaDate():null}:{...op.fields};const referenceError=await references(owner,kind,fields);if(referenceError)return json({error:referenceError},400);
 let previousTask:Task|null=null;
 if(before)previousTask=await db.prepare(`SELECT ${taskColumns} FROM tasks WHERE owner_id=? AND workspace_record_id=?`).bind(owner,op.id).first<Task>();
 else if(op.action==='create'&&op.existingTaskId){previousTask=await readTask(owner,op.existingTaskId);if(!previousTask)return json({error:'Task not found.'},404);if(previousTask.workspaceRecordId||previousTask.applicationId||previousTask.kind!==recordTaskKind({kind,sessionType:fields.sessionType})||previousTask.goal!==(kind==='research'?'research':'net'))return json({error:'Choose a matching unlinked task.'},400);if(previousTask.version!==op.taskVersion)return json({error:'This task changed. Reopen the record form.'},409);}
 if(before&&!previousTask)return json({error:'The linked daily task is unavailable. Please retry.'},503);
 if(fields.status==='Completed')fields.completionDate=fields.completionDate||previousTask?.completedDate||indiaDate();else fields.completionDate=null;
 if(fields.completionDate&&fields.completionDate>indiaDate())return json({error:'A completion date cannot be in the future.'},400);
 const next:WorkspaceRecord={...fields,id:op.id,kind,createdAt:before?.createdAt||now,updatedAt:now,version:(before?.version||0)+1};
 if(next.sourceRecordId&&op.action==='edit'){const conflicting=await db.prepare('SELECT id FROM workspace_records WHERE owner_id=? AND source_record_id=? AND followup_key=? AND id<>?').bind(owner,next.sourceRecordId,followupKey(next),next.id).first();if(conflicting)return json({error:'A revision with this title and date is already scheduled. Edit that revision, or choose a different title or date.'},409);}
 if(next.sourceRecordId&&op.action==='create'){const reused=await db.prepare('SELECT id FROM workspace_records WHERE owner_id=? AND source_record_id=? AND followup_key=?').bind(owner,next.sourceRecordId,followupKey(next)).first<{id:string}>();if(reused)return json({...await readState(owner),reused:true,workspaceRecordId:reused.id});}
 const task=taskFromRecord(next,previousTask?.id||('taskId' in op?op.taskId:crypto.randomUUID()),now,previousTask),proof='work:'+op.operationId,statements:D1PreparedStatement[]=[];
 const taskGuard=previousTask?' AND EXISTS(SELECT 1 FROM tasks WHERE id=? AND owner_id=? AND version=?)':'',taskArgs=previousTask?[previousTask.id,owner,previousTask.version]:[];
 if(before){const action=next.status!==before.status?(next.status==='Completed'?'completed':before.status==='Completed'?'completion_undone':'resumed'):next.completionDate!==before.completionDate?'completion_corrected':'edited';statements.push(workspaceEvent(db,owner,next.id,'record',next,before,action,op.operationId,fingerprint,now,'EXISTS(SELECT 1 FROM workspace_records WHERE id=? AND owner_id=? AND version=?)'+taskGuard,[next.id,owner,before.version,...taskArgs]),workspaceRecordUpdate(db,owner,next,op.operationId));}
 else{statements.push(db.prepare('INSERT INTO workspace_records(id,owner_id,kind,data,source_record_id,followup_key,created_at,updated_at,version) SELECT ?,?,?,?,?,?,?,?,1 WHERE TRUE'+taskGuard).bind(next.id,owner,next.kind,JSON.stringify(next),next.sourceRecordId,followupKey(next),now,now,...taskArgs),workspaceEvent(db,owner,next.id,'record',next,null,'created',op.operationId,fingerprint,now,'EXISTS(SELECT 1 FROM workspace_records WHERE id=? AND owner_id=?)',[next.id,owner]));}
 const proofGuard='EXISTS(SELECT 1 FROM workspace_events WHERE owner_id=? AND operation_id=?)';
 if(previousTask)statements.push(taskEvent(db,owner,task,previousTask,'edited',proof,fingerprint,proofGuard,[owner,op.operationId]),taskUpdate(db,owner,task,proof));
 else statements.push(db.prepare('INSERT INTO tasks(id,owner_id,title,goal,kind,due_date,minutes,completed_at,completed_date,created_at,updated_at,version,workspace_record_id) SELECT ?,?,?,?,?,?,?,?,?,?,?,1,? WHERE '+proofGuard).bind(task.id,owner,task.title,task.goal,task.kind,task.dueDate,task.minutes,task.completedAt,task.completedDate,now,now,next.id,owner,op.operationId),taskEvent(db,owner,task,null,'created',proof,fingerprint,proofGuard,[owner,op.operationId]));
 const pointProof={table:'workspace_events' as const,operationId:op.operationId};
 if(!before&&previousTask)statements.push(...transferAward(db,owner,pointProof,'task:'+previousTask.id,'workspace:'+next.id,now));
 statements.push(...awardStatements(db,owner,pointProof,'workspace:'+next.id,next.kind==='session'?'session':next.kind,next.title,next.completionDate,before?before.status==='Completed':Boolean(previousTask?.completedAt),next.status==='Completed',now));
 const done=await db.batch(statements);if(!done[0].meta.changes)return json({error:'A linked record changed. Reopen the editor before saving.'},409);
 }
 return json(await readState(owner));
 }catch{logFailure('workspace.save');try{if(!db)throw new Error('Storage unavailable');const duplicate=await db.prepare('SELECT request FROM workspace_events WHERE owner_id=? AND operation_id=?').bind(owner,op.operationId).first<{request:string}>();if(duplicate?.request===fingerprint)return json(await readState(owner));if(op.action==='create'&&op.fields.sourceRecordId){const existing=await db.prepare('SELECT id FROM workspace_records WHERE owner_id=? AND source_record_id=? AND followup_key=?').bind(owner,op.fields.sourceRecordId,followupKey(op.fields)).first<{id:string}>();if(existing)return json({...await readState(owner),reused:true,workspaceRecordId:existing.id});}}catch{}return json({error:'We could not confirm this save. Your input is still here; please retry.'},503);}
}
