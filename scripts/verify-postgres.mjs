import assert from 'node:assert/strict';
import {postgresWorkspace} from './postgres-harness.mjs';
const test=await postgresWorkspace(),uuid=()=>crypto.randomUUID();let checks=0;
const check=(v,m)=>{assert.ok(v,m);checks++;};
const api=await import(test.moduleURL('app/api/tasks/route.ts')),apps=await import(test.moduleURL('app/api/applications/route.ts')),work=await import(test.moduleURL('app/api/workspace/route.ts')),mot=await import(test.moduleURL('app/api/motivation/route.ts')),planning=await import(test.moduleURL('app/api/planning/route.ts'));
const model=await import(test.moduleURL('lib/tasks.ts')),motivation=await import(test.moduleURL('lib/motivation.ts'));
async function post(route,op){const r=await route.POST(new Request('https://steady.test/api/test',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://steady.test'},body:JSON.stringify(op)}));return {status:r.status,body:await r.json()};}
async function ok(route,op){const r=await post(route,{operationId:uuid(),...op});assert.equal(r.status,200,JSON.stringify(r.body));checks++;return r.body;}
async function state(){const r=await api.GET();assert.equal(r.status,200);return r.json();}
try{
 let s=await state();check(s.tasks.length===0&&s.availablePoints===0,'New account starts empty');const today=model.indiaDate();
 const id=uuid(),create={action:'create',operationId:uuid(),id,fields:{title:"Test ' quoted ?; SELECT private",goal:'research',kind:'research',dueDate:today,minutes:30}};
 s=await ok(api,create);check(s.tasks[0].title===create.fields.title&&s.tasks[0].dueDate===today,'Bound text and camelCase aliases survive Postgres');
 s=await ok(api,create);check(s.tasks.length===1&&s.events.length===1,'Duplicate create is idempotent');
 s=await ok(api,{action:'complete',id,version:1,completed:true});check(s.availablePoints===40&&s.tasks[0].completedDate===today,'Completion and award commit together');
 s=await ok(api,{action:'complete',id,version:2,completed:false});check(s.availablePoints===0,'Undo reverses the saved award');
 s=await ok(api,{action:'complete',id,version:3,completed:true});check(s.availablePoints===40&&s.awards.length===1,'Recompletion leaves one net award');
 const stale=await post(api,{action:'complete',operationId:uuid(),id,version:1,completed:false});check(stale.status===409,'Stale edit rejected');
 const count=s.tasks.length;test.failNext=true;const fail=await post(api,{...create,id:uuid(),operationId:uuid()});check(fail.status===503&&(await state()).tasks.length===count,'Interrupted batch rolls back');
 const record=uuid(),taskId=uuid();s=await ok(work,{action:'create',id:record,taskId,kind:'lecture',fields:{title:'Lecture one',plannedDate:today,estimatedMinutes:45}});
 s=await ok(work,{action:'status',id:record,version:1,status:'In progress'});check(s.workspaceRecords.find(r=>r.id===record).status==='In progress','Partial lecture state saved');
 s=await ok(api,{action:'complete',id:taskId,version:s.tasks.find(t=>t.id===taskId).version,completed:true});check(s.workspaceRecords.find(r=>r.id===record).status==='Completed'&&s.availablePoints===60,'Linked task updates lecture and earns once');
 s=await ok(work,{action:'status',id:record,version:s.workspaceRecords.find(r=>r.id===record).version,status:'Completed'});check(s.availablePoints===60,'Completing linked record again does not award twice');
 const reward=uuid();s=await ok(mot,{action:'reward',id:reward,fields:{name:'Small reward',description:'',cost:20,archived:false}});const redemption=uuid();s=await ok(mot,{action:'redeem',id:redemption,rewardId:reward,rewardVersion:1});check(s.availablePoints===40&&s.earnedPoints===60,'Redemption changes available only');
 s=await ok(mot,{action:'refund',id:redemption,version:1});check(s.availablePoints===60,'Refund restores available');
 s=await ok(mot,{action:'refund',id:redemption,version:2});check(s.availablePoints===60,'Repeated refund does not duplicate credit');
 check(motivation.defaultMotivation.points.lecture===20,'Default targets unchanged');
 const application=uuid();s=await ok(apps,{action:'create',id:application,fields:{institution:'Fixture university',country:'Test',projectTitle:'Private position',supervisor:'',link:'',deadline:today,notes:'Keep these notes',nextAction:'Prepare CV',stage:'Shortlisted',checklist:[],submissionDate:null}});
 check(s.applications.some(a=>a.id===application),'Application saved');
 const appTask=uuid();s=await ok(apps,{action:'plan',id:application,version:1,taskId:appTask,dueDate:today,minutes:30,kind:'preparation'});
 let a=s.applications.find(a=>a.id===application);
 s=await ok(apps,{action:'edit',id:application,version:a.version,fields:{...a,stage:'Submitted',submissionDate:today}});
 const applicationModel=await import(test.moduleURL('lib/applications.ts'));
 check(!applicationModel.taskApplicationActive(s.tasks.find(t=>t.id===appTask),s.applications),'Submitted application preparation is hidden');
 const awarded=s.availablePoints;a=s.applications.find(a=>a.id===application);
 s=await ok(apps,{action:'edit',id:application,version:a.version,fields:{...a,stage:'Interview'}});check(s.availablePoints===awarded,'Later application stage preserves one submission award');
 a=s.applications.find(a=>a.id===application);s=await ok(apps,{action:'edit',id:application,version:a.version,fields:{...a,submissionDate:model.previousDate(today)}});check(s.availablePoints===awarded,'Submission date correction adds no award');
 const phone=uuid();s=await ok(mot,{action:'habit',id:phone,kind:'phone',fields:{date:today,minutes:0,status:'Logged'}});check(s.habits.find(h=>h.id===phone).minutes===0,'Explicit zero phone use survives Postgres');
 const workout=uuid(),workoutTask=uuid();s=await ok(mot,{action:'habit',id:workout,taskId:workoutTask,kind:'workout',fields:{activityName:'Walk',date:today,minutes:15,status:'Planned'}});
 s=await ok(api,{action:'complete',id:workoutTask,version:1,completed:true});const workoutPoints=s.availablePoints;
 s=await ok(mot,{action:'habit',id:uuid(),taskId:uuid(),kind:'workout',fields:{activityName:'Stretch',date:today,minutes:10,status:'Completed'}});check(s.availablePoints===workoutPoints,'Multiple workouts share the daily award');
 const focus=uuid();s=await ok(mot,{action:'focus-start',id:focus,minutes:25});s=await ok(mot,{action:'focus',id:focus,version:1,command:'pause'});check(s.focusSessions.find(f=>f.id===focus).status==='Paused','Pause persists timer');s=await ok(mot,{action:'focus',id:focus,version:2,command:'resume'});s=await ok(mot,{action:'focus',id:focus,version:3,command:'cancel'});check(s.availablePoints===workoutPoints,'Cancelled focus adds no award');
 const session=uuid();s=await ok(work,{action:'create',id:session,taskId:uuid(),kind:'session',fields:{title:'Revision',plannedDate:today,estimatedMinutes:25,actualMinutes:17,sessionType:'revision'}});s=await ok(work,{action:'status',id:session,version:1,status:'Completed'});check(s.workspaceRecords.find(r=>r.id===session).actualMinutes===17,'Recorded practice time preserved');
 s=await ok(mot,{action:'settings',id:uuid(),version:0,fields:{...motivation.defaultMotivation,points:{...motivation.defaultMotivation.points,lecture:25}}});
 const laterLecture=uuid();s=await ok(work,{action:'create',id:laterLecture,taskId:uuid(),kind:'lecture',fields:{title:'Lecture two',plannedDate:today}});const prior=s.availablePoints;s=await ok(work,{action:'status',id:laterLecture,version:1,status:'Completed'});check(s.availablePoints===prior+25,'JSON numeric point settings work in Postgres');
 const snapshot=JSON.stringify(s.pointsHistory);s=await ok(planning,{action:'plan',id:uuid(),date:today,version:0,fields:{availableMinutes:120,taskIds:[],priorityIds:[]}});check(JSON.stringify(s.pointsHistory)===snapshot,'Planning does not alter ledger');
 s=await ok(planning,{action:'plan',date:today,version:1,fields:{availableMinutes:90,taskIds:[],priorityIds:[]}});check(s.dayPlans.find(p=>p.date===today).availableMinutes===90,'Plan upsert edits one day');
 await assert.rejects(()=>test.rpc([`UPDATE tasks SET owner_id='${test.other}' WHERE id='${id}'`]));checks++;
 const changedAccount=await api.POST(new Request('https://steady.test/api/tasks',{method:'POST',headers:{'Content-Type':'application/json','X-Steady-Account':test.other},body:JSON.stringify(create)}));check(changedAccount.status===403,'Draft cannot save after changing accounts');
 test.user={userId:test.other,email:'other@example.invalid'};s=await state();check(s.tasks.length===0&&s.applications.length===0&&s.availablePoints===0,'Another account cannot see records');
 const forbidden=await post(api,{action:'complete',id,version:4,completed:false,operationId:uuid()});check(forbidden.status===404,'Another account cannot modify task');
 check((await test.rpc([`SELECT * FROM tasks WHERE owner_id='${test.owner}'`]))[0].results.length===0,'RLS independently blocks explicit other owner');
 await assert.rejects(()=>test.rpc(['SELECT * FROM tasks'],{key:'wrong-server-key-that-is-long-enough'}));checks++;
 await assert.rejects(()=>test.rpc(['SELECT * FROM tasks'],{as:''}));checks++;
 test.user=null;check((await api.GET()).status===401,'Missing verified identity rejected');
 console.log(`PASS: ${checks} real Postgres/API checks (atomic saves, ledger, links, SQL values, isolation, server gate and replay).`);
}finally{await test.close();}
