import {logFailure} from '@/lib/safe-log';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {getDb} from '@/db';
import {z} from 'zod';
import {indiaDate,type Task} from '@/lib/tasks';
import {dateSchema} from '@/lib/validation';
import {readState,json,isWriteRequest,taskColumns,taskEvent,taskUpdate} from '@/lib/storage';
import {motivationFields,rewardFields,habitFields} from '@/lib/motivation-validation';
import {type HabitRecord,type FocusSession,type Reward,timerRemaining} from '@/lib/motivation';
import {readHabit,readFocus,readReward,readMotivationSettings,habitTask,habitEvent,habitUpdate,proofSQL} from '@/lib/motivation-storage';
import {awardStatements,focusEligibility,workoutStatements} from '@/lib/points';
export const dynamic='force-dynamic';
const common={id:z.string().uuid(),operationId:z.string().uuid()},version=z.number().int().positive();
const operation=z.discriminatedUnion('action',[
 z.object({...common,action:z.literal('settings'),version:z.number().int().min(0),fields:motivationFields}),
 z.object({...common,action:z.literal('reward'),version:version.optional(),fields:rewardFields}),
 z.object({...common,action:z.literal('redeem'),rewardId:z.string().uuid(),rewardVersion:version}),
 z.object({...common,action:z.literal('refund'),version}),
 z.object({...common,action:z.literal('habit'),kind:z.enum(['phone','workout']),version:version.optional(),taskId:z.string().uuid().optional(),fields:habitFields}),
 z.object({...common,action:z.literal('focus-start'),minutes:z.number().int().min(1).max(240)}),
 z.object({...common,action:z.literal('focus'),version,command:z.enum(['pause','resume','cancel','confirm']),phoneFree:z.boolean().optional(),completionDate:dateSchema.optional()})
]);
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Sign in to view your private records.'},401);try{return json(await readState(user.userId));}catch{logFailure('motivation.read');return json({error:'Could not load your records. Please retry.'},503);}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Your session ended. Reload to sign in.'},401);if(!isWriteRequest(request,user.userId))return json({error:'Unsupported request.'},403);
 let parsed;try{const text=await request.text();if(text.length>30000)return json({error:'This record is too long.'},400);parsed=operation.safeParse(JSON.parse(text));}catch{return json({error:'Invalid record data.'},400);}if(!parsed.success)return json({error:parsed.error.issues[0]?.message||'Check these details.'},400);
 const op=parsed.data,owner=user.userId,now=new Date().toISOString(),day=indiaDate(),fingerprint=JSON.stringify(op),proof={table:'habit_events' as const,operationId:op.operationId};let db:D1Database|undefined;
 try{
 db=getDb();const duplicate=await db.prepare('SELECT request FROM habit_events WHERE owner_id=? AND operation_id=?').bind(owner,op.operationId).first<{request:string}>();if(duplicate)return duplicate.request===fingerprint?json(await readState(owner)):json({error:'This save was already processed. Reopen the editor for another change.'},409);
 const p=proofSQL(owner,proof);let statements:D1PreparedStatement[]=[];
 if(op.action==='settings'){
 const before=await readMotivationSettings(owner);if(before.version!==op.version)return json({error:'Settings changed. Reopen settings before saving.'},409);const next={...op.fields,version:before.version+1},guard=before.version?'EXISTS(SELECT 1 FROM motivation_settings WHERE owner_id=? AND version=?)':'NOT EXISTS(SELECT 1 FROM motivation_settings WHERE owner_id=?)',args=before.version?[owner,before.version]:[owner];
 statements=[habitEvent(db,owner,owner,'settings',next,before,'settings_updated',op.operationId,fingerprint,now,guard,args),before.version?db.prepare(`UPDATE motivation_settings SET data=?,version=?,updated_at=? WHERE owner_id=? AND version=? AND ${p.sql}`).bind(JSON.stringify(next),next.version,now,owner,before.version,...p.args):db.prepare(`INSERT INTO motivation_settings(owner_id,data,version,updated_at) SELECT ?,?,?,? WHERE ${p.sql}`).bind(owner,JSON.stringify(next),next.version,now,...p.args)];
 }else if(op.action==='reward'){
 const before=op.version?await readReward(owner,op.id):null;if(op.version&&!before)return json({error:'Reward not found.'},404);if(before&&before.version!==op.version)return json({error:'Reward changed. Reopen it before saving.'},409);
 const next:Reward={...op.fields,id:op.id,createdAt:before?.createdAt||now,updatedAt:now,version:(before?.version||0)+1};
 if(before)statements=[habitEvent(db,owner,op.id,'reward',next,before,next.archived&&!before.archived?'archived':'edited',op.operationId,fingerprint,now,'EXISTS(SELECT 1 FROM rewards WHERE owner_id=? AND id=? AND version=?)',[owner,op.id,before.version]),db.prepare(`UPDATE rewards SET name=?,description=?,cost=?,archived=?,updated_at=?,version=? WHERE owner_id=? AND id=? AND version=? AND ${p.sql}`).bind(next.name,next.description,next.cost,Number(next.archived),now,next.version,owner,next.id,before.version,...p.args)];
 else statements=[db.prepare('INSERT INTO rewards(id,owner_id,name,description,cost,archived,created_at,updated_at,version) VALUES(?,?,?,?,?,?,?,?,1)').bind(next.id,owner,next.name,next.description,next.cost,Number(next.archived),now,now),habitEvent(db,owner,next.id,'reward',next,null,'created',op.operationId,fingerprint,now)];
 }else if(op.action==='redeem'){
 const reward=await readReward(owner,op.rewardId);if(!reward)return json({error:'Reward not found.'},404);if(reward.archived)return json({error:'This reward is archived. Restore it before redeeming.'},400);if(reward.version!==op.rewardVersion)return json({error:'Reward changed. Review its current cost before redeeming.'},409);
 // The balance is checked within the transaction, before the immutable spend is inserted.
 statements=[db.prepare(`INSERT INTO redemptions(id,owner_id,reward_id,name,cost,refunded,created_at,local_date,version) SELECT ?,owner_id,id,name,cost,0,?,?,1 FROM rewards WHERE owner_id=? AND id=? AND version=? AND archived=0 AND COALESCE((SELECT sum(delta) FROM points_ledger WHERE owner_id=?),0)>=cost`).bind(op.id,now,day,owner,reward.id,reward.version,owner),habitEvent(db,owner,op.id,'redemption',{rewardId:reward.id,name:reward.name,cost:reward.cost},null,'redeemed',op.operationId,fingerprint,now,'EXISTS(SELECT 1 FROM redemptions WHERE owner_id=? AND id=?)',[owner,op.id]),db.prepare(`INSERT INTO points_ledger(event_key,owner_id,activity_key,action,delta,activity_date,label,happened_at,local_date) SELECT ?,owner_id,id,'redemption',-cost,local_date,name,?,? FROM redemptions WHERE owner_id=? AND id=? AND ${p.sql}`).bind(op.operationId+':spend',now,day,owner,op.id,...p.args)];
 }else if(op.action==='refund'){
 const before=await db.prepare('SELECT id,reward_id AS rewardId,name,cost,refunded,created_at AS createdAt,local_date AS localDate,version FROM redemptions WHERE owner_id=? AND id=?').bind(owner,op.id).first<{id:string;cost:number;version:number;refunded:number}>();if(!before)return json({error:'Redemption not found.'},404);if(before.refunded)return json(await readState(owner));if(before.version!==op.version)return json({error:'This redemption changed. Reload before undoing it.'},409);
 statements=[habitEvent(db,owner,op.id,'redemption',{...before,refunded:true,version:before.version+1},before,'refunded',op.operationId,fingerprint,now,'EXISTS(SELECT 1 FROM redemptions WHERE owner_id=? AND id=? AND version=? AND refunded=0)',[owner,op.id,op.version]),db.prepare(`INSERT INTO points_ledger(event_key,owner_id,activity_key,action,delta,activity_date,label,happened_at,local_date) SELECT ?,owner_id,id,'refund',cost,local_date,name,?,? FROM redemptions WHERE owner_id=? AND id=? AND ${p.sql}`).bind(op.operationId+':refund',now,day,owner,op.id,...p.args),db.prepare(`UPDATE redemptions SET refunded=1,version=version+1 WHERE owner_id=? AND id=? AND version=? AND ${p.sql}`).bind(owner,op.id,op.version,...p.args)];
 }else if(op.action==='habit'){
 const before=op.version?await readHabit(owner,op.id):null;if(op.version&&!before)return json({error:'Record not found.'},404);if(before&&(before.version!==op.version||before.kind!==op.kind))return json({error:'Record changed. Reopen it before saving.'},409);
 const f={...op.fields};if(op.kind==='phone'){if(f.status!=='Logged')return json({error:'Phone use must be logged manually.'},400);if(f.date>day)return json({error:'Phone use cannot be logged for a future day.'},400);f.completionDate=null;f.activityName='Distracting phone use';}
 else {if(f.status==='Logged')return json({error:'Choose Planned, Completed or Rest for a workout.'},400);if(f.status!=='Rest'&&(!f.activityName||f.minutes<1))return json({error:'Add an activity name and at least one minute.'},400);f.completionDate=f.status==='Completed'?f.completionDate||day:null;if(f.completionDate&&f.completionDate>day)return json({error:'Completion cannot be in the future.'},400);if(f.status==='Rest'){f.activityName='Planned rest day';f.minutes=0;}}
 const next:HabitRecord={...f,id:op.id,kind:op.kind,createdAt:before?.createdAt||now,updatedAt:now,version:(before?.version||0)+1},task=op.kind==='workout'&&before?await db.prepare(`SELECT ${taskColumns} FROM tasks WHERE owner_id=? AND habit_record_id=?`).bind(owner,op.id).first<Task>():null;
 if(before&&op.kind==='workout'&&!task)return json({error:'The linked task is unavailable. Please retry.'},503);if(!before&&op.kind==='workout'&&!op.taskId)return json({error:'A daily task identifier is required.'},400);
 const taskGuard=task?' AND EXISTS(SELECT 1 FROM tasks WHERE owner_id=? AND id=? AND version=?)':'',taskArgs=task?[owner,task.id,task.version]:[];
 if(before)statements=[habitEvent(db,owner,op.id,'habit',next,before,f.completionDate!==before.completionDate?'completion_corrected':'edited',op.operationId,fingerprint,now,'EXISTS(SELECT 1 FROM habit_records WHERE owner_id=? AND id=? AND version=?)'+taskGuard,[owner,op.id,before.version,...taskArgs]),habitUpdate(db,owner,next,proof)];
 else statements=[db.prepare('INSERT INTO habit_records(id,owner_id,kind,data,activity_date,completion_date,status,created_at,updated_at,version) VALUES(?,?,?,?,?,?,?,?,?,1)').bind(next.id,owner,next.kind,JSON.stringify(next),next.date,next.completionDate,next.status,now,now),habitEvent(db,owner,next.id,'habit',next,null,'created',op.operationId,fingerprint,now)];
 if(op.kind==='workout'){
 const nextTask=habitTask(next,task?.id||op.taskId!,now,task),taskProof='task:'+op.operationId;
 if(task)statements.push(taskEvent(db,owner,nextTask,task,'edited',taskProof,fingerprint,p.sql,p.args),taskUpdate(db,owner,nextTask,taskProof));
 else statements.push(db.prepare(`INSERT INTO tasks(id,owner_id,title,goal,kind,due_date,minutes,completed_at,completed_date,created_at,updated_at,version,habit_record_id) SELECT ?,?,?,?,?,?,?,?,?,?,?,1,? WHERE ${p.sql}`).bind(nextTask.id,owner,nextTask.title,nextTask.goal,nextTask.kind,nextTask.dueDate,nextTask.minutes,nextTask.completedAt,nextTask.completedDate,now,now,next.id,...p.args),taskEvent(db,owner,nextTask,null,'created',taskProof,fingerprint,p.sql,p.args));
 statements.push(...workoutStatements(db,owner,proof,before?.status==='Completed'?before.completionDate:null,next.status==='Completed'?next.completionDate:null,before?.status!=='Completed'&&next.status==='Completed',now));
 }
 }else if(op.action==='focus-start'){
 const active=await db.prepare("SELECT id FROM focus_sessions WHERE owner_id=? AND active_key='active'").bind(owner).first();if(active)return json({...await readState(owner),reused:true});
 const duration=op.minutes*60000,next:FocusSession={id:op.id,durationMs:duration,remainingMs:duration,endAt:new Date(Date.now()+duration).toISOString(),status:'Running',phoneFree:null,completionDate:null,createdAt:now,updatedAt:now,version:1};
 statements=[db.prepare("INSERT INTO focus_sessions(id,owner_id,duration_ms,remaining_ms,end_at,status,phone_free,completion_date,active_key,created_at,updated_at,version) VALUES(?,?,?,?,?,'Running',NULL,NULL,'active',?,?,1)").bind(next.id,owner,duration,duration,next.endAt,now,now),habitEvent(db,owner,next.id,'focus',next,null,'started',op.operationId,fingerprint,now)];
 }else {
 const before=await readFocus(owner,op.id);if(!before)return json({error:'Focus session not found.'},404);if(before.version!==op.version)return json({error:'Timer changed. Use the current timer controls.'},409);
 let next:FocusSession={...before,updatedAt:now,version:before.version+1};
 if(op.command==='pause'){
 if(before.status!=='Running')return json({error:'Only a running timer can be paused.'},400);const remaining=timerRemaining(before);next={...next,remainingMs:remaining,endAt:remaining?null:before.endAt,status:remaining?'Paused':'Finished',completionDate:remaining?null:indiaDate(new Date(before.endAt!))};
 }else if(op.command==='resume'){
 if(before.status!=='Paused')return json({error:'Only a paused timer can be resumed.'},400);next={...next,status:'Running',endAt:new Date(Date.now()+before.remainingMs).toISOString()};
 }else if(op.command==='cancel'){
 if(before.phoneFree!==null||before.status==='Cancelled')return json({error:'This session has ended. Correct its confirmation instead.'},400);next={...next,status:'Cancelled',endAt:null,phoneFree:null,completionDate:null};
 }else {
 if(op.phoneFree===undefined)return json({error:'Confirm whether this session was phone-free.'},400);
 if(before.status==='Cancelled'||before.status==='Paused'||before.status==='Running'&&timerRemaining(before)>0)return json({error:'Let the timer finish before confirming this session.'},400);
 const completionDate=op.completionDate||before.completionDate||(before.endAt?indiaDate(new Date(before.endAt)):day);if(completionDate>day)return json({error:'Completion cannot be in the future.'},400);
 next={...next,status:'Finished',remainingMs:0,phoneFree:op.phoneFree,completionDate};
 }
 const active=next.status==='Cancelled'||next.phoneFree!==null?null:'active';
 statements=[habitEvent(db,owner,next.id,'focus',next,before,op.command,op.operationId,fingerprint,now,'EXISTS(SELECT 1 FROM focus_sessions WHERE owner_id=? AND id=? AND version=?)',[owner,next.id,before.version]),db.prepare(`UPDATE focus_sessions SET remaining_ms=?,end_at=?,status=?,phone_free=?,completion_date=?,active_key=?,updated_at=?,version=? WHERE owner_id=? AND id=? AND version=? AND ${p.sql}`).bind(next.remainingMs,next.endAt,next.status,next.phoneFree===null?null:Number(next.phoneFree),next.completionDate,active,now,next.version,owner,next.id,before.version,...p.args)];
 if(op.command==='confirm'){
 const dateCorrection=before.phoneFree===true&&before.completionDate!==next.completionDate;
 // A date correction can move or restore an earlier award, but cannot backfill a capped session.
 const keep=dateCorrection?` AND (EXISTS(SELECT 1 FROM points_awards WHERE owner_id='${owner.replaceAll("'","''")}' AND activity_key='focus:${next.id}' AND active=1) OR EXISTS(SELECT 1 FROM points_ledger WHERE owner_id='${owner.replaceAll("'","''")}' AND activity_key='focus:${next.id}' AND action='award'))`:'';
 statements.push(...awardStatements(db,owner,proof,'focus:'+next.id,'focus','Phone-free focus',next.completionDate,before.phoneFree===true,next.phoneFree===true,now,0,focusEligibility(owner,'focus:'+next.id,next.completionDate!)+keep));
 }
 }
 const done=await db.batch(statements);if(!done[0].meta.changes)return json({error:op.action==='redeem'?'You need more available points for this reward. Your balance may have changed in another tab.':'This record changed. Reload and reopen it before saving.'},409);
 return json(await readState(owner));
 }catch{logFailure('motivation.save');try{const duplicate=await db?.prepare('SELECT request FROM habit_events WHERE owner_id=? AND operation_id=?').bind(owner,op.operationId).first<{request:string}>();if(duplicate?.request===fingerprint)return json(await readState(owner));if(op.action==='focus-start'&&await db?.prepare("SELECT id FROM focus_sessions WHERE owner_id=? AND active_key='active'").bind(owner).first())return json({...await readState(owner),reused:true});}catch{}return json({error:'We could not confirm this save. Your input is still here; please retry.'},503);}
}
