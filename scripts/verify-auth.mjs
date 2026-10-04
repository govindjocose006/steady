import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const encode=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const compile=file=>ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const pathsURL=encode(compile('lib/auth-paths.ts'));
const {safeReturnPath,sameOrigin}=await import(pathsURL);let count=0;
const check=(v,message)=>{assert.ok(v,message);count++;};
for(const bad of ['https://evil.invalid','//evil.invalid','/\\evil.invalid','/auth/callback','/login','javascript:alert(1)'])check(safeReturnPath(bad)==='/','Reject unsafe redirect '+bad);
check(safeReturnPath('/study?tab=revision')==='/study?tab=revision','Preserve local return path');
check(sameOrigin(new Request('https://steady.test/auth/google',{headers:{origin:'https://steady.test'}})),'Same origin accepted');
check(!sameOrigin(new Request('https://steady.test/auth/google',{headers:{origin:'https://evil.test'}})),'Cross origin rejected');
check(!sameOrigin(new Request('https://steady.test/auth/google')),'Missing origin rejected');
const mock=encode('export const configured=()=>true;export const serverClient=async()=>({auth:{getUser:async()=>globalThis.__authFixture}});');
let source=compile('app/chatgpt-auth.ts').replace("from 'next/navigation'","from "+JSON.stringify(encode('export const redirect=(path)=>{throw new Error(path)};'))).replace("from '@/lib/supabase/server'","from "+JSON.stringify(mock)).replace("from '@/lib/auth-paths'","from "+JSON.stringify(pathsURL));
const {getChatGPTUser}=await import(encode(source));
const valid={id:'fixture-id',email:'owner@example.invalid',email_confirmed_at:'2026-10-04',identities:[{provider:'google'}],user_metadata:{full_name:'Fixture'}};
try{
 for(const user of [null,{...valid,is_anonymous:true},{...valid,email_confirmed_at:null},{...valid,identities:[{provider:'email'}]},{...valid,email:null}]){globalThis.__authFixture={data:{user},error:null};check(await getChatGPTUser()===null,'Unverified identity rejected');}
 globalThis.__authFixture={data:{user:valid},error:{message:'expired'}};check(await getChatGPTUser()===null,'Invalid session rejected');
 globalThis.__authFixture={data:{user:valid},error:null};check((await getChatGPTUser()).userId===valid.id,'Verified Google identity accepted');
 process.env.STEADY_ALLOWED_EMAILS='friend@example.invalid';check(await getChatGPTUser()===null,'Optional account restriction enforced');
 process.env.STEADY_ALLOWED_EMAILS='OWNER@example.invalid';check((await getChatGPTUser()).userId===valid.id,'Allowlist normalized');
 check(!readFileSync('app/chatgpt-auth.ts','utf8').includes('headers('),'Sites identity headers never trusted by independent app');
 const dashboard=readFileSync('app/dashboard.tsx','utf8');check(dashboard.includes('next.accountId!==boundAccount.current'),'Account switch cannot replace draft-bound state');
 check(dashboard.includes("'X-Steady-Account':data.accountId"),'Mutations bind to loaded account');
 console.log(`PASS: ${count} authentication and session safeguards.`);
}finally{delete globalThis.__authFixture;delete process.env.STEADY_ALLOWED_EMAILS;}
