import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
import {json} from '@/lib/storage';
import {historyPage,isHistoryStream,type HistoryRow} from '@/lib/history';
import {historyStatement} from '@/lib/history-storage';
import {logFailure} from '@/lib/safe-log';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const user=await getChatGPTUser();if(!user)return json({error:'Please sign in.'},401);
  const query=new URL(request.url).searchParams,stream=query.get('stream')||'tasks',raw=query.get('before'),before=raw===null?undefined:Number(raw),entity=query.get('entity')||undefined;
  if(!isHistoryStream(stream)||(raw!==null&&(!/^\d+$/.test(raw)||!Number.isSafeInteger(before)||(before??0)<1))||(entity&&entity.length>180))return json({error:'Invalid history page.'},400);
  try {const {results}=await historyStatement(getDb(),user.userId,stream,entity,before).all();return json(historyPage(results as HistoryRow[]));}
  catch {logFailure('history.read');return json({error:'History could not be loaded. Please retry.'},503);}
}
