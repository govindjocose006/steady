import {getDb} from '@/db';
import {applicationColumns,decodeApplication} from './storage';
import {matchesOpportunity} from './opportunity-import';
import {shortlist} from './opportunity-shortlist';
import type {ChatGPTUser} from '@/app/chatgpt-auth';

// Repair only the six pristine rows imported on 2 October under an account ID.
// Optional recovery must be configured only for an owner-private Site; normal storage remains
// scoped to the dispatch-provided per-Site user ID, never an account ID or email.
const importOwner=process.env.STEADY_LEGACY_IMPORT_OWNER_ID||'';
const ownerEmail=process.env.STEADY_LEGACY_IMPORT_OWNER_EMAIL||'';
export async function repairOpportunityOwnership(user:ChatGPTUser){
 if(!importOwner||!ownerEmail||user.email.toLowerCase()!==ownerEmail.toLowerCase()||user.userId===importOwner)return;
 const db=getDb();
 const source=await db.prepare(`SELECT ${applicationColumns} FROM applications WHERE owner_id=? AND version=1 AND stage='Shortlisted' AND submission_date IS NULL AND notes='' AND created_at='2026-10-02T10:46:55.182Z' AND updated_at=created_at AND EXISTS(SELECT 1 FROM application_events e WHERE e.application_id=applications.id AND e.owner_id=? AND e.action='shortlist_added' AND e.operation_id LIKE 'shortlist-2026-10-02:%') AND NOT EXISTS(SELECT 1 FROM tasks t WHERE t.application_id=applications.id) AND NOT EXISTS(SELECT 1 FROM points_awards p WHERE p.activity_key='application:'||applications.id) AND (SELECT count(*) FROM application_events e WHERE e.application_id=applications.id)=1`).bind(importOwner,importOwner).all();
 if(!source.results.length)return;
 const targetRows=await db.prepare(`SELECT ${applicationColumns} FROM applications WHERE owner_id=?`).bind(user.userId).all();
 const targets=targetRows.results.map(row=>decodeApplication(row as Parameters<typeof decodeApplication>[0]));
 const statements:D1PreparedStatement[]=[];
 for(const row of source.results){
  const a=decodeApplication(row as Parameters<typeof decodeApplication>[0]);
  const entry=shortlist.find(s=>matchesOpportunity(a,s));if(!entry)continue;
  const proof='shortlist-2026-10-02:'+importOwner+':'+entry.key;
  const matches=targets.filter(t=>matchesOpportunity(t,entry));
  if(matches.length>1)throw new Error('Duplicate application records need review before ownership repair.');
  const existing=matches[0];
  if(existing){
   // A position added by the owner meanwhile is canonical. Preserve all its
   // progress and edits; retain the original import audit with its saved snapshot.
   const opportunity={...a.opportunity,...existing.opportunity};
   if(existing.deadline!==a.deadline){delete opportunity.closingAt;delete opportunity.closingLabel;delete opportunity.closingTimezone;}
   statements.push(db.prepare('UPDATE applications SET opportunity=? WHERE id=? AND owner_id=? AND version=?').bind(JSON.stringify(opportunity),existing.id,user.userId,existing.version));
   statements.push(db.prepare('UPDATE application_events SET owner_id=?,application_id=? WHERE owner_id=? AND application_id=? AND operation_id=? AND EXISTS(SELECT 1 FROM applications WHERE id=? AND owner_id=?)').bind(user.userId,existing.id,importOwner,a.id,proof,existing.id,user.userId));
   statements.push(db.prepare('DELETE FROM applications WHERE id=? AND owner_id=? AND version=1 AND NOT EXISTS(SELECT 1 FROM application_events WHERE owner_id=? AND application_id=?)').bind(a.id,importOwner,importOwner,a.id));
  }else{
   statements.push(db.prepare('UPDATE applications SET owner_id=? WHERE id=? AND owner_id=? AND version=1 AND EXISTS(SELECT 1 FROM application_events WHERE owner_id=? AND application_id=? AND operation_id=?)').bind(user.userId,a.id,importOwner,importOwner,a.id,proof));
   statements.push(db.prepare('UPDATE application_events SET owner_id=? WHERE owner_id=? AND application_id=? AND operation_id=? AND EXISTS(SELECT 1 FROM applications WHERE id=? AND owner_id=?)').bind(user.userId,importOwner,a.id,proof,a.id,user.userId));
  }
 }
 if(statements.length)await db.batch(statements);
}
