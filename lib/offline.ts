import {indiaDate,type State,type Task} from './tasks';
import {pendingTasks,type DayPlan} from './planning';
export type OfflineOperation={action:'edit'|'complete';id:string;version:number;operationId:string;fields?:{title:string;goal:Task['goal'];kind:Task['kind'];dueDate:string;minutes:number;customPoints:number;applicationId:string|null};completed?:boolean;completedAt?:string};
export type OfflineData={schema:1;accountId:string;savedAt:string;sourceAt:string;tasks:Task[];plans:DayPlan[];queue:OfflineOperation[]};
export function snapshot(state:State):OfflineData{
 if(!state.accountId)throw new Error('Sign in before enabling offline.');
 return {schema:1,accountId:state.accountId,savedAt:new Date().toISOString(),sourceAt:state.serverNow||new Date().toISOString(),tasks:pendingTasks(state),plans:state.dayPlans.filter(p=>p.date>=indiaDate()),queue:[]};
}
export function applyOffline(data:OfflineData,op:OfflineOperation):OfflineData{
 const task=data.tasks.find(t=>t.id===op.id);if(!task||task.version!==op.version)throw new Error('This task changed in another tab. Reopen it.');
 if(data.queue.some(q=>q.operationId===op.operationId))throw new Error('This change is already queued.');
 const next={...task,...(op.action==='edit'?op.fields:{completedAt:op.completed?op.completedAt!:null,completedDate:op.completed?indiaDate(new Date(op.completedAt!)):null}),version:task.version+1};
 return {...data,tasks:data.tasks.map(t=>t.id===op.id?next:t),queue:[...data.queue,op]};
}
export function acknowledge(data:OfflineData,operationId:string):OfflineData{
 if(data.queue[0]?.operationId!==operationId)throw new Error('Queue changed. Reload and retry.');
 return {...data,queue:data.queue.slice(1)};
}

export function mayRefreshOffline(saved:OfflineData,state:State){return saved.accountId===state.accountId&&!saved.queue.length&&Date.parse(state.serverNow)>=Date.parse(saved.sourceAt||saved.savedAt);}
