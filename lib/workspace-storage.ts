import {historyStatement} from './history-storage';
import {getDb} from '@/db';
import {indiaDate,type Task} from './tasks';
import {defaultSettings,recordTaskKind,type WorkspaceRecord,type WorkspaceEvent,type CatalogItem,type WorkFields} from './workspace';
type StoredRecord={id:string;kind:WorkspaceRecord['kind'];data:string;createdAt:string;updatedAt:string;version:number};
export const workspaceColumns='id,kind,data,created_at AS createdAt,updated_at AS updatedAt,version';
export const catalogColumns='id,kind,name,parent_id AS parentId,created_at AS createdAt,updated_at AS updatedAt,version';
export function decodeRecord(row:StoredRecord):WorkspaceRecord{return {...JSON.parse(row.data),id:row.id,kind:row.kind,createdAt:row.createdAt,updatedAt:row.updatedAt,version:row.version};}
export async function readWorkspaceRecord(owner:string,id:string){const row=await getDb().prepare(`SELECT ${workspaceColumns} FROM workspace_records WHERE owner_id=? AND id=?`).bind(owner,id).first<StoredRecord>();return row?decodeRecord(row):null;}
export async function readCatalogItem(owner:string,id:string){return getDb().prepare(`SELECT ${catalogColumns} FROM workspace_catalog WHERE owner_id=? AND id=?`).bind(owner,id).first<CatalogItem>();}
export function workspaceReadStatements(db:D1Database,owner:string){return [
 db.prepare(`SELECT ${workspaceColumns} FROM workspace_records WHERE owner_id=? ORDER BY created_at,id`).bind(owner),
 db.prepare(`SELECT ${catalogColumns} FROM workspace_catalog WHERE owner_id=? ORDER BY kind,name,id`).bind(owner),
 db.prepare('SELECT data,version FROM workspace_settings WHERE owner_id=?').bind(owner),
 historyStatement(db,owner,'workspace')
];}
export function decodeWorkspace(r:D1Result[]){const settings=r[2].results[0] as {data:string;version:number}|undefined;return {workspaceRecords:(r[0].results as StoredRecord[]).map(decodeRecord),catalog:r[1].results as CatalogItem[],settings:settings?{...defaultSettings,...JSON.parse(settings.data),version:settings.version}:defaultSettings,workspaceEvents:r[3].results as WorkspaceEvent[]};}
export function workspaceEvent(db:D1Database,owner:string,id:string,type:WorkspaceEvent['entityType'],next:unknown,previous:unknown,action:string,operationId:string,request:string,now:string,guard='TRUE',args:(string|number|null)[]=[]){return db.prepare(`INSERT INTO workspace_events(operation_id,owner_id,entity_id,entity_type,action,snapshot,previous,happened_at,local_date,request) SELECT ?,?,?,?,?,?,?,?,?,? WHERE ${guard}`).bind(operationId,owner,id,type,action,JSON.stringify(next),previous?JSON.stringify(previous):null,now,indiaDate(),request,...args);}
export function followupKey(r:Pick<WorkFields,'title'|'plannedDate'|'sourceRecordId'>){return r.sourceRecordId?r.plannedDate+':'+r.title.trim().toLowerCase().replace(/\s+/g,' '):null;}
export function workspaceRecordUpdate(db:D1Database,owner:string,r:WorkspaceRecord,operationId:string,proofTable='workspace_events'){return db.prepare(`UPDATE workspace_records SET data=?,source_record_id=?,followup_key=?,updated_at=?,version=? WHERE owner_id=? AND id=? AND version=? AND EXISTS(SELECT 1 FROM ${proofTable} WHERE owner_id=? AND operation_id=?)`).bind(JSON.stringify(r),r.sourceRecordId,followupKey(r),r.updatedAt,r.version,owner,r.id,r.version-1,owner,operationId);}
export function taskFromRecord(r:WorkspaceRecord,id:string,now:string,previous?:Task|null):Task{return {...(previous||{}),id,title:r.title,goal:r.kind==='research'?'research':'net',kind:recordTaskKind(r),dueDate:r.plannedDate,minutes:r.estimatedMinutes,completedAt:r.status==='Completed'?previous?.completedAt||now:null,completedDate:r.status==='Completed'?r.completionDate:null,applicationId:null,applicationActionKey:null,workspaceRecordId:r.id,createdAt:previous?.createdAt||now,updatedAt:now,version:previous?previous.version+1:1};}
