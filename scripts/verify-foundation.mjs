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
for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
const db={prepare(sql){let args=[];const prepared={bind(...values){args=values;return prepared;},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},run(){const s=sqlite.prepare(sql);if(/^\s*SELECT/i.test(sql))return{results:s.all(...args),meta:{changes:0}};const r=s.run(...args);return{results:[],meta:{changes:Number(r.changes)}};}};return prepared;},async batch(statements){sqlite.exec('BEGIN');try{const result=statements.map(s=>s.run());sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
globalThis.__steadyTest={getDb:()=>db,getChatGPTUser:async()=>user};
const encode=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const root=new URL('../',import.meta.url).pathname,cache=new Map();
const mock=encode('export const getDb=()=>globalThis.__steadyTest.getDb();export const getChatGPTUser=()=>globalThis.__steadyTest.getChatGPTUser();');
function moduleURL(path){const absolute=resolve(root,path);if(cache.has(absolute))return cache.get(absolute);const compiled=compile(readFileSync(absolute,'utf8'));const replaced=compiled.replace(/from (["'])([^"']+)\1/g,(full,quote,spec)=>{let url;if(spec==='@/db'||spec==='@/app/chatgpt-auth')url=mock;else if(spec.startsWith('@/')||spec.startsWith('.')){const base=spec.startsWith('@/')?resolve(root,spec.slice(2)):resolve(dirname(absolute),spec);const target=[base,base+'.ts',base+'.tsx',base+'/index.ts'].find(x=>existsSync(x)&&!x.endsWith('/db'));url=moduleURL(target);}else url=import.meta.resolve(spec);return 'from '+JSON.stringify(url);});const url=encode(replaced);cache.set(absolute,url);return url;}
const api=await import(moduleURL('app/api/tasks/route.ts')),history=await import(moduleURL('app/api/history/route.ts')),model=await import(moduleURL('lib/tasks.ts'));
async function call(op,headers={}){const response=await api.POST(new Request('https://steady.test/api/tasks',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(op)}));return{status:response.status,body:await response.json()};}
const uuid=()=>crypto.randomUUID(),fields={title:'Submit test application',goal:'phd',kind:'application',dueDate:model.indiaDate(),minutes:60};
let checks=0;function check(value,message){assert.ok(value,message);checks++;}
try{
  user=null;check((await api.GET()).status===401,'Anonymous reads rejected');check((await call({})).status===401,'Anonymous writes rejected');
  user={userId:'test-owner',email:'test@example.invalid'};
  const create={action:'create',operationId:uuid(),id:uuid(),fields};
  let result=await call(create);check(result.status===200,'Create succeeds');check(result.body.tasks.length===1&&result.body.events.length===1,'Task and history saved together');
  result=await call(create);check(result.body.tasks.length===1&&result.body.events.length===1,'Retry never duplicates task or history');
  result=await call({...create,fields:{...fields,title:'Changed retry'}});check(result.status===409,'An ambiguous retry cannot overwrite a saved operation');
  result=await call({action:'edit',operationId:uuid(),id:create.id,version:1,fields:{...fields,title:'Edited application',minutes:90}});check(result.body.tasks[0].title==='Edited application'&&result.body.tasks[0].minutes===90,'Editing saved');check(JSON.parse(result.body.events[0].previous).title===fields.title,'Previous title preserved in history');
  result=await call({action:'complete',operationId:uuid(),id:create.id,version:1,completed:true});check(result.status===409,'Stale update rejected');
  const complete={action:'complete',operationId:uuid(),id:create.id,version:2,completed:true};
  result=await call(complete);check(result.body.tasks[0].completedDate===model.indiaDate(),'Completion uses India date');check(model.progress(result.body.tasks,result.body.today).phd===1,'Application progress increments');
  result=await call(complete);check(result.body.events.length===3,'Completion retry is idempotent');
  result=await call({action:'complete',operationId:uuid(),id:create.id,version:3,completed:false});check(model.progress(result.body.tasks,result.body.today).phd===0,'Undo removes progress');check(result.body.events.length===4&&result.body.events[0].action==='reopened','Undo preserves earlier completion history');
  sqlite.close();sqlite=new DatabaseSync(file);result={body:await (await api.GET()).json()};check(result.body.tasks[0].title==='Edited application'&&result.body.events.length===4,'Database survives close and reopen');
  user={userId:'other-owner',email:'other@example.invalid'};let other=await(await api.GET()).json();check(other.tasks.length===0&&other.events.length===0,'Other account sees no private records');check((await call({action:'complete',operationId:uuid(),id:create.id,version:4,completed:true})).status===404,'Other account cannot edit a task');
  user={userId:'test-owner',email:'test@example.invalid'};
  for(const bad of [{minutes:0},{minutes:-1},{title:' '},{goal:'net',kind:'application'},{dueDate:'2026-02-30'}])check((await call({action:'create',operationId:uuid(),id:uuid(),fields:{...fields,...bad}})).status===400,'Invalid fields rejected');
  check((await call({action:'create',operationId:uuid(),id:uuid(),fields},{'sec-fetch-site':'cross-site'})).status===403,'Cross-site writes rejected');
  check(model.indiaDate(new Date('2026-09-30T18:29:59Z'))==='2026-09-30','Before India midnight');check(model.indiaDate(new Date('2026-09-30T18:30:00Z'))==='2026-10-01','After India midnight');check(model.previousDate('2027-01-01')==='2026-12-31','Window works across year boundary');
  const task={...result.body.tasks[0],completedAt:'2026-09-30T12:00:00Z',completedDate:'2026-09-30'};
  check(model.progress([task], '2026-10-01').phd===1&&model.progress([task],'2026-10-02').phd===0,'Two-day application window rolls correctly');
  check(model.progress([{...task,kind:'preparation'}],'2026-10-01').phd===0,'Preparation never counts as submission');
  check(model.progress([{...task,goal:'net',kind:'lecture'}],'2026-10-01').net===0,'Prior-day lectures do not count today');
  check(model.isTodayTask({...task,completedAt:null,dueDate:'2026-09-01'},'2026-10-01'),'Overdue open tasks carry forward');
  check(!model.isTodayTask({...task,completedAt:null,dueDate:'2026-10-02'},'2026-10-01'),'Future task stays Upcoming');
  // More than one page ensures older history remains accessible.
  for(let i=0;i<49;i++)await call({action:'create',operationId:uuid(),id:uuid(),fields:{...fields,title:'History fixture '+i}});
  const page=await(await api.GET()).json();check(page.events.length===50&&page.hasMore,'History has bounded first page');
  const older=await(await history.GET(new Request('https://steady.test/api/history?before='+page.events.at(-1).sequence))).json();check(older.events.length===3&&!older.hasMore,'Older history can be loaded');
  user={userId:'other-owner',email:'other@example.invalid'};const privateHistory=await(await history.GET(new Request('https://steady.test/api/history?before=9999'))).json();check(privateHistory.events.length===0,'History pagination respects ownership');
  console.log(`PASS: ${checks} checks covering create/edit/complete/undo, durable history, retries, conflicts, privacy, input validation, and India date rollover.`);
}finally{sqlite.close();rmSync(directory,{recursive:true,force:true});delete globalThis.__steadyTest;}
