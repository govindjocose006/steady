import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
const root=new URL('../',import.meta.url).pathname,cache=new Map();
const resolver=createRequire(root+'/package.json');
const encode=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
function moduleURL(file){const absolute=path.resolve(root,file);if(cache.has(absolute))return cache.get(absolute);let source=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 source=source.replace(/from (["'])([^"']+)\1/g,(full,quote,spec)=>{let url;if(spec.startsWith('@/')||spec.startsWith('.')){const base=spec.startsWith('@/')?path.resolve(root,spec.slice(2)):path.resolve(path.dirname(absolute),spec);const file=[base,base+'.ts',base+'.tsx',base+'/index.ts'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());url=moduleURL(file);}else if(spec==='radix-ui'){globalThis.__auditRadix=resolver(spec);url=encode('export const Dialog=globalThis.__auditRadix.Dialog;');}else url=pathToFileURL(resolver.resolve(spec)).href;return 'from '+JSON.stringify(url);});const url=encode(source);cache.set(absolute,url);return url;}
const {HistoryNavigator,browserHistoryPort,pageRoute,routeURL,readRoute,views}=await import(moduleURL('lib/navigation.ts'));
const {DraftRegistry}=await import(moduleURL('lib/unsaved.ts'));
const {defaultSettings}=await import(moduleURL('lib/workspace.ts'));
const {defaultMotivation}=await import(moduleURL('lib/motivation.ts'));
const {emptyPlan}=await import(moduleURL('lib/planning.ts'));
const {TodayWorkSurface,GoalProgress,TaskSurface}=await import(moduleURL('app/today-surface.tsx'));
const {default:Dashboard}=await import(moduleURL('app/dashboard.tsx'));
const {default:Upcoming}=await import(moduleURL('app/application-summary.tsx'));
const {UnsavedChangesProvider}=await import(moduleURL('app/unsaved-changes.tsx'));
let checks=0;function check(value,message){assert.ok(value,message);checks++;}
// The same controller used by the app, with an asynchronous history-port adapter.
class HistoryPort {
 entries=[{url:'/',state:{framework:'preserved'}}];position=0;pending=[];listeners=new Set();
 current=()=>this.entries[this.position];
 replace=(url,state)=>{this.entries[this.position]={url,state};};
 push=(url,state)=>{this.entries=this.entries.slice(0,this.position+1);this.entries.push({url,state});this.position++;};
 go=delta=>{this.pending.push(delta);};
 listen=listener=>{this.listeners.add(listener);return()=>this.listeners.delete(listener);};
 flush(){let count=0;while(this.pending.length){if(++count>20)throw new Error('History loop');const position=this.position+this.pending.shift();if(position<0||position>=this.entries.length)continue;this.position=position;for(const listener of this.listeners)listener();}}
}
for(const view of views)check(readRoute(routeURL(pageRoute(view))).view===view,'Every page has a round-trip URL: '+view);
const id='11111111-1111-4111-8111-111111111111';
for(const view of ['applications','study','research','habits']){const r={...pageRoute(view),applicationId:id,workspaceRecordId:id,habitId:id},parsed=readRoute(routeURL(r));check(parsed.view===view&&[parsed.applicationId,parsed.workspaceRecordId,parsed.habitId].includes(id),'Record URLs restore selection: '+view);}
check(readRoute('/applications?application=bad').applicationId===null&&readRoute('/unknown').view==='today','Invalid record URLs and unknown views fall back safely');
const port=new HistoryPort(),registry=new DraftRegistry();let active='today',busy=false,confirmation=null,applied=0;
const nav=new HistoryNavigator(port,r=>{active=r.view;applied++;},()=>registry.dirty,()=>busy,(proceed,cancel)=>{confirmation={request:registry.request(proceed),cancel};});
check(port.current().state.framework==='preserved'&&port.current().state.steadyIndex===0,'Initial entry preserves framework state and receives an index');
nav.push(pageRoute('applications'));nav.push(pageRoute('study'));check(active==='study'&&port.entries.length===3,'Page switches create ordinary history entries');
nav.push(pageRoute('study'));check(port.entries.length===3,'Repeated current-page navigation adds no duplicate entry');
port.go(-1);port.flush();check(active==='applications'&&port.current().url==='/applications','Clean Back restores the prior page and URL');
port.go(1);port.flush();check(active==='study','Clean Forward restores the next page');
let saves=0,discarded=0,fail=true;
function makeDirty(){registry.set('plan',{label:'Day plan',save:async()=>{saves++;if(fail)return false;registry.set('plan',null);return true;},discard:()=>{discarded++;registry.set('plan',null);}});}
makeDirty();const before=applied;port.go(-1);port.flush();check(active==='study'&&port.current().url==='/study'&&confirmation?.request&&applied===before,'Dirty Back restores the accepted URL before asking; no page is unmounted');
check(saves===0&&discarded===0,'Opening the navigation prompt never saves or discards drafts');
confirmation.cancel();confirmation=null;check(registry.dirty&&port.position===2,'Keep editing retains draft and history position');
port.go(-1);port.flush();check(confirmation?.request,'Another Back attempt can prompt after Keep editing');
check(!await registry.save(confirmation.request),'A failed Save and continue is rejected');confirmation.cancel();confirmation=null;
check(registry.dirty&&active==='study'&&port.position===2,'Failed save keeps input, page and URL');
port.go(-1);port.flush();fail=false;check(await registry.save(confirmation.request),'Save retry succeeds');confirmation=null;port.flush();check(active==='applications'&&port.position===1&&!registry.dirty&&saves===2,'Successful save traverses the original Back entry once');
makeDirty();port.go(1);port.flush();check(active==='applications'&&port.position===1&&confirmation?.request,'Dirty Forward also restores the accepted entry and prompts');
registry.discard(confirmation.request);confirmation=null;port.flush();check(active==='study'&&!registry.dirty&&discarded===1,'Discard then Forward traverses once and clears only the draft');
busy=true;port.go(-1);port.flush();check(active==='study'&&port.position===2&&!confirmation,'History navigation during a save stays at the current entry');nav.push(pageRoute('rewards'));check(active==='study','Page navigation during a save is ignored');busy=false;
port.go(-1);port.flush();nav.push(pageRoute('research'));check(active==='research'&&port.entries.length===3&&port.current().url==='/research','New navigation after Back replaces only the forward branch');
check(port.entries.every(e=>Object.keys(e.state).every(k=>['steadyIndex','framework'].includes(k))),'History state contains routing indexes, no private draft data');
nav.dispose();const appliedBefore=applied;port.go(-1);port.flush();check(applied===appliedBefore,'Disposal removes the popstate subscription');
const state={today:'2026-10-03',serverNow:'2026-10-03T06:00:00Z',tasks:[],events:[],hasMore:false,applications:[],applicationEvents:[],workspaceRecords:[],workspaceEvents:[],catalog:[],settings:defaultSettings,motivation:defaultMotivation,awards:[],pointsHistory:[],availablePoints:80,earnedPoints:80,rewards:[],redemptions:[],habits:[],focusSessions:[],habitEvents:[],dayPlans:[],dayTemplates:[],weeklyReviews:[]};
const task=(id,title,goal='net')=>({id,title,goal,kind:goal==='net'?'lecture':'research',dueDate:state.today,minutes:45,completedAt:null,completedDate:null,createdAt:state.serverNow,updatedAt:state.serverNow,version:1});
state.tasks=[task('t1','Quantum mechanics'),task('t2','Thermodynamics'),task('t3','Analyse data','research')];state.dayPlans=[{...emptyPlan(state.today),taskIds:['t1','t2','t3'],priorityIds:['t2','t1','t3'],availableMinutes:180}];
const beforeState=JSON.stringify(state),props={data:state,busy:false,mutate:async()=>{throw new Error('Presentation must not save');},onOpen:()=>{},onComplete:()=>{},onNavigate:()=>{}};
const render=(component,props)=>renderToStaticMarkup(React.createElement(UnsavedChangesProvider,null,React.createElement(component,props)));
const shell=render(Dashboard,{initialView:'applications'});
check(shell.includes('Skip to content')&&shell.includes('aria-label="Mobile navigation"')&&shell.includes('aria-expanded="false"'),'Shell offers a skip link and a labelled mobile More control');
const main=shell.match(/<main[\s\S]*?<\/main>/)[0];check(main.includes('Pending opportunities and your application history.')&&!main.includes('Daily planning')&&!main.includes('Separate goal progress'),'Applications main content stays focused on applications');
const desktop=shell.match(/<nav class="desktop-navigation"[\s\S]*?<\/nav>/)[0];check((desktop.match(/<button/g)||[]).length===9,'All nine existing pages stay available in desktop navigation');
const mobile=shell.match(/<nav class="mobile-navigation"[\s\S]*?<\/nav>/)[0];check((mobile.match(/<button/g)||[]).length===5&&mobile.includes('PhD')&&mobile.includes('Research')&&mobile.includes('More'),'Mobile uses four main destinations plus More');
const ui=render(TodayWorkSurface,props);
check(ui.indexOf('Plan my day')<ui.indexOf('Separate goal progress')&&ui.indexOf('Separate goal progress')<ui.indexOf('Habits and points today'),'The actual Today work surface renders plan before goals and supporting habits');
check(ui.indexOf('Main priorities')<ui.indexOf('Available work time'),'Priorities appear near the top of the plan');
const priority=ui.match(/<section class="plan-priorities"[\s\S]*?<\/section>/)[0];check((priority.match(/<li(?: |>)/g)||[]).length===3&&priority.indexOf('Thermodynamics')<priority.indexOf('Quantum mechanics'),'Three main priorities retain the chosen order');
check(ui.includes('2h 15m')&&ui.includes('3h'),'Time totals remain based on each selected task once, despite priority shortcuts');
const goalsUI=render(GoalProgress,{data:state});check((goalsUI.match(/class="goal-indicator /g)||[]).length===3&&goalsUI.includes('No daily quota'),'Three goals are shown separately; research receives no arbitrary quota');
check(ui.includes('Not logged')&&ui.includes('Available points'),'Truthful phone state and separate points remain visible');
const backlog=render(TaskSurface,{collapsed:true,count:7,children:'Pending items'});check(backlog.startsWith('<details')&&!backlog.includes('<details open')&&backlog.includes('7 tasks')&&backlog.includes('Show tasks'),'Backlog starts collapsed with a count and a native keyboard-accessible summary');
check(render(TaskSurface,{collapsed:false,count:7,children:'Upcoming items'}).startsWith('<div'),'Other pages are not collapsed into the Today backlog');
state.applications=[{id:'a1',institution:'Submitted institution',projectTitle:'Submitted position',country:'Germany',stage:'Submitted',deadline:'2026-11-01',submissionDate:state.today,notes:'Saved history',nextAction:'',checklist:[],opportunity:{},version:1,createdAt:state.serverNow,updatedAt:state.serverNow}];
check(!render(Upcoming,{applications:state.applications,today:state.today,onOpen:()=>{}}).includes('Submitted position'),'Submitted applications stay excluded from actionable Upcoming');state.applications=[];
check(JSON.stringify(state)===beforeState,'Rendering the daily surface and summaries does not change records, points or history');
// Exercise the actual browser adapter's router handoff without a live browser.
let handler=null,removed=false,called=0,stopped=0;
const previousWindow=globalThis.window;
globalThis.window={location:{pathname:'/study',search:'?record='+id},history:{state:{steadyIndex:3},replaceState:()=>{},pushState:()=>{},go:()=>{}},addEventListener:(type,callback,capture)=>{check(type==='popstate'&&capture===true,'The adapter installs a capture listener before framework bubble handlers');handler=callback;},removeEventListener:(type,callback,capture)=>{removed=type==='popstate'&&callback===handler&&capture===true;}};
const browserPort=browserHistoryPort(),dispose=browserPort.listen(()=>called++);
check(browserPort.current().url==='/study?record='+id,'The adapter reads the full record URL');
handler({state:{steadyIndex:2},stopImmediatePropagation:()=>stopped++});check(called===1&&stopped===1,'Owned history entries are handled without allowing the framework to unmount drafts');
handler({state:{otherRouter:true},stopImmediatePropagation:()=>stopped++});check(called===1&&stopped===1,'Unowned history entries keep normal framework handling');dispose();check(removed,'Adapter cleanup removes exactly its own capture listener');
if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;
console.log('PASS: '+checks+' daily-surface/navigation checks (real controller with async history adapter and SSR; browser layout/keyboard/zoom remain unverified).');
