import {logFailure} from '@/lib/safe-log';
import {z} from 'zod';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {getDb} from '@/db';
import {readState,json,isWriteRequest} from '@/lib/storage';
import {dateSchema} from '@/lib/validation';
import {activityKey,activeTask,emptyPlan,weekStart,type DayPlan,type DayTemplate,type WeeklyReview} from '@/lib/planning';
import type {State} from '@/lib/tasks';
export const dynamic='force-dynamic';
const ids=z.array(z.string().uuid()).max(100).refine(a=>new Set(a).size===a.length,'Choose each task once.');
const minutes=z.number().int().min(0).max(1440).nullable();
const planFields=z.object({availableMinutes:minutes,taskIds:ids,priorityIds:ids.refine(a=>a.length<=3,'Choose up to three main priorities.'),decisions:z.record(z.string().uuid(),z.object({kind:z.enum(['pending','rescheduled']),date:dateSchema.optional()})).default({})});
const base={operationId:z.string().uuid(),version:z.number().int().min(0)};
const operation=z.discriminatedUnion('action',[
 z.object({...base,action:z.literal('plan'),date:dateSchema,fields:planFields}),
 z.object({...base,action:z.literal('template'),id:z.string().uuid(),fields:z.object({name:z.string().trim().min(1).max(80),availableMinutes:minutes,taskIds:ids,priorityIds:ids.refine(a=>a.length<=3)})}),
 z.object({...base,action:z.literal('apply'),date:dateSchema,templateId:z.string().uuid(),templateVersion:z.number().int().positive()}),
 z.object({...base,action:z.literal('resolve'),date:dateSchema,taskId:z.string().uuid(),decision:z.enum(['pending','rescheduled']),targetDate:dateSchema.optional(),targetVersion:z.number().int().min(0).optional()}),
 z.object({...base,action:z.literal('review'),weekStart:dateSchema,fields:z.object({wentWell:z.string().max(3000),obstacles:z.string().max(3000),change:z.string().max(3000),priorityIds:ids})})
]);
export async function GET(){const user=await getChatGPTUser();if(!user)return json({error:'Sign in to view your plans.'},401);try{return json(await readState(user.userId));}catch{return json({error:'Could not load plans.'},503);}}
function selected(ids:string[],s:State,existing:string[]=[]){const seen=new Set<string>();return ids.every(id=>{const t=s.tasks.find(t=>t.id===id);if(!t||(!existing.includes(id)&&(!activeTask(t,s)||!!t.completedAt)))return false;const key=activityKey(t);if(seen.has(key))return false;seen.add(key);return true;});}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Sign in to save your plan.'},401);if(!isWriteRequest(request))return json({error:'Unsupported request.'},403);
 let input;try{const body=await request.text();if(body.length>35000)return json({error:'Plan is too long.'},400);input=operation.safeParse(JSON.parse(body));}catch{return json({error:'Invalid planning data.'},400);}if(!input.success)return json({error:input.error.issues[0]?.message||'Check your plan.'},400);
 const op=input.data,owner=user.userId,now=new Date().toISOString(),fingerprint=JSON.stringify(op);
 try{
 const db=getDb();
 const proof=await db.prepare('SELECT request FROM planning_events WHERE owner_id=? AND operation_id=?').bind(owner,op.operationId).first<{request:string}>();if(proof)return proof.request===fingerprint?json(await readState(owner)):json({error:'This save was already used. Reopen the editor.'},409);
 const state=await readState(owner);let entity:'plan'|'template'|'review',id:string,before:DayPlan|DayTemplate|WeeklyReview|null,next:DayPlan|DayTemplate|WeeklyReview;
 let target:{before:DayPlan;next:DayPlan}|null=null;
 if(op.action==='template'){
  entity='template';id=op.id;before=state.dayTemplates.find(t=>t.id===id)||null;
  if(!selected(op.fields.taskIds,state,before?.taskIds)||op.fields.priorityIds.some(id=>!op.fields.taskIds.includes(id)))return json({error:'Choose pending tasks once and priorities from this template.'},400);
  next={...op.fields,id,updatedAt:now,version:op.version+1};
 }else if(op.action==='review'){
  if(weekStart(op.weekStart)!==op.weekStart)return json({error:'Choose a Monday-start week.'},400);
  entity='review';id=op.weekStart;before=state.weeklyReviews.find(r=>r.weekStart===id)||null;
  if(!selected(op.fields.priorityIds,state,before?.priorityIds))return json({error:'Choose pending next-week tasks once.'},400);
  next={...op.fields,weekStart:id,updatedAt:now,version:op.version+1};
 }else{
  entity='plan';id=op.date;before=state.dayPlans.find(p=>p.date===id)||null;const current=before||emptyPlan(id);
  if(op.action==='plan'){
   if(!selected(op.fields.taskIds,state,current.taskIds)||op.fields.priorityIds.some(id=>!op.fields.taskIds.includes(id))||Object.keys(op.fields.decisions).some(id=>!op.fields.taskIds.includes(id)))return json({error:'Choose each pending activity once, with up to three priorities from your plan.'},400);
   // Keep recorded resolution decisions unless the user explicitly removes or re-adds that work.
   next={...op.fields,decisions:Object.fromEntries(Object.entries(current.decisions).filter(([id])=>op.fields.taskIds.includes(id)&&!!op.fields.decisions[id])),date:id,updatedAt:now,version:op.version+1};
  }else if(op.action==='apply'){
   const template=state.dayTemplates.find(t=>t.id===op.templateId);if(!template||template.version!==op.templateVersion)return json({error:'Template changed. Reload before applying it.'},409);
   const keys=new Set(current.taskIds.map(id=>state.tasks.find(t=>t.id===id)).filter(t=>!!t).map(activityKey));
   const additions=template.taskIds.filter(id=>{const t=state.tasks.find(t=>t.id===id);if(!t||t.completedAt||!activeTask(t,state)||keys.has(activityKey(t)))return false;keys.add(activityKey(t));return true;});
   const taskIds=[...current.taskIds,...additions],priorityIds=[...new Set([...current.priorityIds,...template.priorityIds.filter(id=>taskIds.includes(id))])].filter(id=>{const t=state.tasks.find(t=>t.id===id);return t&&activeTask(t,state)&&!current.decisions[id];}).slice(0,3);
   next={...current,availableMinutes:template.availableMinutes,taskIds,priorityIds,date:id,updatedAt:now,version:op.version+1};
  }else{
   const t=state.tasks.find(t=>t.id===op.taskId);if(!t||t.completedAt||!activeTask(t,state)||!current.taskIds.includes(t.id)||current.decisions[t.id])return json({error:'Choose unfinished, unresolved planned work.'},400);
   if(op.decision==='rescheduled'){
    if(!op.targetDate||op.targetDate<=op.date||op.targetDate<state.today||op.targetVersion===undefined)return json({error:'Choose today or a later workday after the original planned day.'},400);
    const old=state.dayPlans.find(p=>p.date===op.targetDate)||emptyPlan(op.targetDate);if(old.version!==op.targetVersion)return json({error:'The destination plan changed. Reload and try again.'},409);
    const existingId=old.taskIds.find(id=>{const other=state.tasks.find(t=>t.id===id);return other&&activityKey(other)===activityKey(t);});
    target={before:old,next:{...old,taskIds:existingId?old.taskIds:[...old.taskIds,t.id],decisions:Object.fromEntries(Object.entries(old.decisions).filter(([id])=>id!==(existingId||t.id))),updatedAt:now,version:old.version+1}};
   }
   next={...current,decisions:{...current.decisions,[t.id]:{kind:op.decision,...(op.decision==='rescheduled'?{date:op.targetDate}:{})}},date:id,updatedAt:now,version:op.version+1};
  }
 }
 if((before?.version||0)!==op.version)return json({error:'This plan changed in another tab. Reload before saving.'},409);
 const table=entity==='plan'?'day_plans':entity==='template'?'day_templates':'weekly_reviews',column=entity==='plan'?'date':entity==='template'?'id':'week_start';
 const guard=(table:string,column:string,version:number)=>version?'EXISTS(SELECT 1 FROM '+table+' WHERE owner_id=? AND '+column+'=? AND version=?)':'NOT EXISTS(SELECT 1 FROM '+table+' WHERE owner_id=? AND '+column+'=?)';
 const guardArgs=(key:string,version:number)=>(version?[owner,key,version]:[owner,key]);
 const mainGuard=guard(table,column,op.version)+(entity==='template'&&!op.version?' AND NOT EXISTS(SELECT 1 FROM day_templates WHERE id=? AND owner_id<>?)':''),extra=target?' AND '+guard('day_plans','date',target.before.version):'';
 const proofInsert=db.prepare(`INSERT INTO planning_events(operation_id,owner_id,entity_id,entity_type,snapshot,previous,happened_at,request) SELECT ?,?,?,?,?,?,?,? WHERE ${mainGuard}${extra}`).bind(op.operationId,owner,id,entity,JSON.stringify(next),before?JSON.stringify(before):null,now,fingerprint,...guardArgs(id,op.version),...(entity==='template'&&!op.version?[id,owner]:[]),...(target?guardArgs(target.before.date,target.before.version):[]));
 const write=(table:string,column:string,id:string,data:unknown,version:number)=>db.prepare(`INSERT INTO ${table}(owner_id,${column},data,updated_at,version) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM planning_events WHERE owner_id=? AND operation_id=?) ON CONFLICT DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at,version=excluded.version WHERE ${table}.owner_id=excluded.owner_id AND ${table}.version=excluded.version-1`).bind(owner,id,JSON.stringify(data),now,version,owner,op.operationId);
 const statements=[proofInsert,write(table,column,id,next,op.version+1)];
 if(target){statements.push(db.prepare('INSERT INTO planning_events(operation_id,owner_id,entity_id,entity_type,snapshot,previous,happened_at,request) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM planning_events WHERE owner_id=? AND operation_id=?)').bind('destination:'+op.operationId,owner,target.next.date,'plan',JSON.stringify(target.next),target.before.version?JSON.stringify(target.before):null,now,fingerprint,owner,op.operationId),write('day_plans','date',target.next.date,target.next,target.next.version));}
 const results=await db.batch(statements);if(!results[0].meta.changes)return json({error:'Another save changed this plan. Reload and try again.'},409);
 return json(await readState(owner));
 }catch{logFailure('planning.save');try{const proof=await getDb().prepare('SELECT request FROM planning_events WHERE owner_id=? AND operation_id=?').bind(owner,op.operationId).first<{request:string}>();if(proof?.request===fingerprint)return json(await readState(owner));}catch{}return json({error:'Could not confirm the save. Your input is still here; retry safely.'},503);}
}
