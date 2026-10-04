import {configured} from '@/lib/supabase/server';
import {safeReturnPath} from '@/lib/auth-paths';
import {getChatGPTUser} from '../chatgpt-auth';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=await searchParams,next=safeReturnPath(typeof params.next==='string'?params.next:'/');if(await getChatGPTUser())redirect(next);const ready=configured()&&Boolean(process.env.STEADY_DATABASE_SERVER_KEY);
 return <main className="auth-page"><section className="auth-card"><div className="eyebrow">STEADY</div><h1>A little progress, every day.</h1><p>Plan your applications, study and research in your own private workspace.</p>{params.error&&<p role="alert" className="error-banner">Sign-in could not finish. Try again, or check that this Google account has been invited.</p>}{ready?<form action="/auth/google" method="post"><input type="hidden" name="next" value={next}/><button className="primary-button" type="submit">Continue with Google</button></form>:<p role="status">Google sign-in is being set up. Your existing Steady workspace is still available at its original address.</p>}<p className="field-help">Your records belong to your account. Other people cannot see your tasks or notes.</p><a href="https://steady-govind.govind-jocose.chatgpt.site/">Open the original Steady site</a></section></main>;
}
