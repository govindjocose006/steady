import {createRequire} from 'node:module';
process.env.STEADY_LEGACY_IMPORT_OWNER_ID='legacy-account-owner';
process.env.STEADY_LEGACY_IMPORT_OWNER_EMAIL='owner@example.invalid';
// Exercise the real API handlers against an isolated, durable SQLite database.
// Only the platform identity and D1 adapter are supplied by this test harness.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdtempSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import ts from 'typescript';
const directory=mkdtempSync(join(tmpdir(),'steady-check-')),file=join(directory,'tasks.sqlite');
let sqlite=new DatabaseSync(file),user={userId:'test-owner',email:'test@example.invalid'};
const migrationNames=readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort();
sqlite.exec(readFileSync(new URL('../drizzle/'+migrationNames[0],import.meta.url),'utf8'));
const oldId=crypto.randomUUID(),oldNow=new Date().toISOString(),oldSnapshot=JSON.stringify({id:oldId,title:'Original research task',goal:'research',kind:'research',dueDate:'2026-09-29',minutes:75,completedAt:null,completedDate:null,createdAt:oldNow,updatedAt:oldNow,version:7});
sqlite.prepare('INSERT INTO tasks(id,owner_id,title,goal,kind,due_date,minutes,created_at,updated_at,version) VALUES(?,?,?,?,?,?,?,?,?,?)').run(oldId,'test-owner','Original research task','research','research','2026-09-29',75,oldNow,oldNow,7);
sqlite.prepare('INSERT INTO events(operation_id,owner_id,task_id,action,snapshot,happened_at,local_date,request) VALUES(?,?,?,?,?,?,?,?)').run(crypto.randomUUID(),'test-owner',oldId,'created',oldSnapshot,oldNow,'2026-09-29','original request');
for(const name of migrationNames.slice(1))sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
let failAt=-1;

const db={prepare(sql){let args=[];const prepared={bind(...values){args=values;return prepared;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},run(){const s=sqlite.prepare(sql);if(/^\s*SELECT/i.test(sql))return{results:s.all(...args),meta:{changes:0}};const r=s.run(...args);return{results:[],meta:{changes:Number(r.changes)}};}};return prepared;},async batch(statements){sqlite.exec('BEGIN');try{const stopAt=failAt;failAt=-1;const result=statements.map((s,i)=>{if(i===stopAt)throw new Error('Simulated storage interruption');return s.run();});sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
globalThis.__steadyTest={getDb:()=>db,getChatGPTUser:async()=>user};
const encode=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const root=new URL('../',import.meta.url).pathname,cache=new Map();
const mock=encode('export const getDb=()=>globalThis.__steadyTest.getDb();export const getChatGPTUser=()=>globalThis.__steadyTest.getChatGPTUser();');
function moduleURL(path){const absolute=resolve(root,path);if(cache.has(absolute))return cache.get(absolute);const compiled=compile(readFileSync(absolute,'utf8'));const replaced=compiled.replace(/from (["'])([^"']+)\1/g,(full,quote,spec)=>{let url;if(spec==='@/db'||spec==='@/app/chatgpt-auth')url=mock;else if(spec.startsWith('@/')||spec.startsWith('.')){const base=spec.startsWith('@/')?resolve(root,spec.slice(2)):resolve(dirname(absolute),spec);const target=[base,base+'.ts',base+'.tsx',base+'/index.ts'].find(x=>existsSync(x)&&!x.endsWith('/db'));url=moduleURL(target);}else if(spec==='radix-ui'){globalThis.__steadyRadix=createRequire(import.meta.url)(spec);url=encode('export const Dialog=globalThis.__steadyRadix.Dialog;');}else url=import.meta.resolve(spec);return 'from '+JSON.stringify(url);});const url=encode(replaced);cache.set(absolute,url);return url;}
const api=await import(moduleURL('app/api/tasks/route.ts')),history=await import(moduleURL('app/api/history/route.ts')),model=await import(moduleURL('lib/tasks.ts'));
const apps=await import(moduleURL('app/api/applications/route.ts')),applicationsModel=await import(moduleURL('lib/applications.ts'));
const savedConsoleError=console.error;console.error=(message,error)=>savedConsoleError(message,error?.message||'');
const uuid=()=>crypto.randomUUID();let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
async function post(route,op){const r=await route.POST(new Request('https://steady.test/api/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(op)}));return{status:r.status,body:await r.json()};}
async function state(){return (await api.GET()).json();}
async function ok(route,op){const r=await post(route,op);assert.equal(r.status,200,JSON.stringify(r.body));return r.body;}
async function edit(id,changes={}){const a=(await state()).applications.find(a=>a.id===id);return ok(apps,{action:'edit',id,version:a.version,operationId:uuid(),fields:{...a,...changes}});}
async function complete(id,completed){const t=(await state()).tasks.find(t=>t.id===id);return ok(api,{action:'complete',id,version:t.version,operationId:uuid(),completed});}
const phd=(s)=>model.progress(s.tasks,s.today,s.applications).phd;
const imports=await import(moduleURL('lib/opportunity-import.ts')),shortlistModel=await import(moduleURL('lib/opportunity-shortlist.ts'));
const summary=await import(moduleURL('app/application-summary.tsx')),React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server');
const {UnsavedChangesProvider}=await import(moduleURL('app/unsaved-changes.tsx'));
const guardedRender=element=>renderToStaticMarkup(React.createElement(UnsavedChangesProvider,null,element));
try{
 let s=await state();const originalEvents=s.events.map(e=>e.snapshot),originalTasks=JSON.stringify(s.tasks);
 const aalto=uuid(),savedChecklist=[{id:uuid(),label:'My own CV requirement',done:true}];
 s=await ok(apps,{action:'create',id:aalto,operationId:uuid(),fields:{institution:'Aalto University',projectTitle:'Hybrid Magnonics Photonics Topic 2',stage:'Preparing',notes:'My private preparation notes',nextAction:'Keep my own next action',checklist:savedChecklist}});
 const hzb=uuid();s=await ok(apps,{action:'create',id:hzb,operationId:uuid(),fields:{institution:'HZB',projectTitle:'PS 2026/5',stage:'Interview',submissionDate:s.today,notes:'Keep my interview details'}});
 const beforeEarned=s.earnedPoints,originalAppEvents=s.applicationEvents.map(e=>e.snapshot);
 const result=await imports.importOpportunities('test-owner');s=await state();
 check(result.imported===4&&result.updated===2&&s.applications.length===6,'Import creates six workflows for seven positions and updates existing matches');
 let a=s.applications.find(x=>x.id===aalto);check(a.stage==='Preparing'&&a.notes==='My private preparation notes'&&a.nextAction==='Keep my own next action'&&JSON.stringify(a.checklist)===JSON.stringify(savedChecklist),'Import preserves preparation stage, notes, next action and checklist');
 a=s.applications.find(x=>x.id===hzb);check(a.stage==='Interview'&&a.submissionDate===s.today&&a.notes==='Keep my interview details','Import preserves submitted records and later-stage progress');
 check(s.earnedPoints===beforeEarned,'Shortlist import creates no submission points');check(JSON.stringify(s.tasks)===originalTasks&&originalEvents.every(x=>s.events.some(e=>e.snapshot===x))&&originalAppEvents.every(x=>s.applicationEvents.some(e=>e.snapshot===x)),'Import leaves all earlier tasks and history snapshots intact');
 const after=JSON.stringify(s.applications),historyCount=s.applicationEvents.length;await imports.importOpportunities('test-owner');s=await state();check(JSON.stringify(s.applications)===after&&s.applicationEvents.length===historyCount,'Repeated import does not duplicate records, edits or history');
 check(s.applications.flatMap(x=>x.opportunity?.preferences?.length?x.opportunity.preferences:[x]).length===7,'Both PM4 and PM5 preferences retain separate fit ranks');
 check(s.applications.find(x=>x.institution.includes('MPGC')).opportunity.aliases.includes('IMPRS Quantum Materials'),'MPGC-QM retains searchable IMPRS Quantum Materials alias');
 check(shortlistModel.shortlist.every(x=>x.opportunity.verifiedOn==='2026-10-02'),'All official-source verification dates saved');
 check(shortlistModel.shortlist.find(x=>x.key==='mpgc-qm-2027').opportunity.verificationNote.includes('Discrepancy'),'Conflicting MPGC recruitment paragraph clearly flagged');
 const sorted=[...s.applications].sort((a,b)=>applicationsModel.compareApplications(a,b));check(sorted[0].id===hzb&&sorted[1].id===aalto,'Deadline order keeps HZB before Aalto');
 check([...s.applications].sort((a,b)=>applicationsModel.compareApplications(a,b,'fit'))[0].id===aalto,'Fit order retains Aalto at number one');
 const badge=(day,today='2026-10-02')=>applicationsModel.deadlineBadge({...s.applications[0],deadline:day,opportunity:{}},today,new Date('2026-10-02T10:00:00Z'));
 check(badge('2026-10-09')==='Due within 7 days'&&badge('2026-10-10')==='Due within 14 days','Seven-day badge boundary works');
 check(badge('2026-10-16')==='Due within 14 days'&&badge('2026-10-17')==='Due within 30 days','Fourteen-day badge boundary works');
 check(badge('2026-11-01')==='Due within 30 days'&&badge('2026-11-02')===null&&badge('2026-10-01')==='Deadline passed','Thirty-day and passed deadline badges work');
 check(badge('2026-10-02')==='Due within 7 days','Date-only deadline remains current for its whole India display date');
 const halle=s.applications.find(x=>x.institution.includes('Halle'));
 check(halle.deadline==='2026-11-15'&&applicationsModel.displayDeadline(halle)==='2026-11-16'&&halle.opportunity.closingAt==='2026-11-15T22:59:00.000Z','Halle official CET closing time and India date are stored accurately');
 check(applicationsModel.deadlineBadge(halle,'2026-11-16',new Date('2026-11-15T23:00:00Z'))==='Deadline passed','Timed deadline expires at its exact official instant');
 check(s.applications.filter(x=>x.id!==halle.id).every(x=>!x.opportunity.closingAt),'No closing times invented for date-only adverts');
 const ufast=s.applications.find(x=>x.institution.includes('UFAST')),prepareTask=uuid();
 s=await ok(apps,{action:'plan',id:ufast.id,version:ufast.version,operationId:uuid(),taskId:prepareTask,dueDate:s.today,minutes:45});
 const planned=s.applications.find(x=>x.id===ufast.id);s=await ok(apps,{action:'plan',id:ufast.id,version:planned.version,operationId:uuid(),taskId:uuid(),dueDate:s.today,minutes:45});check(s.tasks.filter(t=>t.applicationId===ufast.id).length===1,'UFAST preferences share one duplicate-safe next-action task');
 s=await complete(prepareTask,true);check(!s.applications.find(x=>x.id===ufast.id).submissionDate&&s.earnedPoints===beforeEarned,'Preparation completion does not submit UFAST or award submission points');
 const submitTask=uuid();s=await ok(api,{action:'create',id:submitTask,operationId:uuid(),fields:{title:'Submit shared PM4 / PM5 application',goal:'phd',kind:'application',dueDate:s.today,minutes:20,applicationId:ufast.id}});
 s=await complete(submitTask,true);a=s.applications.find(x=>x.id===ufast.id);check(a.submissionDate===s.today&&s.earnedPoints===beforeEarned+80,'One linked submission creates one UFAST submission award');
 check(!applicationsModel.needsPreparation(a)&&a.opportunity.preferences.length===2&&s.tasks.filter(t=>t.applicationId===a.id).every(t=>!applicationsModel.taskApplicationActive(t,s.applications)),'Both project preferences and all linked tasks leave active lists together');
 check(s.applicationEvents.filter(e=>e.applicationId===a.id&&e.action==='submitted').length===1&&s.awards.filter(x=>x.activityKey==='application:'+a.id).length===1,'Shared submission has one application history entry and one award');
 const secondTask=uuid();s=await ok(api,{action:'create',id:secondTask,operationId:uuid(),fields:{title:'Second checkbox for same UFAST submission',goal:'phd',kind:'application',dueDate:s.today,minutes:10,applicationId:ufast.id}});s=await complete(secondTask,true);check(s.earnedPoints===beforeEarned+80&&s.applicationEvents.filter(e=>e.applicationId===a.id&&e.action==='submitted').length===1,'Additional submission checkbox cannot double-count points or submission history');
 s=await edit(a.id,{submissionDate:model.previousDate(s.today)});check(s.earnedPoints===beforeEarned+80&&phd(s)===2,'Date correction preserves points and counts one unique UFAST application');
 s=await edit(a.id,{stage:'Interview'});check(s.earnedPoints===beforeEarned+80&&s.applications.find(x=>x.id===a.id).submissionDate===model.previousDate(s.today),'Later stage preserves submission date and award');
 s=await edit(a.id,{submissionDate:null,stage:'Preparing'});a=s.applications.find(x=>x.id===a.id);check(applicationsModel.needsPreparation(a)&&s.earnedPoints===beforeEarned&&!s.tasks.find(t=>t.id===submitTask).completedAt&&applicationsModel.taskApplicationActive(s.tasks.find(t=>t.id===submitTask),s.applications),'Undo archives no data, restores both preferences/tasks and reverses the same award');
 const submitOp={action:'edit',id:a.id,version:a.version,operationId:uuid(),fields:{...a,submissionDate:s.today,stage:'Submitted'}};s=await ok(apps,submitOp);s=await ok(apps,submitOp);check(s.earnedPoints===beforeEarned+80&&s.applicationEvents.filter(e=>e.operationId===submitOp.operationId).length<=1,'Recompletion and repeat saves leave one net award');
 s=await edit(aalto,{opportunity:{...s.applications.find(x=>x.id===aalto).opportunity,fitPriority:9,fitNotes:'Edited fit note'},deadline:'2026-10-20',notes:'Edited personal note',nextAction:'Recheck my letter',stage:'Preparing'});a=s.applications.find(x=>x.id===aalto);check(a.opportunity.fitPriority===9&&a.opportunity.fitNotes==='Edited fit note'&&a.deadline==='2026-10-20'&&a.notes==='Edited personal note','Priority, date, notes, next action and stage remain editable');
 s=await edit(halle.id,{deadline:'2026-11-18'});check(!s.applications.find(x=>x.id===halle.id).opportunity.closingAt,'Changing an official date clears stale time metadata instead of inventing a closing time');
 await imports.importOpportunities('test-owner');check((await state()).applications.find(x=>x.id===aalto).opportunity.fitPriority===9,'Reload/reimport preserves user edits after the initial import');
 const saved=JSON.stringify((await state()).applications);sqlite.close();sqlite=new DatabaseSync(file);s=await state();check(JSON.stringify(s.applications)===saved&&s.earnedPoints===beforeEarned+80,'All opportunity edits, preferences, archive status and points persist after database reopen');
 const ui=guardedRender(React.createElement(summary.default,{applications:s.applications,today:s.today,onOpen:()=>{}}));
 check(ui.includes('Deadline first')&&ui.includes('Fit priority')&&!ui.includes('PM4 —')&&!ui.includes('PM5 —'),'Upcoming render contains both sorts and hides submitted UFAST preferences');
 check(ui.includes('Official advert')&&ui.includes('days remaining'),'Upcoming render exposes links, dates and remaining days');
 user={userId:'other-owner',email:'other@example.invalid'};check((await state()).applications.length===0,'Imported private records are isolated from other accounts');user={userId:'test-owner',email:'test@example.invalid'};
 failAt=1;await assert.rejects(imports.importOpportunities('import-failure-owner'));check(sqlite.prepare('SELECT count(*) AS n FROM applications WHERE owner_id=?').get('import-failure-owner').n===0,'Interrupted import rolls back all new records');
 const recovery=await imports.importOpportunities('import-failure-owner');check(recovery.imported===6,'Failed import can retry safely');
 // Reproduce the production bug: account ID import, then a different per-Site ID.
 // Support both the configured repository helper and the Site's original one-off repair.
 const repairSource=readFileSync(resolve(root,'lib/opportunity-ownership.ts'),'utf8');
 const misplacedOwner=repairSource.match(/const importOwner='([^']+)'/)?.[1]||process.env.STEADY_LEGACY_IMPORT_OWNER_ID;
 const repairEmail=repairSource.match(/const ownerEmail='([^']+)'/)?.[1]||process.env.STEADY_LEGACY_IMPORT_OWNER_EMAIL;
 await imports.importOpportunities(misplacedOwner);
 sqlite.prepare("UPDATE applications SET created_at='2026-10-02T10:46:55.182Z',updated_at='2026-10-02T10:46:55.182Z' WHERE owner_id=?").run(misplacedOwner);
 const misplaced=sqlite.prepare('SELECT * FROM applications WHERE owner_id=?').all(misplacedOwner),misplacedAudit=sqlite.prepare('SELECT snapshot FROM application_events WHERE owner_id=?').all(misplacedOwner).map(e=>e.snapshot);
 const repair=await import(moduleURL('lib/opportunity-ownership.ts')),importApi=await import(moduleURL('app/api/opportunity-import/route.ts'));
 user={userId:'unrelated-site-user',email:'unrelated@example.invalid'};check((await state()).applications.length===0&&sqlite.prepare('SELECT count(*) AS n FROM applications WHERE owner_id=?').get(misplacedOwner).n===6,'Unrelated identity cannot claim the misplaced shortlist');
 user=null;check((await api.GET()).status===401&&(await apps.GET()).status===401&&(await importApi.POST(new Request('https://steady.test/api/opportunity-import',{method:'POST',headers:{'Content-Type':'application/json'}}))).status===401,'Unauthenticated requests cannot read, repair or import private records');
 user={userId:'recovered-site-owner',email:repairEmail};
 const canonicalId=uuid();let recovered=await ok(apps,{action:'create',id:canonicalId,operationId:uuid(),fields:{institution:'Aalto University',projectTitle:'Hybrid Magnonics Photonics Topic 2',link:shortlistModel.shortlist[0].link,stage:'Preparing',deadline:'2026-10-19',notes:'Preserve my own existing application',nextAction:'My own next action',checklist:savedChecklist}});
 const oldSnapshots=recovered.applicationEvents.map(e=>e.snapshot),canonicalBefore=recovered.applications[0];
 failAt=1;await assert.rejects(repair.repairOpportunityOwnership(user));check(sqlite.prepare('SELECT count(*) AS n FROM applications WHERE owner_id=?').get(misplacedOwner).n===6,'Interrupted ownership repair rolls back without losing any source records');
 recovered=await state();
 check(recovered.applications.length===6&&recovered.applications.flatMap(a=>a.opportunity?.preferences?.length?a.opportunity.preferences:[a]).length===7,'Normal authenticated refresh recovers all seven positions in six workflows');
 const canonical=recovered.applications.find(a=>a.id===canonicalId);check(canonical.notes===canonicalBefore.notes&&canonical.stage===canonicalBefore.stage&&canonical.deadline===canonicalBefore.deadline&&canonical.nextAction===canonicalBefore.nextAction&&JSON.stringify(canonical.checklist)===JSON.stringify(canonicalBefore.checklist),'Repair merges an existing match while preserving its status, deadline, notes, checklist and next action');
 check(misplaced.filter(a=>!a.institution.includes('Aalto')).every(a=>recovered.applications.some(r=>r.id===a.id&&r.createdAt===a.created_at&&r.deadline===a.deadline)),'Recovered records keep original IDs, creation dates and deadlines');
 check([...oldSnapshots,...misplacedAudit].every(snapshot=>recovered.applicationEvents.some(e=>e.snapshot===snapshot)),'Every original and imported audit snapshot remains intact');
 check(recovered.earnedPoints===0&&recovered.tasks.length===0&&sqlite.prepare('SELECT count(*) AS n FROM applications WHERE owner_id=?').get(misplacedOwner).n===0,'Ownership correction creates no points or tasks and leaves no misplaced duplicates');
 const repairSnapshot=JSON.stringify(recovered.applications),repairHistory=JSON.stringify(recovered.applicationEvents);
 await Promise.all([api.GET(),apps.GET()]);recovered=await state();check(JSON.stringify(recovered.applications)===repairSnapshot&&JSON.stringify(recovered.applicationEvents)===repairHistory,'Repeated refresh and concurrent reads do not repeat recovery or change history');
 const importResult=await imports.importOpportunities(user.userId);check(importResult.alreadyImported===6&&JSON.stringify((await state()).applications)===repairSnapshot,'Subsequent imports recognize transferred proofs and preserve user changes');
 sqlite.close();sqlite=new DatabaseSync(file);check(JSON.stringify((await state()).applications)===repairSnapshot,'Recovered ownership and records persist after database reopen');
 user={userId:'other-owner',email:'other@example.invalid'};check((await state()).applications.length===0,'Recovered shortlist stays private to its actual owner');
 const applicationsView=await import(moduleURL('app/applications-view.tsx'));
 const appUI=guardedRender(React.createElement(applicationsView.default,{data:recovered,busy:false,requestedId:null,onSelect:()=>{},onTaskEdit:()=>{},mutate:async()=>true,formError:'',clearFormError:()=>{},createRequested:0}));
 check(appUI.includes('Pending applications')&&appUI.includes('Application history')&&appUI.includes('Helmholtz-Zentrum Berlin')&&!appUI.includes('Select an application to view'),'Application page renders recovered pending records, separate history and no unused detail placeholder');
 const dashSource=readFileSync(resolve(root,'app/dashboard.tsx'),'utf8');
 check(dashSource.includes("{data&&view==='today'&&<TodayWorkSurface")&&!dashSource.includes('className="sidebar-goals"'),'Plan and separate goal progress are scoped to Today, without repeated sidebar priorities');
 // Verify the four-record batch separately from the earlier shortlist.
 user={userId:'recovered-site-owner',email:repairEmail};
 const requested=await import(moduleURL('lib/requested-applications.ts'));
 const kept=(await state()).applications.map(a=>JSON.stringify(a)),keptHistory=(await state()).applicationEvents.map(e=>e.snapshot);
 const fourResult=await imports.importOpportunities(user.userId,requested.requestedApplications,requested.requestedBatch);s=await state();
 check(fourResult.imported===4&&fourResult.updated===0&&s.applications.length===10,'Exactly four requested records added to six existing workflows');
 check(kept.every(a=>s.applications.some(b=>JSON.stringify(b)===a))&&keptHistory.every(x=>s.applicationEvents.some(e=>e.snapshot===x)),'Existing records and history unchanged');
 const ox=s.applications.find(a=>a.institution.includes('Oxford')),cam=s.applications.find(a=>a.institution.includes('Cambridge')),ku=s.applications.find(a=>a.institution==='KU Leuven'),tue=s.applications.find(a=>a.institution.includes('Eindhoven'));
 check(ox.deadline==='2027-01-06'&&ox.opportunity.secondaryDeadlines[0].date==='2027-03-02'&&cam.deadline==='2026-12-08'&&cam.opportunity.secondaryDeadlines[0].date==='2027-05-13','Funding deadlines primary; secondary admissions dates retained');
 check(!cam.opportunity.closingAt&&cam.opportunity.priorityLabel==='Very high','Cambridge date-only deadline and separate research priority');
 check(applicationsModel.displayDeadline(ku)==='2026-10-16'&&ku.opportunity.closingTimezone.includes('CET')&&ku.opportunity.verificationNote.includes('ambiguity'),'KU Leuven portal cutoff and timezone ambiguity retained');
 check(applicationsModel.displayDeadline(tue)==='2026-10-17'&&tue.opportunity.positionCount===2&&!tue.opportunity.preferences&&tue.checklist.length===3,'Eindhoven shared advert is one record with correct India date and checklist');
 const fourUI=guardedRender(React.createElement(summary.default,{applications:s.applications,today:s.today,onOpen:()=>{}}));
 check(fourUI.includes('10 applications')&&fourUI.includes('Scholarship deadline')&&fourUI.includes('Funding deadline')&&fourUI.includes('17:30 IST')&&fourUI.includes('DPhil in Condensed Matter Physics'),'Upcoming counts and funding dates render correctly');
 const fourSnapshot=JSON.stringify(s.applications),fourHistory=JSON.stringify(s.applicationEvents);
 await imports.importOpportunities(user.userId,requested.requestedApplications,requested.requestedBatch);s=await state();check(JSON.stringify(s.applications)===fourSnapshot&&JSON.stringify(s.applicationEvents)===fourHistory,'Repeated four-record import preserves edits and does not duplicate history');
 const fourTask=uuid();s=await ok(apps,{action:'plan',id:tue.id,version:tue.version,operationId:uuid(),taskId:fourTask,dueDate:s.today,minutes:30,kind:'application'});
 const earnedBeforeFour=s.earnedPoints;s=await edit(tue.id,{stage:'Submitted',submissionDate:s.today,notes:'Submitted Project 1 preference'});
 check(!applicationsModel.needsPreparation(s.applications.find(a=>a.id===tue.id))&&!applicationsModel.taskApplicationActive(s.tasks.find(t=>t.id===fourTask),s.applications),'Submission removes advert and linked task from active planning');
 check(s.earnedPoints===earnedBeforeFour+80&&s.applicationEvents.filter(e=>e.applicationId===tue.id&&e.action==='submitted').length===1,'One submission award and one submission history entry');
 s=await complete(fourTask,true);check(s.earnedPoints===earnedBeforeFour+80,'Linked checkbox cannot duplicate reward');
 s=await edit(tue.id,{stage:'Interview',submissionDate:model.previousDate(s.today)});check(s.earnedPoints===earnedBeforeFour+80&&s.applications.find(a=>a.id===tue.id).opportunity.positionCount===2,'Date correction and later stage preserve award and metadata');
 const archivedFourUI=guardedRender(React.createElement(summary.default,{applications:s.applications,today:s.today,onOpen:()=>{}}));check(!archivedFourUI.includes(tue.projectTitle)&&archivedFourUI.includes('9 applications'),'Submission removes advert from Upcoming and updates count');
 s=await edit(tue.id,{stage:'Preparing',submissionDate:null});check(s.earnedPoints===earnedBeforeFour&&applicationsModel.needsPreparation(s.applications.find(a=>a.id===tue.id)),'Undo restores application and corrects award');
 const finalFour=JSON.stringify(s.applications);sqlite.close();sqlite=new DatabaseSync(file);check(JSON.stringify((await state()).applications)===finalFour,'Four records persist after durable database reopen');
 process.env.STEADY_REQUESTED_IMPORT_OWNER=user.userId;process.env.STEADY_REQUESTED_IMPORT_KEY='test-maintenance-secret';
 const maintenance=await import(moduleURL('app/api/requested-applications/route.ts'));
 check((await maintenance.POST(new Request('https://steady.test/api/requested-applications',{method:'POST',headers:{'Content-Type':'application/json'}}))).status===403,'Maintenance import rejects missing additional secret');
 const maintained=await maintenance.POST(new Request('https://steady.test/api/requested-applications',{method:'POST',headers:{'Content-Type':'application/json','x-steady-import-key':'test-maintenance-secret'},body:'{}'}));check(maintained.status===200&&(await maintained.json()).alreadyImported===4,'Authorized maintenance retry is inert');
 user={userId:'matching-existing-owner',email:'other@example.invalid'};const existingOxford=uuid();s=await ok(apps,{action:'create',id:existingOxford,operationId:uuid(),fields:{institution:'Oxford',projectTitle:'DPhil Condensed Matter Physics',stage:'Interview',submissionDate:s.today,notes:'Keep my notes',checklist:savedChecklist,nextAction:'Keep my next action'}});
 const updatePoints=s.earnedPoints,matched=await imports.importOpportunities(user.userId,requested.requestedApplications,requested.requestedBatch);s=await state();const updatedOxford=s.applications.find(a=>a.id===existingOxford);
 check(matched.updated===1&&matched.imported===3&&s.applications.length===4&&updatedOxford.stage==='Interview'&&updatedOxford.notes==='Keep my notes'&&updatedOxford.submissionDate===s.today&&JSON.stringify(updatedOxford.checklist)===JSON.stringify(savedChecklist)&&updatedOxford.nextAction==='Keep my next action'&&s.earnedPoints===updatePoints,'Matching application keeps progress, notes, checklist, next action and reward');
 console.log(`PASS: ${checks} opportunity checks for verified imports, preservation, priority/deadline sorts, badges, exact timezone, archive/undo, one shared UFAST submission, points, reload and isolation.`);
}finally{sqlite.close();rmSync(directory,{recursive:true,force:true});console.error=savedConsoleError;}
