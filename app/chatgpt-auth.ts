// Legacy export names preserve feature interfaces; identity is Supabase-only.
import {redirect} from 'next/navigation';
import {serverClient,configured} from '@/lib/supabase/server';
import {safeReturnPath} from '@/lib/auth-paths';
export type ChatGPTUser={userId:string;displayName:string;email:string;fullName:string|null};
export async function getChatGPTUser():Promise<ChatGPTUser|null>{
 if(!configured())return null;
 try{const client=await serverClient();const {data:{user},error}=await client.auth.getUser();
  if(error||!user||user.is_anonymous||!user.email||!user.email_confirmed_at||!user.identities?.some(identity=>identity.provider==='google'))return null;
  const allowed=(process.env.STEADY_ALLOWED_EMAILS||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);if(allowed.length&&!allowed.includes(user.email.toLowerCase()))return null;
  const fullName=typeof user.user_metadata?.full_name==='string'?user.user_metadata.full_name:null;return {userId:user.id,email:user.email,fullName,displayName:fullName||user.email};
 }catch{return null;}
}
export async function requireChatGPTUser(returnTo:string):Promise<ChatGPTUser>{const user=await getChatGPTUser();if(user)return user;redirect(chatGPTSignInPath(returnTo));}
export function chatGPTSignInPath(returnTo:string){return '/login?next='+encodeURIComponent(safeReturnPath(returnTo));}
