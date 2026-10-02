import { getChatGPTUser } from '@/app/chatgpt-auth';
import { getDb } from '@/db';
export const dynamic='force-dynamic';
export async function GET(request:Request) {
  const user=await getChatGPTUser();if(!user)return Response.json({error:'Please sign in.'},{status:401});
  const before=Number(new URL(request.url).searchParams.get('before'));
  if(!Number.isSafeInteger(before)||before<1)return Response.json({error:'Invalid history page.'},{status:400});
  try {const {results}=await getDb().prepare('SELECT sequence, action, snapshot, previous, happened_at AS happenedAt, local_date AS localDate FROM events WHERE owner_id=? AND sequence<? ORDER BY sequence DESC LIMIT 51').bind(user.userId,before).all();return Response.json({events:results.slice(0,50),hasMore:results.length>50},{headers:{'Cache-Control':'private, no-store'}});} catch {return Response.json({error:'History could not be loaded. Please retry.'},{status:503});}
}
