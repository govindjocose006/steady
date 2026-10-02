import {getDb} from '@/db';
import {json,isWriteRequest} from '@/lib/storage';
import {importOpportunities} from '@/lib/opportunity-import';
import {requestedApplications,requestedBatch} from '@/lib/requested-applications';
export const dynamic='force-dynamic';
// Narrow maintenance operation behind the owner-private Sites platform boundary,
// additionally restricted by a server-only secret and the configured storage owner.
// No caller-selected owner, arbitrary records, reads, or submission changes.
export async function POST(request:Request){
 const secret=process.env.STEADY_REQUESTED_IMPORT_KEY,owner=process.env.STEADY_REQUESTED_IMPORT_OWNER;
 if(!secret||!owner||request.headers.get('x-steady-import-key')!==secret)return json({error:'Not authorized.'},403);
 if(!isWriteRequest(request))return json({error:'Unsupported request.'},403);
 try{
  const existing=await getDb().prepare('SELECT id FROM applications WHERE owner_id=? LIMIT 1').bind(owner).first();
  if(!existing)return json({error:'Configured account has no existing application storage.'},409);
  return json(await importOpportunities(owner,requestedApplications,requestedBatch));
 }catch(e){console.error('Requested application import failed',e);return json({error:'Could not confirm the import. Retry safely.'},503);}
}
