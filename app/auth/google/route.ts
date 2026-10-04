import {NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {sameOrigin,safeReturnPath} from '@/lib/auth-paths';
export async function POST(request:Request){
 if(!sameOrigin(request))return new Response('Unsupported request',{status:403});const origin=new URL(request.url).origin;
 try{const form=await request.formData(),next=safeReturnPath(String(form.get('next')||'/'));const client=await serverClient();const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:origin+'/auth/callback?next='+encodeURIComponent(next),queryParams:{prompt:'select_account'}}});if(error||!data.url)throw new Error('Provider unavailable');const response=NextResponse.redirect(data.url,303);response.headers.set('Cache-Control','private, no-store');return response;}catch{return NextResponse.redirect(origin+'/login?error=signin',303);}
}
