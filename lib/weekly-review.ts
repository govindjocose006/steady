import type {State} from './tasks';
import {addDays,weekDates,weekStart,uniqueTasks} from './planning';
import type {WorkspaceSettings} from './workspace';
export function weeklySummary(s:State,selectedDate:string){
 const start=weekStart(selectedDate),dates=weekDates(start),end=dates[6],elapsed=dates.filter(d=>d<=s.today),inWeek=(d:string|null|undefined)=>!!d&&d>=start&&d<=end&&d<=s.today;
 const doneTasks=uniqueTasks(s.tasks.filter(t=>t.completedAt&&inWeek(t.completedDate)));
 const submitted=s.applications.filter(a=>inWeek(a.submissionDate)),oldSubmitted=doneTasks.filter(t=>t.kind==='application'&&!t.applicationId);
 const records=s.workspaceRecords.filter(r=>r.status==='Completed'&&inWeek(r.completionDate));
 const lectures=records.filter(r=>r.kind==='lecture'),legacyLectures=doneTasks.filter(t=>t.kind==='lecture'&&!t.workspaceRecordId);
 const sessions=records.filter(r=>r.kind==='session'),legacySessions=doneTasks.filter(t=>(t.kind==='practice'||t.kind==='revision')&&!t.workspaceRecordId);
 const research=records.filter(r=>r.kind==='research'),legacyResearch=doneTasks.filter(t=>t.goal==='research'&&!t.workspaceRecordId);
 const workouts=s.habits.filter(h=>h.kind==='workout'&&h.status==='Completed'&&inWeek(h.completionDate));
 const legacyWorkouts=doneTasks.filter(t=>t.kind==='workout'&&!t.habitRecordId),rest=s.habits.filter(h=>h.kind==='workout'&&h.status==='Rest'&&inWeek(h.date));
 const focus=s.focusSessions.filter(f=>f.status==='Finished'&&inWeek(f.completionDate));
 const phone=s.habits.filter(h=>h.kind==='phone'&&h.status==='Logged'&&inWeek(h.date));
 const loggedDays=new Set(phone.map(h=>h.date)),phoneMinutes=phone.reduce((n,h)=>n+h.minutes,0);
 const ledger=s.pointsHistory.filter(e=>inWeek(e.localDate)),redemptions=s.redemptions.filter(r=>inWeek(r.localDate));
 const earned=s.awards.filter(a=>a.active&&inWeek(a.activityDate)).reduce((n,a)=>n+a.amount,0);
 const spent=s.pointsDaily?s.pointsDaily.filter(d=>inWeek(d.date)).reduce((n,d)=>n+d.spent,0):-ledger.filter(e=>e.action==='redemption').reduce((n,e)=>n+e.delta,0),refunds=s.pointsDaily?s.pointsDaily.filter(d=>inWeek(d.date)).reduce((n,d)=>n+d.refunds,0):ledger.filter(e=>e.action==='refund').reduce((n,e)=>n+e.delta,0);
 const settingEvents=(s.reviewEvidence?.settingsEvents||s.workspaceEvents).filter(e=>e.entityType==='settings').sort((a,b)=>b.happenedAt.localeCompare(a.happenedAt)||b.sequence-a.sequence);
 const daily=dates.map(date=>{const event=settingEvents.find(e=>e.localDate<=date);let settings:WorkspaceSettings=s.settings;try{if(event)settings=JSON.parse(event.snapshot) as WorkspaceSettings;}catch{}
 const historicalKnown=!!event||date===s.today;
 const recorded=lectures.filter(r=>r.completionDate===date).length+legacyLectures.filter(t=>t.completedDate===date).length;
 const lectureEntries=!!s.reviewEvidence?.lectureDates.includes(date)||s.workspaceEvents.some(e=>e.entityType==='record'&&e.localDate===date&&JSON.parse(e.snapshot).kind==='lecture')||s.workspaceRecords.some(r=>r.kind==='lecture'&&(r.completionDate===date||r.plannedDate===date))||s.tasks.some(t=>t.kind==='lecture'&&(t.dueDate===date||t.completedDate===date));
 return {date,count:recorded,target:settings.lectureTarget,stretch:settings.lectureStretch,historicalKnown,hasEntries:lectureEntries,future:date>s.today,met:recorded>=settings.lectureTarget};});
 const actual=(values:(number|null)[])=>({minutes:values.reduce<number>((n,v)=>n+(v??0),0),recorded:values.filter(v=>v!==null).length,missing:values.filter(v=>v===null).length});
 const sessionActual=(kind:'practice'|'revision')=>actual([...sessions.filter(r=>r.sessionType===kind).map(r=>r.actualMinutes),...legacySessions.filter(t=>t.kind===kind).map(()=>null)]);
 const hasEntries=(goal:string)=>s.tasks.some(t=>t.goal===goal&&inWeek(t.dueDate))||s.workspaceRecords.some(r=>inWeek(r.plannedDate)&&(goal==='net'?r.kind!=='research':r.kind==='research'));
 return {start,end,nextStart:addDays(start,7),elapsedDays:elapsed.length,partial:elapsed.length<7||(start<=s.today&&s.today<=end),future:start>s.today,
 applications:{count:submitted.length+oldSubmitted.length,records:submitted,legacy:oldSubmitted},
 lectures:{count:lectures.length+legacyLectures.length,daily,hasEntries:lectures.length>0||legacyLectures.length>0||hasEntries('net'),metDays:daily.filter(d=>!d.future&&d.met).length,unknownTargets:daily.filter(d=>!d.future&&!d.historicalKnown).length},
 practice:{count:sessions.filter(r=>r.sessionType==='practice').length+legacySessions.filter(t=>t.kind==='practice').length,...sessionActual('practice')},revision:{count:sessions.filter(r=>r.sessionType==='revision').length+legacySessions.filter(t=>t.kind==='revision').length,...sessionActual('revision')},
 research:{count:research.length+legacyResearch.length,...actual([...research.map(r=>r.actualMinutes),...legacyResearch.map(()=>null)]),records:research,hasEntries:research.length>0||legacyResearch.length>0||hasEntries('research')},
 workouts:{count:workouts.length+legacyWorkouts.length,days:new Set([...workouts.map(r=>r.completionDate),...legacyWorkouts.map(t=>t.completedDate)]).size,minutes:workouts.reduce((n,h)=>n+h.minutes,0),restDays:new Set(rest.map(r=>r.date)).size,missingDuration:legacyWorkouts.length,hasEntries:workouts.length>0||legacyWorkouts.length>0||rest.length>0||s.habits.some(h=>h.kind==='workout'&&inWeek(h.date))},
 focus:{count:focus.length,minutes:focus.reduce((n,f)=>n+f.durationMs/60000,0)},
 phone:{minutes:phoneMinutes,days:loggedDays.size,missingDays:elapsed.length-loggedDays.size,average:loggedDays.size?phoneMinutes/loggedDays.size:null},
 points:{earned,spent,refunds,netSpent:spent-refunds,ledgerEntries:s.pointsDaily?s.pointsDaily.filter(d=>inWeek(d.date)).reduce((n,d)=>n+d.entries,0):ledger.length},rewards:{count:redemptions.filter(r=>!r.refunded).length,records:redemptions},
 records:sessions,legacySessions
 };
}
