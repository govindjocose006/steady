import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,dirname,join} from 'node:path';
import ts from 'typescript';

// Only isolated SQLite and platform identity are substituted. Real API/storage code runs.
export function testWorkspace(){
  const root=new URL('../',import.meta.url).pathname,directory=mkdtempSync(join(tmpdir(),'steady-history-'));
  const file=join(directory,'test.sqlite');let sqlite=new DatabaseSync(file),user={userId:'history-owner',email:'test@example.invalid'},failRead=false;
  for(const name of readdirSync(root+'/drizzle').filter(n=>n.endsWith('.sql')).sort())sqlite.exec(readFileSync(root+'/drizzle/'+name,'utf8'));
  const db={prepare(sql){let args=[];const statement={bind(...values){args=values;return statement;},async first(){if(failRead)throw new Error('PRIVATE query failure / notes / credential');return sqlite.prepare(sql).get(...args)||null;},async all(){if(failRead)throw new Error('PRIVATE query failure / notes / credential');return{results:sqlite.prepare(sql).all(...args)};},run(){if(failRead)throw new Error('PRIVATE query failure / notes / credential');if(/^\s*SELECT/i.test(sql))return{results:sqlite.prepare(sql).all(...args)};return{results:[],meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}};}};return statement;},async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>s.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}};
  globalThis.__steadyHistoryTest={getDb:()=>db,getChatGPTUser:async()=>user};
  const cache=new Map(),encode=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
  const mock=encode('export const getDb=()=>globalThis.__steadyHistoryTest.getDb();export const getChatGPTUser=()=>globalThis.__steadyHistoryTest.getChatGPTUser();');
  function moduleURL(file){
    const absolute=resolve(root,file);if(cache.has(absolute))return cache.get(absolute);
    let source=ts.transpileModule(readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    source=source.replace(/from (["'])([^"']+)\1/g,(full,quote,spec)=>{
      let url;if(spec==='@/db'||spec==='@/app/chatgpt-auth')url=mock;
      else if(spec.startsWith('@/')||spec.startsWith('.')){const base=spec.startsWith('@/')?resolve(root,spec.slice(2)):resolve(dirname(absolute),spec);const target=[base,base+'.ts',base+'.tsx',base+'/index.ts'].find(existsSync);url=moduleURL(target);}
      else url=import.meta.resolve(spec);return 'from '+JSON.stringify(url);
    });const url=encode(source);cache.set(absolute,url);return url;
  }
  return {moduleURL,get sqlite(){return sqlite;},get user(){return user;},set user(value){user=value;},set failRead(value){failRead=value;},reopen(){sqlite.close();sqlite=new DatabaseSync(file);},close(){sqlite.close();rmSync(directory,{recursive:true,force:true});delete globalThis.__steadyHistoryTest;}};
}
