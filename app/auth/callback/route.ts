import {NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {safeReturnPath} from '@/lib/auth-paths';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export async function GET(request:Request){const url=new URL(request.url),next=safeReturnPath(url.searchParams.get('next'));try{const code=url.searchParams.get('code');if(!code)throw new Error('Missing code');const client=await serverClient();const {error}=await client.auth.exchangeCodeForSession(code);if(error||!await getChatGPTUser())throw new Error('Sign-in failed');const response=NextResponse.redirect(new URL(next,url.origin),303);response.headers.set('Cache-Control','private, no-store');return response;}catch{const response=NextResponse.redirect(new URL('/login?error=callback',url.origin),303);response.headers.set('Cache-Control','private, no-store');return response;}}
