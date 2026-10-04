export const studyTabs=['lecture','practice','revision'] as const;
export const habitTabs=['phone','focus','workout'] as const;
export type StudyTab=typeof studyTabs[number];export type HabitTab=typeof habitTabs[number];
export function studyAction(tab:StudyTab){return tab==='lecture'?'Plan lecture':tab==='practice'?'Plan practice':'Plan revision';}
export function habitAction(tab:HabitTab){return tab==='focus'?null:tab==='phone'?'Log distracting minutes':'Plan / log workout';}
export function validStudyTab(value:unknown):StudyTab|null{return studyTabs.includes(value as StudyTab)?value as StudyTab:null;}
export function validHabitTab(value:unknown):HabitTab|null{return habitTabs.includes(value as HabitTab)?value as HabitTab:null;}
