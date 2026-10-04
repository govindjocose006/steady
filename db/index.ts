import {serverClient} from '@/lib/supabase/server';
import {compilePostgres,type Parameter} from '@/lib/postgres-compat';
type Result={results:Record<string,unknown>[];meta:{changes:number};success:true};
export type Executor=(sql:string[])=>Promise<Result[]>;
export function database(execute:Executor):D1Database{
 class Statement{constructor(readonly source:string,readonly args:Parameter[]=[]){ }bind(...args:Parameter[]){return new Statement(this.source,args);}sql(){return compilePostgres(this.source,this.args);}async all(){return (await execute([this.sql()]))[0];}async first(){return (await this.all()).results[0]||null;}async run(){return (await execute([this.sql()]))[0];}}
 return {prepare:(sql:string)=>new Statement(sql),batch:(statements:Statement[])=>execute(statements.map(s=>s.sql()))} as unknown as D1Database;
}
export function getDb():D1Database{return database(async statements=>{
 const key=process.env.STEADY_DATABASE_SERVER_KEY;if(!key)throw new Error('Private storage is not configured.');const client=await serverClient();const {data,error}=await client.rpc('steady_batch',{statements,server_key:key});if(error||!Array.isArray(data))throw new Error('Private storage request failed.');return data as Result[];
});}
