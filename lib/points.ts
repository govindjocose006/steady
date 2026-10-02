import {indiaDate} from './tasks';
import {defaultMotivation,type PointKind} from './motivation';
import {proofSQL,type Proof} from './motivation-storage';
// Every statement runs in the same atomic batch as its source activity.
// SQL guards, frozen award rows and unique ledger keys protect retries and concurrent tabs.
export function awardStatements(db:D1Database,owner:string,proof:Proof,key:string,kind:PointKind,label:string,date:string|null,beforeCompleted:boolean,completed:boolean,now:string,custom=0,desiredSQL='1'){
 const p=proofSQL(owner,proof),day=date||indiaDate(),event=proof.operationId+':'+key,amount=kind==='custom'?String(custom):`COALESCE((SELECT json_extract(data,'$.points.${kind}') FROM motivation_settings WHERE owner_id=?),${defaultMotivation.points[kind]})`,amountArgs=kind==='custom'?[]:[owner];
 const desired=completed?`(${desiredSQL})`:'0',q=(sql:string,...args:(string|number|null)[])=>db.prepare(sql).bind(...args);
 const rows:D1PreparedStatement[]=[];
 if(completed&&!beforeCompleted)rows.push(q(`INSERT INTO points_awards(id,owner_id,activity_key,kind,amount,active,activity_date,label,first_awarded_at) SELECT ?,?,?,?,${amount},0,?,?,? WHERE ${p.sql} AND NOT EXISTS(SELECT 1 FROM points_awards WHERE owner_id=? AND activity_key=?)`,crypto.randomUUID(),owner,key,kind,...amountArgs,day,label,now,...p.args,owner,key));
 const base='owner_id=? AND activity_key=?',baseArgs=[owner,key];
 // Undo or an ineligible corrected date reverses exactly the saved amount.
 rows.push(q(`INSERT OR IGNORE INTO points_ledger(event_key,owner_id,activity_key,action,delta,activity_date,previous_date,label,happened_at,local_date) SELECT ?,owner_id,activity_key,'correction',-amount,?,activity_date,?, ?,? FROM points_awards WHERE ${base} AND active=1 AND NOT (${desired}) AND ${p.sql}`,event+':reverse',date,label+' — award undone',now,indiaDate(),...baseArgs,...p.args));
 rows.push(q(`UPDATE points_awards SET active=0 WHERE ${base} AND active=1 AND NOT (${desired}) AND ${p.sql}`,...baseArgs,...p.args));
 rows.push(q(`INSERT OR IGNORE INTO points_ledger(event_key,owner_id,activity_key,action,delta,activity_date,previous_date,label,happened_at,local_date) SELECT ?,owner_id,activity_key,'correction',0,?,activity_date,?,?,? FROM points_awards WHERE ${base} AND active=1 AND activity_date<>? AND (${desired}) AND ${p.sql}`,event+':date',day,label+' — date corrected',now,indiaDate(),...baseArgs,day,...p.args));
 rows.push(q(`INSERT OR IGNORE INTO points_ledger(event_key,owner_id,activity_key,action,delta,activity_date,previous_date,label,happened_at,local_date) SELECT ?,owner_id,activity_key,'award',amount,?,NULL,?,?,? FROM points_awards WHERE ${base} AND active=0 AND (${desired}) AND ${p.sql}`,event+':award',day,label,now,indiaDate(),...baseArgs,...p.args));
 rows.push(q(`UPDATE points_awards SET active=1,activity_date=?,label=? WHERE ${base} AND (${desired}) AND ${p.sql}`,day,label,...baseArgs,...p.args));
 return rows;
}
export function transferAward(db:D1Database,owner:string,proof:Proof,source:string,target:string,now:string){
 const p=proofSQL(owner,proof),event=proof.operationId+':transfer:'+source,q=(sql:string,...args:(string|number|null)[])=>db.prepare(sql).bind(...args);
 const absent='NOT EXISTS(SELECT 1 FROM points_awards WHERE owner_id=? AND activity_key=?)';
 return [
 q(`INSERT OR IGNORE INTO points_ledger(event_key,owner_id,activity_key,action,delta,activity_date,previous_date,label,happened_at,local_date) SELECT ?,owner_id,?, 'correction',CASE WHEN ${absent} THEN 0 ELSE -amount*active END,activity_date,activity_date,'Daily task linked to its record',?,? FROM points_awards WHERE owner_id=? AND activity_key=? AND ${p.sql}`,event,target,owner,target,now,indiaDate(),owner,source,...p.args),
 q(`UPDATE points_awards SET activity_key=? WHERE owner_id=? AND activity_key=? AND ${absent} AND ${p.sql}`,target,owner,source,owner,target,...p.args),
 q(`UPDATE points_awards SET active=0 WHERE owner_id=? AND activity_key=? AND EXISTS(SELECT 1 FROM points_awards WHERE owner_id=? AND activity_key=?) AND ${p.sql}`,owner,source,owner,target,...p.args)
 ];
}
function safe(value:string){return "'"+value.replaceAll("'","''")+"'";}
export function focusEligibility(owner:string,key:string,date:string){
 // Keeping an existing award on its original day is allowed if the limit later changes.
 return `(EXISTS(SELECT 1 FROM points_awards WHERE owner_id=${safe(owner)} AND activity_key=${safe(key)} AND active=1 AND activity_date=${safe(date)}) OR (SELECT count(*) FROM points_awards WHERE owner_id=${safe(owner)} AND kind='focus' AND active=1 AND activity_date=${safe(date)} AND activity_key<>${safe(key)}) < COALESCE((SELECT json_extract(data,'$.focusDailyLimit') FROM motivation_settings WHERE owner_id=${safe(owner)}),3))`;
}
export function workoutStatements(db:D1Database,owner:string,proof:Proof,beforeDate:string|null,nextDate:string|null,newCompletion:boolean,now:string){
 const p=proofSQL(owner,proof),rows:D1PreparedStatement[]=[],exists=(date:string)=>`EXISTS(SELECT 1 FROM habit_records WHERE owner_id=${safe(owner)} AND kind='workout' AND status='Completed' AND completion_date=${safe(date)})`;
 if(beforeDate&&nextDate&&beforeDate!==nextDate){
 const old='workout:'+beforeDate,next='workout:'+nextDate,condition=`owner_id=? AND activity_key=? AND active=1 AND NOT (${exists(beforeDate)}) AND NOT EXISTS(SELECT 1 FROM points_awards WHERE owner_id=? AND activity_key=?) AND ${p.sql}`;
 rows.push(db.prepare(`INSERT OR IGNORE INTO points_ledger(event_key,owner_id,activity_key,action,delta,activity_date,previous_date,label,happened_at,local_date) SELECT ?,owner_id,?,'correction',0,?,activity_date,'Workout date corrected',?,? FROM points_awards WHERE ${condition}`).bind(proof.operationId+':workout-move',next,nextDate,now,indiaDate(),owner,old,owner,next,...p.args));
 rows.push(db.prepare(`UPDATE points_awards SET activity_key=?,activity_date=? WHERE ${condition}`).bind(next,nextDate,owner,old,owner,next,...p.args));
 }
 if(beforeDate)rows.push(...awardStatements(db,owner,proof,'workout:'+beforeDate,'workout','Daily workout',beforeDate,true,true,now,0,exists(beforeDate)));
 if(nextDate&&nextDate!==beforeDate||nextDate&&!beforeDate){
 const key='workout:'+nextDate!;
 // Date corrections can move an award or merge days, but cannot create extra points.
 const correctionGuard=beforeDate&&!newCompletion?` AND (EXISTS(SELECT 1 FROM points_awards WHERE owner_id=${safe(owner)} AND activity_key=${safe(key)} AND active=1) OR EXISTS(SELECT 1 FROM points_ledger l JOIN points_awards a ON a.owner_id=l.owner_id AND a.activity_key=l.activity_key WHERE l.owner_id=${safe(owner)} AND l.event_key=${safe(proof.operationId+':workout:'+beforeDate+':reverse')} AND (SELECT amount FROM points_awards WHERE owner_id=${safe(owner)} AND activity_key=${safe(key)})<=a.amount))`:'';
 rows.push(...awardStatements(db,owner,proof,key,'workout','Daily workout',nextDate,!newCompletion,true,now,0,exists(nextDate!)+correctionGuard));
 }else if(nextDate&&newCompletion)rows.push(...awardStatements(db,owner,proof,'workout:'+nextDate,'workout','Daily workout',nextDate,false,true,now,0,exists(nextDate)));
 return rows;
}
