'use client';
import {createContext,useContext,useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode,type ComponentProps,type Ref} from 'react';
import {Dialog as RadixDialog} from 'radix-ui';
import {DraftRegistry,installUnloadGuard,formFingerprint,type DraftEntry,type LeaveRequest} from '@/lib/unsaved';

type Guard = {registry:DraftRegistry; dirty:boolean; failed:boolean; request:(action:()=>void,ids?:string[])=>void;
  submitted:(id:string)=>void; closed:(id:string)=>void; result:(ok:boolean)=>void; edited:()=>void; waitForSubmit:(id:string,form:HTMLFormElement)=>Promise<boolean>};
const Context=createContext<Guard|null>(null);
export function useUnsavedChanges(){const context=useContext(Context);if(!context)throw new Error('Draft protection is unavailable.');return context;}
export function UnsavedChangesProvider({children}:{children:ReactNode}){
  const [registry]=useState(()=>new DraftRegistry()),[dirty,setDirty]=useState(false),[failed,setFailed]=useState(false),[pending,setPending]=useState<LeaveRequest|null>(null),[saving,setSaving]=useState(false);
  const submitting=useRef<string|null>(null),waiters=useRef(new Map<string,(ok:boolean)=>void>()),prompt=useRef<LeaveRequest|null>(null);
  useEffect(()=>registry.subscribe(()=>setDirty(registry.dirty)),[registry]);
  useEffect(()=>installUnloadGuard(window,registry),[registry]);
  const guard:Guard={registry,dirty,failed,
    request:(action,ids)=>{const request=registry.request(action,ids);if(request){prompt.current=request;setPending(request);}},
    submitted:id=>{submitting.current=id;},
    closed:id=>{if(submitting.current===id){submitting.current=null;waiters.current.get(id)?.(true);waiters.current.delete(id);}},
    edited:()=>setFailed(false),
    result:ok=>{setFailed(!ok);const id=submitting.current;submitting.current=null;if(id){if(ok)registry.set(id,null);waiters.current.get(id)?.(ok);waiters.current.delete(id);}},
    waitForSubmit:(id,form)=>new Promise(resolve=>{if(!form.reportValidity()){resolve(false);return;}waiters.current.set(id,resolve);form.requestSubmit();})};
  async function saveAndContinue(){const request=prompt.current;if(!request)return;setSaving(true);const ok=await registry.save(request);setSaving(false);if(ok){prompt.current=null;setPending(null);}else{setFailed(true);setPending(null);prompt.current=null;}}
  return <Context.Provider value={guard}>{children}<RadixDialog.Root open={!!pending} onOpenChange={open=>{if(!open&&!saving){setPending(null);prompt.current=null;}}}><RadixDialog.Portal><RadixDialog.Overlay className="dialog-overlay"/><RadixDialog.Content className="task-dialog unsaved-dialog" onInteractOutside={e=>{if(saving)e.preventDefault();}} onEscapeKeyDown={e=>{if(saving)e.preventDefault();}}><RadixDialog.Title>Keep your unsaved changes?</RadixDialog.Title><RadixDialog.Description>{pending?.entries.map(e=>e.label).join(', ')} has edits that have not been saved.</RadixDialog.Description><p className="field-help">Save before continuing, discard these edits, or stay here to keep editing.</p><div className="dialog-actions"><button className="secondary-button" disabled={saving} onClick={()=>{setPending(null);prompt.current=null;}}>Keep editing</button><button className="text-button" disabled={saving} onClick={()=>{const request=prompt.current;prompt.current=null;setPending(null);if(request)registry.discard(request);}}>Discard edits</button><button className="primary-button" disabled={saving} onClick={()=>void saveAndContinue()}>{saving?'Saving…':'Save and continue'}</button></div></RadixDialog.Content></RadixDialog.Portal></RadixDialog.Root></Context.Provider>;
}

export function useDraftProtection(dirty:boolean,label:string,save:()=>Promise<boolean>,discard:()=>void){
  const {registry}=useUnsavedChanges(),id=useId(),latest=useRef({save,discard,label});
  useLayoutEffect(()=>{latest.current={save,discard,label};});
  useLayoutEffect(()=>{registry.set(id,dirty?{label,save:()=>latest.current.save(),discard:()=>{latest.current.discard();registry.set(id,null);}}:null);return()=>registry.set(id,null);},[dirty,id,label,registry]);
}

const DialogContext=createContext<{id:string}|null>(null);
function Root({children,onOpenChange,...props}:ComponentProps<typeof RadixDialog.Root>){
  const id=useId(),guard=useUnsavedChanges();
  return <DialogContext.Provider value={{id}}><RadixDialog.Root {...props} onOpenChange={open=>{if(open)onOpenChange?.(true);else guard.request(()=>onOpenChange?.(false),[id]);}}>{children}</RadixDialog.Root></DialogContext.Provider>;
}
function fingerprint(root:HTMLElement){return formFingerprint(Array.from(root.querySelectorAll('input,select,textarea') as unknown as ArrayLike<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>));}
function Content({children,ref:forwarded,...props}:ComponentProps<typeof RadixDialog.Content>&{ref?:Ref<HTMLDivElement>}){
  const context=useContext(DialogContext),id=context?.id,guard=useUnsavedChanges(),node=useRef<HTMLDivElement|null>(null),baseline=useRef(''),latest=useRef(guard);
  useLayoutEffect(()=>{latest.current=guard;});
  useLayoutEffect(()=>{
    const root=node.current;if(!root||!id)return;
    let disposed=false;baseline.current=fingerprint(root);
    const discard=()=>{baseline.current=fingerprint(root);latest.current.registry.set(id,null);};
    const inspect=()=>{if(disposed)return;const changed=fingerprint(root)!==baseline.current;const form=root.querySelector('form');
      const entry:DraftEntry={label:root.querySelector('[id]')?.textContent||'This form',discard,save:async()=>{if(!form)return false;const ok=await latest.current.waitForSubmit(id,form);if(ok)discard();return ok;}};
      latest.current.registry.set(id,changed?entry:null);};
    const edit=()=>{latest.current.edited();queueMicrotask(inspect);};
    const submit=()=>latest.current.submitted(id);
    root.addEventListener('input',edit);root.addEventListener('change',edit);root.addEventListener('submit',submit,true);
    const observer=new MutationObserver(()=>queueMicrotask(inspect));observer.observe(root,{childList:true,subtree:true});
    return()=>{disposed=true;observer.disconnect();latest.current.closed(id);root.removeEventListener('input',edit);root.removeEventListener('change',edit);root.removeEventListener('submit',submit,true);latest.current.registry.set(id,null);};
  },[id]);
  return <RadixDialog.Content {...props} ref={element=>{node.current=element;if(typeof forwarded==='function')forwarded(element);else if(forwarded)forwarded.current=element;}} onClickCapture={event=>{
    props.onClickCapture?.(event);const button=(event.target as HTMLElement).closest('button');
    if(id&&button?.hasAttribute('data-draft-dismiss')&&guard.registry.has(id)){event.preventDefault();event.stopPropagation();guard.request(()=>button.click(),[id]);}
  }}>{children}</RadixDialog.Content>;
}
export const Dialog={...RadixDialog,Root,Content};
