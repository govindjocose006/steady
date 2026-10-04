import {logFailure} from '@/lib/safe-log';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {repairOpportunityOwnership} from '@/lib/opportunity-ownership';
import {importOpportunities} from '@/lib/opportunity-import';
import {json,isWriteRequest} from '@/lib/storage';
export const dynamic='force-dynamic';
// Imports use the signed-in per-Site identity, like every other private record.
export async function POST(request:Request){
 const user=await getChatGPTUser();
 if(!user)return json({error:'Sign in to save opportunities to your account.'},401);
 if(!isWriteRequest(request,user.userId))return json({error:'Unsupported request.'},403);
 try{await repairOpportunityOwnership(user);return json(await importOpportunities(user.userId));}catch{logFailure('opportunities.import');return json({error:'Could not confirm the import. Retry safely.'},503);}
}
