// Run after pnpm build. Synthetic unauthenticated requests, no live data or cookies.
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3011'],{stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',STEADY_DATABASE_SERVER_KEY:''}});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timeout')),15000);child.stdout.on('data',b=>{if(b.toString().includes('Ready')){clearTimeout(timer);resolve();}});child.on('error',reject);});
 const base='http://127.0.0.1:3011';let r=await fetch(base,{redirect:'manual'});assert.equal(r.status,307);assert.ok(r.headers.get('location').startsWith('/login'));
 for(const path of ['/api/tasks','/api/account']){r=await fetch(base+path);assert.equal(r.status,401);}
 r=await fetch(base+'/auth/google',{method:'POST',headers:{Origin:'https://other.invalid'}});assert.equal(r.status,403);
 r=await fetch(base+'/login');assert.equal(r.status,200);assert.ok((await r.text()).includes('Google sign-in is being set up'));
 console.log('PASS: production HTTP login redirect, protected APIs, cross-origin denial and setup screen.');
}finally{child.kill();}
