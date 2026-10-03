'use client';
import type {ReactNode,ComponentProps} from 'react';
import DayPlanner from './day-planner';
import {GraduationCap,BookOpen,FlaskConical,Coins,Smartphone,Timer,Dumbbell} from 'lucide-react';
import {goals,goalNames,progress,previousDate,prettyDate,type State} from '@/lib/tasks';
import {phoneSummary} from '@/lib/summaries';
import type {HabitTab} from '@/lib/workspace-actions';
import type {View} from '@/lib/navigation';
const icons={phd:GraduationCap,net:BookOpen,research:FlaskConical};
export function GoalProgress({data}:{data:State}){
 const stats=progress(data.tasks,data.today,data.applications,data.workspaceRecords);
 return <section className="goal-progress" aria-label="Separate goal progress">{goals.map(goal=>{const Icon=icons[goal],count=stats[goal],target=goal==='phd'?2:goal==='net'?data.settings.lectureTarget:data.settings.researchDailyTarget,stretch=goal==='phd'?3:goal==='net'?data.settings.lectureStretch:null;
 return <article className={'goal-indicator '+goal} key={goal}><div className="goal-indicator-title"><Icon size={18}/><h2>{goalNames[goal]}</h2></div><p><strong>{count}{target!==null?' / '+target:''}</strong><span>{goal==='phd'?'submitted':goal==='net'?'lectures':'completed'}</span></p><small>{goal==='phd'?prettyDate(previousDate(data.today))+' – '+prettyDate(data.today):'Today'}{stretch!==null?' · Stretch '+stretch:target===null?' · No daily quota':''}</small></article>;})}</section>;
}
export function TodaySupport({data,onNavigate}:{data:State;onNavigate:(view:View,tab?:HabitTab)=>void}){
 const phone=phoneSummary(data.habits,data.today),workouts=data.habits.filter(r=>r.kind==='workout'&&r.status==='Completed'&&r.completionDate===data.today),rest=data.habits.some(r=>r.kind==='workout'&&r.date===data.today&&r.status==='Rest')&&!workouts.length;
 return <section className="today-support" aria-label="Habits and points today"><button onClick={()=>onNavigate('rewards')}><Coins size={18}/><span>Available points<strong>{data.availablePoints} pts</strong></span></button><button onClick={()=>onNavigate('habits','phone')}><Smartphone size={18}/><span>Phone use · manual<strong>{phone.logged?phone.minutes+' min':'Not logged'}</strong></span></button><button onClick={()=>onNavigate('habits','focus')}><Timer size={18}/><span>Focus<strong>{data.focusSessions.some(r=>r.phoneFree===null&&r.status!=='Cancelled')?'Return to timer':data.awards.filter(a=>a.kind==='focus'&&a.active&&a.activityDate===data.today).length+' / '+data.motivation.focusDailyLimit+' rewarded'}</strong></span></button><button onClick={()=>onNavigate('habits','workout')}><Dumbbell size={18}/><span>Workout<strong>{rest?'Planned rest':workouts.reduce((n,r)=>n+r.minutes,0)+' / '+data.motivation.workoutMinutes+' min'}</strong></span></button></section>;
}
export function TaskSurface({collapsed,count,children}:{collapsed:boolean;count:number;children:ReactNode}){return collapsed?<details className="unplanned-backlog"><summary><span>Unplanned backlog <strong>{count} task{count===1?'':'s'}</strong></span><span className="backlog-expand"><span className="when-closed">Show tasks</span><span className="when-open">Hide tasks</span></span></summary><p className="backlog-help">Due today or earlier · outside your saved plan.</p><div className="content-grid focused-content">{children}</div></details>:<div className="content-grid focused-content">{children}</div>;}

export function TodayWorkSurface({onNavigate,...props}:ComponentProps<typeof DayPlanner>&{onNavigate:(view:View,tab?:HabitTab)=>void}){return <><DayPlanner {...props}/><GoalProgress data={props.data}/><TodaySupport data={props.data} onNavigate={onNavigate}/></>;}
