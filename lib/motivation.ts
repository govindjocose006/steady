export const pointKinds=['application','lecture','session','research','focus','workout'] as const;
export type PointKind=typeof pointKinds[number]|'custom';
export const pointLabels:Record<PointKind,string>={application:'PhD application submitted',lecture:'Lecture completed',session:'Practice / revision completed',research:'Research task completed',focus:'Phone-free focus session',workout:'Daily workout',custom:'Other task'};
export type MotivationSettings={points:Record<typeof pointKinds[number],number>;phoneDailyTarget:number|null;focusMinutes:number;focusDailyLimit:number;workoutMinutes:number;version:number};
export const defaultMotivation:MotivationSettings={points:{application:80,lecture:20,session:20,research:40,focus:10,workout:10},phoneDailyTarget:null,focusMinutes:25,focusDailyLimit:3,workoutMinutes:15,version:0};
export type Award={activityKey:string;kind:PointKind;amount:number;active:boolean;activityDate:string;label:string;firstAwardedAt:string};
export type PointsEntry={sequence:number;eventKey:string;activityKey:string;action:'award'|'correction'|'redemption'|'refund';delta:number;activityDate:string|null;previousDate:string|null;label:string;happenedAt:string;localDate:string};
export type Reward={id:string;name:string;description:string;cost:number;archived:boolean;createdAt:string;updatedAt:string;version:number};
export const exampleRewards=[{name:'Film evening',description:'Choose a film and enjoy an evening.',cost:300},{name:'Small personal treat',description:'Something small that you enjoy.',cost:100},{name:'Outing',description:'Plan a pleasant outing.',cost:600}];
export type Redemption={id:string;rewardId:string;name:string;cost:number;refunded:boolean;createdAt:string;localDate:string;version:number};
export type HabitRecord={id:string;kind:'phone'|'workout';activityName:string;date:string;minutes:number;notes:string;status:'Logged'|'Planned'|'Completed'|'Rest';completionDate:string|null;createdAt:string;updatedAt:string;version:number};
export type FocusSession={id:string;durationMs:number;remainingMs:number;endAt:string|null;status:'Running'|'Paused'|'Finished'|'Cancelled';phoneFree:boolean|null;completionDate:string|null;createdAt:string;updatedAt:string;version:number};
export type HabitEvent={sequence:number;entityId:string;entityType:string;action:string;snapshot:string;previous:string|null;happenedAt:string;localDate:string};
export type MotivationState={motivation:MotivationSettings;awards:Award[];pointsHistory:PointsEntry[];availablePoints:number;earnedPoints:number;rewards:Reward[];redemptions:Redemption[];habits:HabitRecord[];focusSessions:FocusSession[];habitEvents:HabitEvent[];serverNow:string};
export function timerRemaining(session:FocusSession,now:number=Date.now()){return session.status==='Running'&&session.endAt?Math.max(0,Date.parse(session.endAt)-now):session.status==='Paused'?session.remainingMs:0;}
export function timerStatus(session:FocusSession,now:number=Date.now()){return session.status==='Running'&&timerRemaining(session,now)===0?'Finished':session.status;}
export function pointKindForTask(kind:string):PointKind{return kind==='application'?'application':kind==='lecture'?'lecture':kind==='practice'||kind==='revision'?'session':kind==='research'?'research':'custom';}
