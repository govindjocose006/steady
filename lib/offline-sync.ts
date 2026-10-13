import {acknowledge,snapshot,type OfflineData} from './offline';
import type {State} from './tasks';
export async function syncOffline(read:()=>Promise<OfflineData|null>,write:(d:OfflineData)=>Promise<void>,request:typeof fetch=fetch){
 let data=await read();if(!data)return;
 const account=await request('/api/account',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!account.ok)throw new Error('Connect and sign in to the original Google account to sync. Your device changes are retained.');
 const identity=await account.json() as {id?:string};if(identity.id!==data.accountId)throw new Error('A different account is signed in. Switch back to the original account. Nothing was synced.');
 while(data.queue.length){const op=data.queue[0];
  const response=await request('/api/tasks',{method:'POST',headers:{'Content-Type':'application/json','X-Steady-Account':data.accountId},body:JSON.stringify(op),signal:AbortSignal.timeout(15000)});
  const state=await response.json() as State&{error?:string};
  if(!response.ok)throw new Error(response.status===409?'Sync paused: this task changed elsewhere. Your offline edits are kept. Review them, then discard the queued edits and refresh, or resolve the task online.':state.error||'Sync failed. Your changes are still on this device.');
  if(state.accountId!==data.accountId)throw new Error('Account changed. Sync stopped.');
  data=acknowledge(data,op.operationId,state.serverNow);await write(data);
 }
 const response=await request('/api/tasks',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Changes synced, but the refreshed task list could not load. Retry.');
 const state=await response.json() as State;if(state.accountId!==data.accountId)throw new Error('Account changed. Refresh stopped.');await write(snapshot(state));
}
