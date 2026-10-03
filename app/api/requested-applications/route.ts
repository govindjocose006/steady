import {json} from '@/lib/storage';
export const dynamic='force-dynamic';
// Completed one-off import is retired. No secret or caller can select a storage owner.
export async function POST(){return json({error:'This one-time import has been retired.'},410);}
