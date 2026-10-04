import {serverClient} from '@/lib/supabase/server';
import {sameOrigin} from '@/lib/auth-paths';
export async function POST(request:Request){if(!sameOrigin(request))return Response.json({error:'Unsupported request'},{status:403});try{const client=await serverClient();const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;return Response.json({signedOut:true},{headers:{'Cache-Control':'private, no-store'}});}catch{return Response.json({error:'Could not sign out. Try again.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}}
