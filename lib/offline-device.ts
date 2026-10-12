import {mayRefreshOffline,snapshot,type OfflineData} from './offline';
import type {State} from './tasks';
const database='steady-offline-v1';
async function db(){return new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(database,1);r.onupgradeneeded=()=>r.result.createObjectStore('device');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('Device storage is unavailable. Nothing was saved offline.'));});}
export async function readOffline():Promise<OfflineData|null>{const d=await db();try{return await new Promise((resolve,reject)=>{const r=d.transaction('device').objectStore('device').get('workspace');r.onsuccess=()=>{const value=r.result;if(value&&(value.schema!==1||typeof value.accountId!=='string'||!Array.isArray(value.tasks)||!Array.isArray(value.queue)||!Array.isArray(value.plans))){reject(new Error('Offline copy could not be read. Do not clear it if changes are pending.'));return;}resolve(value||null);};r.onerror=()=>reject(r.error);});}finally{d.close();}}
export async function writeOffline(value:OfflineData|null){const d=await db();try{await new Promise<void>((resolve,reject)=>{const tx=d.transaction('device','readwrite');if(value)tx.objectStore('device').put(value,'workspace');else tx.objectStore('device').delete('workspace');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error('Device storage failed. Keep this screen open and retry.'));tx.onabort=()=>reject(new Error('Device save interrupted. Retry.'));});window.dispatchEvent(new Event('steady-offline'));if('BroadcastChannel' in window){const channel=new BroadcastChannel('steady-offline');channel.postMessage('changed');channel.close();}}finally{d.close();}}
export function offlineLock<T>(work:()=>Promise<T>){if(!navigator.locks)throw new Error('Use a current Chrome browser for safe offline syncing.');return navigator.locks.request('steady-offline',work);}
export async function updateSnapshot(state:State){return offlineLock(async()=>{const saved=await readOffline();if(saved&&mayRefreshOffline(saved,state))await writeOffline(snapshot(state));});}
export async function clearOffline(){await offlineLock(async()=>{if((await readOffline())?.queue.length)throw new Error('Sync or discard offline changes first.');await writeOffline(null);});}
export async function prepareOffline(){
 if(!('serviceWorker' in navigator))throw new Error('Offline installation is not supported in this browser.');
 const registration=await navigator.serviceWorker.register('/offline-worker.js',{scope:'/'});
 await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(new Error('Offline setup timed out. Stay online and retry.')),25000))]);
 const worker=registration.active||registration.waiting||registration.installing;if(!worker)throw new Error('Offline support is not ready. Retry.');
 if(worker.state!=='activated')await new Promise<void>((resolve,reject)=>{worker.addEventListener('statechange',()=>{if(worker.state==='activated')resolve();else if(worker.state==='redundant')reject(new Error('Offline setup failed. Retry.'));});});
}
