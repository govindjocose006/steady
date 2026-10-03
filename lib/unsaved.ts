export type DraftEntry = {label:string; save:()=>Promise<boolean>; discard:()=>void};
export type LeaveRequest = {entries:DraftEntry[]; proceed:()=>void;cancel?:()=>void};

// Drafts are registered only in memory. No records, points or browser storage are touched.
export class DraftRegistry {
  private entries = new Map<string,DraftEntry>();
  private listeners = new Set<()=>void>();
  subscribe = (listener:()=>void) => {this.listeners.add(listener);return ()=>{this.listeners.delete(listener);};};
  private notify(){for(const listener of this.listeners)listener();}
  set(id:string,entry:DraftEntry|null){if(entry)this.entries.set(id,entry);else this.entries.delete(id);this.notify();}
  get dirty(){return this.entries.size>0;}
  has(id:string){return this.entries.has(id);}
  request(proceed:()=>void,ids?:string[]):LeaveRequest|null{
    const entries=[...this.entries].filter(([id])=>!ids||ids.includes(id)).map(([,entry])=>entry);
    if(!entries.length){proceed();return null;}
    return {entries,proceed};
  }
  discard(request:LeaveRequest){request.entries.forEach(entry=>entry.discard());request.proceed();}
  async save(request:LeaveRequest){try{for(const entry of request.entries){if(!await entry.save())return false;}}catch{return false;}request.proceed();return true;}
}

export function saveStatus(busy:boolean,failed:boolean,dirty:boolean,connected:boolean,error:boolean){
  return busy?'Saving…':failed?'Save failed':dirty?'Unsaved changes':error?'Check connection':connected?'Saved':'Connecting…';
}

export function installUnloadGuard(target:EventTarget,registry:DraftRegistry){
  const warn=(event:Event)=>{if(registry.dirty){event.preventDefault();(event as BeforeUnloadEvent).returnValue='';}};
  target.addEventListener('beforeunload',warn);
  return()=>target.removeEventListener('beforeunload',warn);
}

export function formFingerprint(fields:Iterable<{tagName:string;type:string;value:string;checked?:boolean}>){
  return JSON.stringify(Array.from(fields).map(field=>({tag:field.tagName,type:field.type,value:field.value,checked:field.checked})));
}
