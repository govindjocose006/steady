export function phoneSummary(records:{kind:string;date:string;minutes:number}[],date:string){
  const entries=records.filter(r=>r.kind==='phone'&&r.date===date);
  return {logged:entries.length>0,minutes:entries.reduce((n,r)=>n+r.minutes,0)};
}
export function sessionTimeSummary(records:{actualMinutes:number|null;estimatedMinutes:number}[]){
  return {actual:records.reduce((n,r)=>n+(r.actualMinutes??0),0),recorded:records.filter(r=>r.actualMinutes!==null).length,
    missing:records.filter(r=>r.actualMinutes===null).length,estimated:records.reduce((n,r)=>n+r.estimatedMinutes,0)};
}
export function rewardShortfall(cost:number,balance:number){return Math.max(0,cost-balance);}
