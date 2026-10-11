// Run after pnpm build. Synthetic unauthenticated requests, no live data or cookies.
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3011'],{stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',STEADY_DATABASE_SERVER_KEY:''}});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Server startup timeout')),15000);child.stdout.on('data',b=>{if(b.toString().includes('Ready')){clearTimeout(timer);resolve();}});child.on('error',reject);});
 const base='http://127.0.0.1:3011';let r=await fetch(base,{redirect:'manual'});assert.equal(r.status,307);assert.ok(r.headers.get('location').startsWith('/login'));
 for(const path of ['/api/tasks','/api/account']){r=await fetch(base+path);assert.equal(r.status,401);}
 r=await fetch(base+'/auth/google',{method:'POST',headers:{Origin:'https://other.invalid'}});assert.equal(r.status,403);
 r=await fetch(base+'/login');assert.equal(r.status,200);const html=await r.text();assert.ok(html.includes('Google sign-in is being set up'));assert.ok(html.includes('Install Steady'));assert.ok(html.includes('rel="manifest"'));assert.ok(html.includes('/manifest.webmanifest'));
 r=await fetch(base+'/manifest.webmanifest',{redirect:'manual'});assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/manifest\+json/);const manifest=await r.json();assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');assert.equal(manifest.id,'/');assert.equal(manifest.prefer_related_applications,false);
 for(const size of [192,512]){const icon=manifest.icons.find(i=>i.sizes===`${size}x${size}`);assert.ok(icon);assert.equal(icon.type,'image/png');assert.match(icon.purpose,/maskable/);const response=await fetch(base+icon.src,{redirect:'manual'});assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/image\/png/);const png=Buffer.from(await response.arrayBuffer());assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
 console.log('PASS: signed-out install metadata, standalone launch, and both correctly sized PNG icons.');
 console.log('PASS: production HTTP login redirect, protected APIs, cross-origin denial and setup screen.');
}finally{child.kill();}
