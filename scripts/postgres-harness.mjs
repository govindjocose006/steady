import {PGlite} from '@electric-sql/pglite';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';
export async function postgresWorkspace(){
 const root=new URL('../',import.meta.url).pathname,pg=new PGlite();
 await pg.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
 for(const file of readdirSync(root+'/supabase/migrations').filter(f=>f.endsWith('.sql')).sort())await pg.exec(readFileSync(root+'/supabase/migrations/'+file,'utf8'));
 const owner='00000000-0000-4000-8000-000000000011',other='00000000-0000-4000-8000-000000000012',key='isolated-regression-key-not-for-production';
 await pg.query('INSERT INTO auth.users(id) VALUES ($1),($2)',[owner,other]);
 await pg.query('INSERT INTO steady_private.runtime_keys(key_hash) VALUES ($1)',[createHash('sha256').update(key).digest('hex')]);
 let user={userId:owner,email:'fixture@example.invalid'},failure=false;
 const cache=new Map(),encode=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
 const mock=encode('export const getDb=()=>globalThis.__steadyPG.db;export const getChatGPTUser=async()=>globalThis.__steadyPG.user;');
 const serverMock=encode('export const serverClient=()=>{throw new Error("Use isolated executor")};');
 function moduleURL(file,realDb=false){
  const path=resolve(root,file),key=path+realDb;if(cache.has(key))return cache.get(key);
  let source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  source=source.replace(/from (["'])([^"']+)\1/g,(_full,_quote,spec)=>{
   let url;if(spec==='@/db'||spec==='@/app/chatgpt-auth')url=mock;
   else if(spec==='@/lib/supabase/server')url=serverMock;
   else if(spec.startsWith('@/')||spec.startsWith('.')){const base=spec.startsWith('@/')?resolve(root,spec.slice(2)):resolve(dirname(path),spec);url=moduleURL([base+'.ts',base+'.tsx',base+'/index.ts',base].find(existsSync));}
   else url=import.meta.resolve(spec);return 'from '+JSON.stringify(url);
  });const url=encode(source);cache.set(key,url);return url;
 }
 async function rpc(statements,{as=user?.userId,key:provided=key}={}){
  return pg.transaction(async tx=>{
   await tx.exec('SET LOCAL ROLE authenticated');
   await tx.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[as||'']);
   const input=failure?[...statements,'INSERT INTO missing_table VALUES (1)']:statements;failure=false;
   const r=await tx.query('SELECT public.steady_batch($1::jsonb,$2) AS result',[JSON.stringify(input),provided]);return r.rows[0].result;
  });
 }
 const {database}=await import(moduleURL('db/index.ts',true));
 const db=database(async statements=>{try{return await rpc(statements);}catch(e){if(process.env.STEADY_TEST_SQL_DEBUG==='1')console.error(e.message,statements);throw e;}});
 globalThis.__steadyPG={db,get user(){return user;}};
 return {pg,owner,other,rpc,moduleURL,db,get user(){return user;},set user(value){user=value;},set failNext(value){failure=value;},async close(){delete globalThis.__steadyPG;await pg.close();}};
}
