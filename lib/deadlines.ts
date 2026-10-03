import type {Opportunity} from './applications';
export type ClosingInput={time:string;zone:string;verified:boolean;touched:boolean};
export function timeConfidence(opportunity?:Opportunity):'verified'|'unverified'|'ambiguous'{
 if(opportunity?.closingVerification)return opportunity.closingVerification;
 const note=opportunity?.verificationNote||'';
 return /timezone ambiguity|timezone ambiguous/i.test(note)?'ambiguous':/not independently|not verified|not confirmed|supplied.*cutoff/i.test(note)?'unverified':'verified';
}
export function fixedOffset(zone:string){const match=zone.match(/^UTC([+-])(\d{2}):(\d{2})$/);if(!match)return null;const hours=Number(match[2]),minutes=Number(match[3]);if(hours>14||minutes>59||hours===14&&minutes!==0)throw new Error('Check the UTC offset.');return (match[1]==='-'?-1:1)*(hours*60+minutes)*60000;}
export function sourceTime(instant:string,zone:string){const offset=fixedOffset(zone);if(offset!==null)return new Date(Date.parse(instant)+offset).toISOString().slice(11,16);return new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(instant));}
export function closingInput(opportunity?:Opportunity):ClosingInput{
 let time='';if(opportunity?.closingAt){try{time=sourceTime(opportunity.closingAt,opportunity.closingTimezone||'UTC');}catch{time=opportunity.closingLabel?.match(/\b(\d{2}:\d{2})\b/)?.[1]||'';}}
 return {time,zone:opportunity?.closingTimezone||'',verified:!!time&&timeConfidence(opportunity)==='verified',touched:false};
}
export function closingInstant(date:string,time:string,zone:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Enter a deadline date and a valid source time.');
 const nominal=Date.parse(date+'T'+time+':00Z');if(!Number.isFinite(nominal)||new Date(nominal).toISOString().slice(0,10)!==date)throw new Error('Check the deadline date.');const offset=fixedOffset(zone);if(offset!==null)return new Date(nominal-offset).toISOString();
 if(!zone.includes('/')&&!['UTC','GMT'].includes(zone))throw new Error('Timezone abbreviations can be ambiguous. Use an IANA zone such as Europe/London or the source’s fixed UTC offset.');
 let format:Intl.DateTimeFormat;try{format=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});}catch{throw new Error('Use an IANA timezone such as Europe/London, or a fixed offset such as UTC+01:00.');}
 const local=(ms:number)=>{const parts=Object.fromEntries(format.formatToParts(new Date(ms)).map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;};
 const offsets=new Set<number>();for(let hours=-36;hours<=36;hours+=6){const ms=nominal+hours*3600000;offsets.add(Date.parse(local(ms)+':00Z')-ms);}
 const matches=[...offsets].map(value=>nominal-value).filter(ms=>local(ms)===date+'T'+time);
 if(matches.length!==1)throw new Error(matches.length?'This time occurs twice when clocks change. Use the advert’s fixed UTC offset.':'This local time does not exist when clocks change. Check the advert’s time.');
 return new Date(matches[0]).toISOString();
}
export function applyClosingInput(date:string,opportunity:Opportunity|undefined,input:ClosingInput):Opportunity|undefined{
 if(!input.touched)return opportunity;
 const next={...opportunity,deadlineEdited:true};if(!input.time)return {...next,closingAt:null,closingLabel:'',closingTimezone:'',closingVerification:'unverified'};
 const zone=input.zone.trim();return {...next,closingAt:closingInstant(date,input.time,zone),closingLabel:date+', '+input.time+' '+zone,closingTimezone:zone,closingVerification:input.verified?'verified':'unverified'};
}
