'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {historyURL,mergeHistory,type HistoryRow,type HistoryStream} from '@/lib/history';

type Props<T extends HistoryRow>={stream:HistoryStream;entity?:string;seed:T[];hasMore?:boolean;deferUntilOpen?:boolean;children:(rows:T[])=>ReactNode};

// Read-only history requests are separate from record mutations and draft protection.
export default function HistoryFeed<T extends HistoryRow>({stream,entity,seed,hasMore=false,deferUntilOpen=false,children}:Props<T>){
  const [loaded,setLoaded]=useState<T[]>([]),[more,setMore]=useState<boolean|undefined>(),[loading,setLoading]=useState(false),[error,setError]=useState('');
  const container=useRef<HTMLDivElement>(null);
  const pending=useRef(false),lifecycle=useRef<AbortController|null>(null),firstPage=useRef(!!entity);
  const rows=mergeHistory(seed,loaded);

  async function read(){
    if(pending.current||lifecycle.current?.signal.aborted)return;
    pending.current=true;setLoading(true);setError('');
    const initial=firstPage.current,signal=lifecycle.current?.signal;
    try{
      const response=await fetch(historyURL(stream,entity,initial?undefined:rows.at(-1)?.sequence),{cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)});
      const page=await response.json() as {events:T[];hasMore:boolean;error?:string};
      if(!response.ok)throw new Error(page.error||'History could not be loaded.');
      if(signal?.aborted)return;
      setLoaded(previous=>mergeHistory(page.events,previous));setMore(page.hasMore);firstPage.current=false;
    }catch{
      if(!signal?.aborted)setError('History could not be loaded. Your records are safe; retry.');
    }finally{
      pending.current=false;if(!signal?.aborted)setLoading(false);
    }
  }

  const reader=useRef(read);
  useEffect(()=>{reader.current=read;});
  useEffect(()=>{
    const controller=new AbortController();lifecycle.current=controller;
    const details=deferUntilOpen?container.current?.closest('details'):null;
    const activate=()=>{if(entity&&firstPage.current&&(!details||details.open))queueMicrotask(()=>{if(!controller.signal.aborted)void reader.current();});};
    details?.addEventListener('toggle',activate);activate();
    return()=>{controller.abort();details?.removeEventListener('toggle',activate);};
    // Each mounted feed has a stable stream/entity; callers key entity feeds by ID.
  },[stream,entity,deferUntilOpen]);


  return <div className="history-feed" ref={container}>{children(rows)}<div className="history-paging" aria-live="polite">
    {error&&<p role="alert">{error}</p>}
    {(error||(more??hasMore)||loading)&&<button className="secondary-button load-more" disabled={loading} onClick={()=>void read()}>{loading?'Loading history…':error?'Retry loading history':'Load older changes'}</button>}
  </div></div>;
}
