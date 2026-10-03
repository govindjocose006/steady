export const views=['today','upcoming','applications','study','research','habits','rewards','review','history'] as const;
export type View=typeof views[number];
export type Route={view:View;applicationId:string|null;workspaceRecordId:string|null;habitId:string|null};
export function readRoute(address:string):Route{
 const url=new URL(address,'https://steady.invalid'),path=url.pathname.replace(/\/$/,'')||'/';
 const view:View=path==='/'?(url.searchParams.get('view')==='upcoming'?'upcoming':url.searchParams.get('view')==='history'?'history':'today'):views.includes(path.slice(1) as View)?path.slice(1) as View:'today';
 const id=(key:string)=>{const value=url.searchParams.get(key);return value&&/^[a-f0-9-]{36}$/i.test(value)?value:null;};
 return {view,applicationId:view==='applications'?id('application'):null,workspaceRecordId:view==='study'||view==='research'?id('record'):null,habitId:view==='habits'?id('record'):null};
}
export function routeURL(route:Route){const {view}=route;const id=view==='applications'?route.applicationId:view==='study'||view==='research'?route.workspaceRecordId:view==='habits'?route.habitId:null;return view==='today'?'/':view==='upcoming'||view==='history'?'/?view='+view:'/'+view+(id?'?'+(view==='applications'?'application':'record')+'='+encodeURIComponent(id):'');}
export const pageRoute=(view:View):Route=>({view,applicationId:null,workspaceRecordId:null,habitId:null});
export type LocationEntry={url:string;state:Record<string,unknown>|null};
export type HistoryPort={current:()=>LocationEntry;replace:(url:string,state:Record<string,unknown>)=>void;push:(url:string,state:Record<string,unknown>)=>void;go:(delta:number)=>void;listen:(listener:()=>void)=>()=>void};
const indexOf=(entry:LocationEntry)=>typeof entry.state?.steadyIndex==='number'?entry.state.steadyIndex:null;
// Indexed entries let us restore the accepted URL before asking about a dirty draft.
// Keep editing and failed saves stay at that entry; acceptance traverses the original
// stack, rather than replacing it or adding phantom pages. No private data is stored.
export class HistoryNavigator{
 private accepted:LocationEntry;private index:number;private restoring:{target:LocationEntry;ask:boolean}|null=null;private expected:LocationEntry|null=null;private confirming=false;private stop:()=>void;
 constructor(private port:HistoryPort,private apply:(route:Route)=>void,private dirty:()=>boolean,private busy:()=>boolean,private confirm:(proceed:()=>void,cancel:()=>void)=>void){
  this.accepted=port.current();this.index=indexOf(this.accepted)??0;this.accepted={...this.accepted,state:{...this.accepted.state,steadyIndex:this.index}};port.replace(this.accepted.url,this.accepted.state!);this.stop=port.listen(()=>this.pop());
 }
 dispose(){this.stop();}
 push(route:Route){if(this.busy()||this.restoring||this.expected||this.confirming)return;const url=routeURL(route);if(url===this.accepted.url)return;this.index++;const entry={url,state:{steadyIndex:this.index}};this.port.push(url,entry.state);this.accepted=entry;this.apply(route);}
 private accept(entry:LocationEntry){this.accepted=entry;this.index=indexOf(entry)??this.index;this.apply(readRoute(entry.url));}
 private travel(target:LocationEntry){this.confirming=false;this.expected=target;this.port.go((indexOf(target)??this.index)-this.index);}
 private pop(){const target=this.port.current(),index=indexOf(target);
  if(this.restoring&&index===this.index){const request=this.restoring;this.restoring=null;if(request.ask){this.confirming=true;this.confirm(()=>this.travel(request.target),()=>{this.confirming=false;});}return;}
  if(this.expected&&index===indexOf(this.expected)){this.expected=null;this.accept(target);return;}
  if(index===this.index)return;
  if(index===null){this.port.replace(this.accepted.url,this.accepted.state!);return;}
  if(this.dirty()||this.busy()||this.confirming){this.restoring={target,ask:!this.busy()&&!this.confirming};this.port.go(this.index-index);return;}
  this.accept(target);
 }
}
export function browserHistoryPort():HistoryPort{return {current:()=>({url:window.location.pathname+window.location.search,state:window.history.state}),replace:(url,state)=>window.history.replaceState(state,'',url),push:(url,state)=>window.history.pushState(state,'',url),go:delta=>window.history.go(delta),listen:listener=>{
 // Vinext also restores RSC trees on popstate. These indexed entries belong to
 // the already-mounted dashboard; handle them before the router can unmount a
 // private draft. Other history entries retain the framework's normal handling.
 const pop=(event:PopStateEvent)=>{if(typeof event.state?.steadyIndex!=='number')return;event.stopImmediatePropagation();listener();};
 window.addEventListener('popstate',pop,true);return()=>window.removeEventListener('popstate',pop,true);
}};}
