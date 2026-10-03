import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {testWorkspace} from './test-harness.mjs';
const test=testWorkspace();let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
const history=await import(test.moduleURL('app/api/history/route.ts')),api=await import(test.moduleURL('app/api/tasks/route.ts'));
const helpers=await import(test.moduleURL('lib/history.ts')),review=await import(test.moduleURL('lib/weekly-review.ts'));
const Feed=(await import(test.moduleURL('app/history-feed.tsx'))).default;
const taskModel=await import(test.moduleURL('lib/tasks.ts')),owner=test.user.userId,today=taskModel.indiaDate(),previous=taskModel.previousDate(today),now=new Date().toISOString();
async function page(query=''){const response=await history.GET(new Request('https://steady.test/api/history'+query));return{status:response.status,headers:response.headers,body:await response.json()};}
const snapshot=JSON.stringify({id:'fixture',title:'Private fixture',kind:'lecture',goal:'net',plannedDate:today,dueDate:today,estimatedMinutes:45,status:'Completed',completionDate:today,completedDate:today,completedAt:now,notes:'Private test note'});
try{
 for(let i=0;i<65;i++){
  test.sqlite.prepare('INSERT INTO events(operation_id,owner_id,task_id,action,snapshot,happened_at,local_date,request) VALUES(?,?,?,?,?,?,?,?)').run('task'+i,owner,'fixture','edited',snapshot,now,today,'{}');
  for(const table of ['workspace_events','habit_events'])test.sqlite.prepare(`INSERT INTO ${table}(operation_id,owner_id,entity_id,entity_type,action,snapshot,happened_at,local_date,request) VALUES(?,?,?,?,?,?,?,?,?)`).run(table+i,owner,i===0&&table==='workspace_events'?'settings':'fixture',i===0&&table==='workspace_events'?'settings':'record','edited',i===0&&table==='workspace_events'?JSON.stringify({lectureTarget:4,lectureStretch:5}):snapshot,now,previous,'{}');
  test.sqlite.prepare('INSERT INTO application_events(operation_id,owner_id,application_id,action,snapshot,happened_at,local_date,request) VALUES(?,?,?,?,?,?,?,?)').run('app'+i,owner,'app-a','edited',snapshot,now,today,'{}');
  test.sqlite.prepare('INSERT INTO points_ledger(event_key,owner_id,activity_key,action,delta,activity_date,label,happened_at,local_date) VALUES(?,?,?,?,?,?,?,?,?)').run('points'+i,owner,'activity'+i,i===0?'redemption':i===1?'refund':'award',i===0?-100:i===1?100:20,today,'Private award',now,today);
  if(i>1)test.sqlite.prepare('INSERT INTO points_awards(id,activity_key,owner_id,kind,amount,active,activity_date,label,first_awarded_at) VALUES(?,?,?,?,?,?,?,?,?)').run('award'+i,'activity'+i,owner,'lecture',20,1,today,'Private award',now);
 }
 // Put another application's recent changes ahead of app-a's entire history.
 for(let i=0;i<60;i++)test.sqlite.prepare('INSERT INTO application_events(operation_id,owner_id,application_id,action,snapshot,happened_at,local_date,request) VALUES(?,?,?,?,?,?,?,?)').run('other-app'+i,owner,'app-b','edited',snapshot,now,today,'{}');
 test.sqlite.prepare('INSERT INTO events(operation_id,owner_id,task_id,action,snapshot,happened_at,local_date,request) VALUES(?,?,?,?,?,?,?,?)').run('other-account','other-owner','fixture','edited',snapshot,now,today,'{}');
 const fingerprint=()=>JSON.stringify(['events','application_events','workspace_events','habit_events','points_ledger','points_awards'].map(t=>test.sqlite.prepare('SELECT * FROM '+t+' ORDER BY rowid').all()));
 const before=fingerprint();let state=await(await api.GET()).json();
 for(const [stream,key] of [['tasks','events'],['applications','applicationEvents'],['workspace','workspaceEvents'],['habits','habitEvents'],['points','pointsHistory']]){
  check(state[key].length===50&&state.historyHasMore[stream],'Bounded initial '+stream+' page');
  const first=await page('?stream='+stream);check(first.status===200&&first.body.events.length===50&&first.body.hasMore,'First '+stream+' page');
  const second=await page('?stream='+stream+'&before='+first.body.events.at(-1).sequence);check(second.status===200&&second.body.events.every(e=>e.sequence<first.body.events.at(-1).sequence),'Exclusive '+stream+' cursor');
  check(!second.body.events.some(e=>first.body.events.some(f=>f.sequence===e.sequence)),'No overlapping '+stream+' rows');
  const repeated=await page('?stream='+stream+'&before='+first.body.events.at(-1).sequence);check(JSON.stringify(repeated.body)===JSON.stringify(second.body),'Read retry is stable for '+stream);
 }
 check(state.availablePoints===1260&&state.earnedPoints===1260,'Balances include older ledger pages');
 const summary=review.weeklySummary(state,today);check(summary.points.spent===100&&summary.points.refunds===100&&summary.points.ledgerEntries===65,'Weekly spending/refunds include transactions outside the loaded page');
 check(review.weeklySummary(state,previous).lectures.daily.find(d=>d.date===previous)?.target===4,'Historical targets survive paging past the settings event');
 check(review.weeklySummary(state,previous).lectures.daily.find(d=>d.date===previous)?.hasEntries,'Historical lecture evidence survives bounded event pages');
 check(state.applicationEvents.every(e=>e.applicationId==='app-b'),'Recent application page can omit an older selected record');
 const selected=await page('?stream=applications&entity=app-a');check(selected.body.events.length===50&&selected.body.hasMore&&selected.body.events.every(e=>e.applicationId==='app-a'),'Entity history retrieves the selected record independently');
 const tail=await page('?stream=applications&entity=app-a&before='+selected.body.events.at(-1).sequence);check(tail.body.events.length===15&&!tail.body.hasMore,'Entity history reaches the oldest saved changes');
 const work=await page('?stream=workspace&entity=fixture');check(work.body.events.every(e=>e.entityType==='record'),'Record history excludes settings audit entries');
 for(const query of ['?stream=unknown','?before=0','?before=-1','?before=1.5','?before=','?before=9007199254740992','?stream=events%20WHERE%201=1','?entity='+ 'a'.repeat(181)])check((await page(query)).status===400,'Malformed cursor/stream/entity rejected');
 check((await page('?stream=applications&entity=%27%20OR%201%3D1')).body.events.length===0,'Entity SQL injection is bound as data');
 test.user=null;check((await page()).status===401,'Anonymous history is rejected');
 test.user={userId:'other-owner',email:'other@example.invalid'};check((await page('?stream=applications&entity=app-a')).body.events.length===0,'Entity history is owner isolated');
 check((await page()).body.events.length===1,'Global history is owner isolated');test.user={userId:owner,email:'test@example.invalid'};
 const logs=[],originalError=console.error;console.error=(...values)=>logs.push(values);test.failRead=true;
 let failure;try{failure=await page('?stream=points');}finally{test.failRead=false;console.error=originalError;}
 check(failure.status===503&&failure.headers.get('cache-control')==='private, no-store','Failed history loads are retryable and uncached');
 check(logs.length===1&&!JSON.stringify(logs).includes('PRIVATE')&&!JSON.stringify(logs).includes('credential'),'Failure logs contain only fixed operation metadata');
 check((await page('?stream=points')).status===200,'History recovers after a failed load');
 check(fingerprint()===before,'Paging, failures, summaries and owner checks do not mutate histories or points');
 test.reopen();state=await(await api.GET()).json();check(state.availablePoints===1260&&(await page('?stream=applications&entity=app-a')).body.events.length===50,'History and balances persist after database reopen');
 const merged=helpers.mergeHistory([{sequence:3,label:'latest'},{sequence:2}],[{sequence:3,label:'old'},{sequence:1}]);check(merged.length===3&&merged[0].label==='latest'&&merged[2].sequence===1,'Refresh/page merging prevents duplicates and keeps older rows');
 const ui=renderToStaticMarkup(React.createElement(Feed,{stream:'points',seed:[{sequence:1}],hasMore:true},rows=>React.createElement('p',null,rows.length+' entries')));check(ui.includes('Load older changes')&&ui.includes('aria-live="polite"'),'History offers a labelled, accessible load control');
 const retired=await import(test.moduleURL('app/api/requested-applications/route.ts'));check((await retired.POST()).status===410&&fingerprint()===before,'Retired maintenance route cannot change records');
 console.log(`PASS: ${checks} history/reliability checks (bounded cursors, per-record paging, owner isolation, complete accounting/reviews, retry, safe logs, refresh merge and durable storage; not browser E2E).`);
}finally{test.close();}
