export const workStatuses=['Planned','In progress','Completed'] as const;
export type WorkStatus=typeof workStatuses[number];
export type RecordKind='lecture'|'session'|'research';
export type CatalogKind='subject'|'topic'|'project'|'category';
export type CatalogItem={id:string;kind:CatalogKind;name:string;parentId:string|null;createdAt:string;updatedAt:string;version:number};
export type WorkFields={title:string;subjectId:string|null;topicId:string|null;projectId:string|null;categoryId:string|null;lectureNumber:string;link:string;plannedDate:string;estimatedMinutes:number;status:WorkStatus;completionDate:string|null;actualMinutes:number|null;sessionType:'practice'|'revision';questionsAttempted:number|null;questionsCorrect:number|null;notes:string;progressNote:string;outcome:string;nextStep:string;sourceRecordId:string|null};
export type WorkspaceRecord=WorkFields&{id:string;kind:RecordKind;createdAt:string;updatedAt:string;version:number};
export type WorkspaceEvent={sequence:number;entityId:string;entityType:'record'|'catalog'|'settings';action:string;snapshot:string;previous:string|null;happenedAt:string;localDate:string};
export type WorkspaceSettings={lectureTarget:number;lectureStretch:number;examDate:string|null;researchDailyTarget:number|null;version:number};
export const defaultSettings:WorkspaceSettings={lectureTarget:2,lectureStretch:3,examDate:null,researchDailyTarget:null,version:0};
export const researchCategories=['Lab work','Experiment preparation','Data analysis','Paper reading','Writing'];
export function recordTaskKind(r:Pick<WorkspaceRecord,'kind'|'sessionType'>){return r.kind==='lecture'?'lecture':r.kind==='research'?'research':r.sessionType;}
export function catalogName(items:CatalogItem[],id:string|null,fallback='Not assigned'){return items.find(x=>x.id===id)?.name||fallback;}
export function subjectProgress(records:WorkspaceRecord[],subjectId:string){const lectures=records.filter(r=>r.kind==='lecture'&&r.subjectId===subjectId);return {completed:lectures.filter(r=>r.status==='Completed').length,total:lectures.length};}
export function workFields(r:WorkspaceRecord):WorkFields{return Object.fromEntries(Object.entries(r).filter(([key])=>!['id','kind','version','createdAt','updatedAt'].includes(key))) as WorkFields;}
