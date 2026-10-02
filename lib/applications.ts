export const stages = ['Shortlisted','Preparing','Submitted','Interview','Offer','Rejected','Withdrawn'] as const;
export type Stage = typeof stages[number];
export type ChecklistItem = { id:string; label:string; done:boolean };
export type ProjectPreference = {code:string; title:string; fitPriority:number; fitNotes:string; link:string};
export type Opportunity = {fitPriority?:number|null; fitNotes?:string; aliases?:string[]; preferences?:ProjectPreference[]; verifiedOn?:string; recruitment?:string; verificationNote?:string; closingAt?:string|null; closingLabel?:string; closingTimezone?:string; rolling?:boolean; workflowLink?:string};
export type Application = { id:string; institution:string; country:string; projectTitle:string; supervisor:string; link:string; deadline:string|null; notes:string; nextAction:string; stage:Stage; checklist:ChecklistItem[]; submissionDate:string|null; submissionTaskId:string|null; createdAt:string; updatedAt:string; version:number; opportunity?:Opportunity };
export type ApplicationEvent = {sequence:number; applicationId:string; action:string; snapshot:string; previous:string|null; happenedAt:string; localDate:string};
export const commonDocuments = ['CV','Motivation letter','Transcripts','References'];
export function actionKey(title:string) {return title.trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');}
export function deadlineDays(deadline:string,today:string) {return Math.round((Date.parse(deadline+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/86400000);}
export function needsPreparation(a:Application) {return !a.submissionDate&&(a.stage==='Shortlisted'||a.stage==='Preparing');}
export function applicationLabel(a:Application) {return a.projectTitle?`${a.institution} · ${a.projectTitle}`:a.institution;}

export type ApplicationSort = 'deadline'|'fit';
export function displayDeadline(a:Application){return a.opportunity?.closingAt?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(a.opportunity.closingAt)):a.deadline;}
export function compareApplications(a:Application,b:Application,sort:ApplicationSort='deadline'){
 const deadline=(displayDeadline(a)||'9999').localeCompare(displayDeadline(b)||'9999'),fit=(a.opportunity?.fitPriority??9999)-(b.opportunity?.fitPriority??9999);
 return (sort==='fit'?fit||deadline:deadline||fit)||a.institution.localeCompare(b.institution);
}
export function deadlineBadge(a:Application,today:string,now=new Date()){
 const day=displayDeadline(a);if(!day)return null;
 const days=deadlineDays(day,today),passed=a.opportunity?.closingAt?Date.parse(a.opportunity.closingAt)<now.getTime():days<0;
 return passed?'Deadline passed':days<=7?'Due within 7 days':days<=14?'Due within 14 days':days<=30?'Due within 30 days':null;
}
export function taskApplicationActive(task:{applicationId?:string|null},applications:Application[]){return !task.applicationId||!applications.some(a=>a.id===task.applicationId&&!needsPreparation(a));}
