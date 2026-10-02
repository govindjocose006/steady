import {shortlist,type ShortlistEntry} from './opportunity-shortlist';
import {getDb} from '@/db';
import {applicationColumns,decodeApplication,appEvent,applicationUpdate} from './storage';
import {commonDocuments,type Application} from './applications';
const normalize=(s:string)=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function matchesOpportunity(a:Application,s:ShortlistEntry){
 const text=normalize(a.institution+' '+a.projectTitle),url=(v:string)=>v.replace(/\/$/,'');
 if(url(a.link)===url(s.link)||s.opportunity.preferences?.some(p=>url(p.link)===url(a.link)))return true;
 if(s.key==='aalto-topic-2-2026')return text.includes('aalto')&&(text.includes('magnonics')||text.includes('spin ion'));
 if(s.key==='hzb-ps-2026-5')return (text.includes('hzb')||text.includes('helmholtz'))&&(text.includes('functional oxides')||text.includes('ps 2026 5'));
 if(s.key==='mpgc-qm-2027')return text.includes('mpgc qm')||text.includes('graduate center for quantum materials')||text.includes('imprs quantum materials');
 if(s.key==='halle-stns-spin-2026')return text.includes('emerging spin dynamics')&&(text.includes('halle')||text.includes('imprs'));
 if(s.key==='imprs-ufast-2027')return text.includes('ufast')&&(text.includes('pm4')||text.includes('pm5')||text.includes('shared application'))||text.includes('dynamic heat transport')||text.includes('intrinsic orbital dynamics');
 return text.includes('p2601')&&text.includes('basel');
}
export async function importOpportunities(owner:string){
 const db=getDb(),now=new Date().toISOString();
 const rows=await db.prepare(`SELECT ${applicationColumns} FROM applications WHERE owner_id=?`).bind(owner).all();
 const applications=rows.results.map(row=>decodeApplication(row as Parameters<typeof decodeApplication>[0]));
 const proofRows=await db.prepare("SELECT operation_id,request FROM application_events WHERE owner_id=? AND operation_id LIKE 'shortlist-2026-10-02:%'").bind(owner).all<{operation_id:string;request:string}>();
 const already=new Set(proofRows.results.map(r=>r.request));
 const statements:D1PreparedStatement[]=[];let imported=0,updated=0;
 for(const entry of shortlist){
  const operation='shortlist-2026-10-02:'+owner+':'+entry.key;if(already.has(entry.key))continue;
  const matches=applications.filter(a=>matchesOpportunity(a,entry));
  if(matches.length>1)throw new Error('More than one existing record matches '+entry.key+'. Resolve the duplicate before importing; no records changed.');
  const before=matches[0]||null;
  const next:Application=before?{...before,institution:entry.institution,country:entry.country,projectTitle:entry.projectTitle,supervisor:entry.supervisor,link:entry.link,deadline:entry.deadline,nextAction:before.nextAction||entry.nextAction,opportunity:{...before.opportunity,...entry.opportunity},updatedAt:now,version:before.version+1}:{...entry,id:crypto.randomUUID(),notes:'',stage:'Shortlisted',checklist:commonDocuments.map(label=>({id:crypto.randomUUID(),label,done:false})),submissionDate:null,submissionTaskId:null,createdAt:now,updatedAt:now,version:1};
  const noProof='NOT EXISTS(SELECT 1 FROM application_events WHERE owner_id=? AND operation_id=?)';
  if(before){
   statements.push(appEvent(db,owner,next,before,'shortlist_updated',operation,entry.key,`EXISTS(SELECT 1 FROM applications WHERE owner_id=? AND id=? AND version=?) AND ${noProof}`,[owner,before.id,before.version,owner,operation]),applicationUpdate(db,owner,next,operation));updated++;
  }else{
   // Source and audit proof are saved in one batch; the proof makes subsequent imports inert.
   statements.push(appEvent(db,owner,next,null,'shortlist_added',operation,entry.key,noProof,[owner,operation]),db.prepare('INSERT INTO applications(id,owner_id,institution,country,project_title,supervisor,link,deadline,notes,next_action,stage,checklist,submission_date,submission_task_id,created_at,updated_at,version,opportunity) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,?,?,1,? WHERE EXISTS(SELECT 1 FROM application_events WHERE owner_id=? AND operation_id=? AND application_id=?)').bind(next.id,owner,next.institution,next.country,next.projectTitle,next.supervisor,next.link,next.deadline,next.notes,next.nextAction,next.stage,JSON.stringify(next.checklist),now,now,JSON.stringify(next.opportunity),owner,operation,next.id));imported++;
  }
 }
 if(statements.length){const results=await db.batch(statements);if(results.some(r=>!r.meta.changes))throw new Error('An application changed during import. Reload and retry; saved import proofs prevent duplicates.');}
 return {imported,updated,alreadyImported:shortlist.length-imported-updated,positions:7,workflows:6};
}
