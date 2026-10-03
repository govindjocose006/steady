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
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const root=new URL('../',import.meta.url).pathname,cache=new Map();
const mock=encode('export const getDb=()=>globalThis.__steadyTest.getDb();export const getChatGPTUser=()=>globalThis.__steadyTest.getChatGPTUser();');
function moduleURL(path){const absolute=resolve(root,path);if(cache.has(absolute))return cache.get(absolute);const compiled=compile(readFileSync(absolute,'utf8'));const replaced=compiled.replace(/from (["'])([^"']+)\1/g,(full,quote,spec)=>{let url;if(spec==='@/db'||spec==='@/app/chatgpt-auth')url=mock;else if(spec.startsWith('@/')||spec.startsWith('.')){const base=spec.startsWith('@/')?resolve(root,spec.slice(2)):resolve(dirname(absolute),spec);const target=[base,base+'.ts',base+'.tsx',base+'/index.ts'].find(x=>existsSync(x)&&!x.endsWith('/db'));url=moduleURL(target);}else url=import.meta.resolve(spec);return 'from '+JSON.stringify(url);});const url=encode(replaced);cache.set(absolute,url);return url;}
const api=await import(moduleURL('app/api/tasks/route.ts'));await import(moduleURL('app/api/history/route.ts'));const model=await import(moduleURL('lib/tasks.ts'));
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
try{
  let s=await state();check(s.tasks[0].id===oldId&&s.tasks[0].version===7,'Migration preserves earlier task identity and version');check(s.events[0].snapshot===oldSnapshot,'Migration preserves the earlier history snapshot exactly');
  user=null;check((await apps.GET()).status===401,'Anonymous application reads rejected');check((await post(apps,{})).status===401,'Anonymous application writes rejected');user={userId:'test-owner',email:'test@example.invalid'};
  const id=uuid(),create={action:'create',id,operationId:uuid(),fields:{institution:'Test university'}};
  s=await ok(apps,create);check(s.applications.length===1&&s.applications[0].stage==='Shortlisted','Minimal application needs only an institution');check(s.applicationEvents.length===1,'Creation recorded in application history');
  s=await ok(apps,create);check(s.applications.length===1&&s.applicationEvents.length===1,'Retry does not duplicate applications');
  check((await post(apps,{...create,fields:{institution:'Ambiguous retry'}})).status===409,'A changed retry cannot overwrite a saved application');
  const checklist=[{id:uuid(),label:'CV',done:false},{id:uuid(),label:'Motivation letter',done:false},{id:uuid(),label:'References',done:false}];
  s=await edit(id,{country:'Switzerland',projectTitle:'Experimental quantum materials',supervisor:'Test supervisor',link:'https://example.org/position',deadline:s.today,notes:'Private notes\nSecond line',nextAction:'Tailor my motivation letter',checklist,stage:'Preparing'});
  let a=s.applications.find(x=>x.id===id);check(a.country==='Switzerland'&&a.notes.includes('\n')&&a.supervisor==='Test supervisor','All fields and multi-line notes saved');check(a.deadline===s.today,'Deadline persisted');
  s=await edit(id,{checklist:[{...checklist[0],done:true},{...checklist[1],label:'Project motivation'},{id:uuid(),label:'Research proposal',done:false}]});a=s.applications.find(x=>x.id===id);check(a.checklist[0].done&&a.checklist[1].label==='Project motivation'&&a.checklist[2].label==='Research proposal','Checklist supports complete, rename, remove, and add');
  const taskId=uuid(),plan={action:'plan',id,version:a.version,operationId:uuid(),taskId,dueDate:s.today,minutes:40,kind:'preparation'};
  s=await ok(apps,plan);let task=s.tasks.find(t=>t.id===taskId);check(task.applicationId===id&&task.minutes===40&&model.isTodayTask(task,s.today),'Planned action links back and is visible in Today');
  const eventCount=s.events.length,appEventCount=s.applicationEvents.length;
  s=await ok(apps,plan);check(s.tasks.length===2&&s.events.length===eventCount&&s.applicationEvents.length===appEventCount,'Retry does not duplicate next-action tasks or history');
  s=await ok(apps,{...plan,operationId:uuid(),taskId:uuid()});check(s.reused&&s.linkedTaskId===taskId&&s.tasks.length===2,'Repeated planning reuses the existing task');
  s=await complete(taskId,true);check(phd(s)===0,'Preparation completion never counts as submission');
  s=await edit(id,{nextAction:'  TAILOR   MY MOTIVATION LETTER  '});a=s.applications.find(x=>x.id===id);s=await ok(apps,{...plan,version:a.version,operationId:uuid(),taskId:uuid()});check(s.reused&&s.tasks.length===2,'Equivalent next-action text avoids duplicate tasks');
  const tomorrow=new Date(Date.parse(s.today+'T12:00:00Z')+86400000).toISOString().slice(0,10);
  s=await edit(id,{nextAction:'Submit the application'});a=s.applications.find(x=>x.id===id);const submitTask=uuid();s=await ok(apps,{action:'plan',id,version:a.version,operationId:uuid(),taskId:submitTask,dueDate:tomorrow,minutes:20,kind:'application'});task=s.tasks.find(t=>t.id===submitTask);check(!model.isTodayTask(task,s.today)&&task.dueDate===tomorrow,'Future linked task is available in Upcoming');
  s=await complete(submitTask,true);a=s.applications.find(x=>x.id===id);check(a.submissionDate===s.today&&a.stage==='Submitted'&&phd(s)===1,'Completing a linked submission task records one application');
  const secondSubmission=uuid();s=await ok(api,{action:'create',id:secondSubmission,operationId:uuid(),fields:{title:'Second submission confirmation',goal:'phd',kind:'application',dueDate:s.today,minutes:5,applicationId:id}});s=await complete(secondSubmission,true);check(phd(s)===1,'Several completed tasks for the same application count once');
  s=await complete(secondSubmission,false);check(phd(s)===1,'Undoing a secondary task preserves the original submission');
  s=await edit(id,{stage:'Interview'});check(s.applications.find(x=>x.id===id).submissionDate===s.today&&phd(s)===1,'Interview preserves the recorded submission and its credit');
  const yesterday=model.previousDate(s.today);s=await edit(id,{submissionDate:yesterday});check(phd(s)===1,'Correcting to yesterday remains inside the target window');
  s=await complete(submitTask,false);check(s.applications.find(x=>x.id===id).submissionDate===yesterday&&phd(s)===1,'Undoing a task does not erase a manually corrected submission date');
  const earlier=model.previousDate(yesterday);s=await edit(id,{submissionDate:earlier});check(phd(s)===0,'Correcting outside the window removes current progress only');
  for(const stage of ['Offer','Rejected','Withdrawn']){s=await edit(id,{stage});check(s.applications.find(x=>x.id===id).submissionDate===earlier,'Later stage '+stage+' preserves submission history');}
  s=await edit(id,{submissionDate:null});check(phd(s)===0&&!s.applications.find(x=>x.id===id).submissionDate,'Undo an application submission clears its credit');check(s.applicationEvents.some(e=>e.action==='submission_undone')&&s.applicationEvents.some(e=>e.action==='submission_corrected'),'Correction and undo history remain saved');
  s=await complete(submitTask,true);check(phd(s)===1,'A fresh linked completion can record a new submission');s=await complete(submitTask,false);check(phd(s)===0&&s.applications.find(x=>x.id===id).stage==='Withdrawn','Undoing the source task clears its date while preserving later stage');
  const oldSubmit=uuid();s=await ok(api,{action:'create',id:oldSubmit,operationId:uuid(),fields:{title:'Earlier unlinked submission',goal:'phd',kind:'application',dueDate:s.today,minutes:30}});s=await complete(oldSubmit,true);check(phd(s)===1,'Earlier unlinked submission tracking keeps its credit');task=s.tasks.find(t=>t.id===oldSubmit);
  const convertId=uuid();s=await ok(apps,{action:'create',id:convertId,operationId:uuid(),existingTaskId:oldSubmit,taskVersion:task.version,fields:{institution:'Earlier institution',projectTitle:'Recorded opportunity',stage:'Submitted',submissionDate:task.completedDate}});check(phd(s)===1&&s.tasks.find(t=>t.id===oldSubmit).applicationId===convertId,'Converting a legacy submission preserves a single count');check(s.events.some(e=>e.snapshot===oldSnapshot),'Earlier unrelated task history still intact');
  a=s.applications.find(x=>x.id===id);task=s.tasks.find(t=>t.id===taskId);s=await ok(api,{action:'edit',id:task.id,version:task.version,operationId:uuid(),fields:{...task,title:'Updated preparation title',minutes:55}});check(s.tasks.find(t=>t.id===taskId).applicationId===id,'Editing a linked task preserves its application link');
  const future=tomorrow;check((await post(apps,{action:'edit',id,version:a.version,operationId:uuid(),fields:{...a,submissionDate:future}})).status===400,'Future submission dates rejected');
  check((await post(apps,{action:'create',id:uuid(),operationId:uuid(),fields:{institution:'Bad URL',link:'javascript:alert(1)'}})).status===400,'Unsafe advertisement links rejected');
  check((await post(apps,{action:'create',id:uuid(),operationId:uuid(),fields:{institution:'Bad date',deadline:'2026-02-30'}})).status===400,'Impossible deadline rejected');
  check((await post(apps,{action:'create',id:uuid(),operationId:uuid(),fields:{institution:'Bad checklist',checklist:[checklist[0],checklist[0]]}})).status===400,'Duplicate checklist identities rejected');
  check((await post(apps,{action:'edit',id,version:1,operationId:uuid(),fields:{...a,institution:'Stale'}})).status===409,'Stale application edit rejected');
  user={userId:'other-owner',email:'other@example.invalid'};let other=await state();check(other.applications.length===0&&other.applicationEvents.length===0&&other.tasks.length===0,'Cross-account records and history are isolated');check((await post(apps,{action:'edit',id,version:a.version,operationId:uuid(),fields:a})).status===404,'Another account cannot edit an application');check((await post(api,{action:'create',id:uuid(),operationId:uuid(),fields:{title:'Foreign link',goal:'phd',kind:'preparation',dueDate:s.today,minutes:10,applicationId:id}})).status===404,'Another account cannot link a task to this application');user={userId:'test-owner',email:'test@example.invalid'};
  const beforeReload=await state();sqlite.close();sqlite=new DatabaseSync(file);s=await state();check(JSON.stringify({...s,serverNow:null})===JSON.stringify({...beforeReload,serverNow:null}),'Applications, checklist, notes, links, submission dates, tasks and both histories survive database reopen');
  const failed={action:'create',id:uuid(),operationId:uuid(),fields:{institution:'Recoverable save'}};failAt=1;const failedResult=await post(apps,failed);check(failedResult.status===503&&!((await state()).applications.some(x=>x.id===failed.id)),'Interrupted multi-statement application save rolls back');s=await ok(apps,failed);check(s.applications.filter(x=>x.id===failed.id).length===1,'Retry after storage interruption saves once');
  a=s.applications.find(x=>x.id===failed.id);const atomicTask=uuid();s=await ok(api,{action:'create',id:atomicTask,operationId:uuid(),fields:{title:'Atomic submission',goal:'phd',kind:'application',dueDate:s.today,minutes:10,applicationId:a.id}});task=s.tasks.find(t=>t.id===atomicTask);const atomicOp={action:'complete',id:task.id,version:task.version,operationId:uuid(),completed:true},oldEvents=s.events.length;failAt=3;const interrupted=await post(api,atomicOp);s=await state();check(interrupted.status===503&&!s.tasks.find(t=>t.id===atomicTask).completedAt&&!s.applications.find(x=>x.id===a.id).submissionDate&&s.events.length===oldEvents,'Interrupted linked completion rolls back task, application and audit together');s=await ok(api,atomicOp);check(!!s.tasks.find(t=>t.id===atomicTask).completedAt&&!!s.applications.find(x=>x.id===a.id).submissionDate,'Retry completes task and application together');
  check(applicationsModel.deadlineDays(tomorrow,s.today)===1&&applicationsModel.deadlineDays(yesterday,s.today)===-1,'Deadline urgency uses calendar dates');
  console.log(`PASS: ${checks} application checks covering migration preservation, all fields, checklists, linking and duplicate prevention, dates and counting, correction and undo, history, privacy, persistence, and atomic failure recovery.`);
}finally{sqlite.close();rmSync(directory,{recursive:true,force:true});delete globalThis.__steadyTest;console.error=savedConsoleError;}
