import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';

const root=new URL('../',import.meta.url),db=new DatabaseSync(':memory:');
let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
try{
 for(const file of readdirSync(new URL('drizzle/',root)).filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync(new URL('drizzle/'+file,root),'utf8'));
 const contract=JSON.parse(readFileSync(new URL('supabase/schema-contract.json',root),'utf8'));
 const migrations=readdirSync(new URL('supabase/migrations/',root)).filter(f=>f.endsWith('.sql')).sort();
 const ddl=migrations.map(file=>readFileSync(new URL('supabase/migrations/'+file,root),'utf8')).join('\n');
 const names=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name!='sqlite_sequence' ORDER BY name").all().map(r=>r.name);
 check(JSON.stringify(names)===JSON.stringify(contract.map(c=>c.table)),'Every current feature has a corresponding Supabase table');
 for(const item of contract){
  const columns=db.prepare('PRAGMA table_info("'+item.table+'")').all();
  check(JSON.stringify(columns.map(c=>c.name))===JSON.stringify(item.columns.map(c=>c.name)),item.table+' preserves every existing field');
  const body=ddl.match(new RegExp('CREATE TABLE public."'+item.table+'" \\(([\\s\\S]*?)\\n\\);'))?.[1];
  check(Boolean(body),item.table+' created in migration');
  for(const column of item.columns)check(body.includes('"'+column.name+'"'),item.table+'.'+column.name+' included in migration');
  check(body.includes('"owner_id" uuid')&&body.includes('REFERENCES auth.users(id) ON DELETE RESTRICT'),item.table+' uses verified account identity and retains history on account deletion');
  check(ddl.includes('ALTER TABLE public."'+item.table+'" ENABLE ROW LEVEL SECURITY'),item.table+' RLS enabled');
  check(ddl.includes('ALTER TABLE public."'+item.table+'" FORCE ROW LEVEL SECURITY'),item.table+' RLS forced');
  check(ddl.includes('REVOKE ALL ON TABLE public."'+item.table+'" FROM PUBLIC, anon, authenticated'),item.table+' fails closed');
  check(ddl.includes('CREATE POLICY owner_read ON public."'+item.table+'" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = owner_id)'),item.table+' isolated by authenticated ownership');
 }
 check(!/GRANT\s+(INSERT|UPDATE|DELETE|ALL).*\bTO authenticated\b/i.test(ddl),'Browser write APIs remain disabled until atomic save operations are implemented');
 check(!/SECURITY DEFINER/i.test(ddl),'No privileged public helper bypasses access controls');
 check(!/INSERT INTO auth\.users|INSERT INTO public\./i.test(ddl),'No fixtures or personal records embedded in migrations');
 const privacy=readFileSync(new URL('supabase/tests/private_access.sql',root),'utf8');
 check(privacy.startsWith('-- Rollback-only')&&privacy.includes('BEGIN;')&&privacy.endsWith('ROLLBACK;\n'),'Live database verification fixtures are rolled back');
 for(const table of names)check(privacy.includes('cross-account isolation '+table)&&privacy.includes('browser writes blocked '+table),table+' has meaningful role/isolation coverage');
 check(ddl.includes('REVOKE ALL ON SCHEMA steady_private FROM PUBLIC, anon, authenticated'),'Identity mappings are not exposed');
 console.log(`PASS: ${checks} Supabase foundation checks (schema parity, ownership, fail-closed permissions and rollback-only access tests).`);
}finally{db.close();}
