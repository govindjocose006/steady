export type Parameter=string|number|null;
// This adapter receives parameterised, server-generated SQL only.
export function compilePostgres(source:string,values:Parameter[]=[]):string{
 let sql=source.replace(/json_extract\((\w+),'\$\.([\w.]+)'\)/g,(_all,column:string,path:string)=>{
  const expression=`(${column}::jsonb #>> '{${path.split('.').join(',')}}')`;
  return path.startsWith('points.')||path==='focusDailyLimit'?`(${expression})::integer`:expression;
 });
 const ignore=/^\s*INSERT OR IGNORE\b/i.test(sql);sql=sql.replace(/^\s*INSERT OR IGNORE\b/i,'INSERT');
 const target=sql.match(/^\s*INSERT INTO (\w+)/i)?.[1];
 if(/ON CONFLICT DO UPDATE/.test(sql)){
  const keys:Record<string,string>={day_plans:'owner_id,date',weekly_reviews:'owner_id,week_start',day_templates:'id',motivation_settings:'owner_id',workspace_settings:'owner_id'};
  if(!target||!keys[target])throw new Error('Unknown conflict target.');sql=sql.replace('ON CONFLICT DO UPDATE','ON CONFLICT ('+keys[target]+') DO UPDATE');
 }
 const pieces=sql.match(/'(?:''|[^'])*'|"(?:""|[^"])*"|[^'"]+/g)||[];let index=0;
 sql=pieces.map(piece=>{
  if(piece[0]==="'"||piece[0]==='"')return piece;
  return piece.replace(/\bAS\s+([a-zA-Z][a-zA-Z0-9]*)/g,'AS "$1"').replace(/\bWHERE\s+1\b/g,'WHERE TRUE')
   .replace(/\b(AND|OR|NOT)\s*\(\s*\(*\s*([01])\s*\)*\s*\)/g,(_m,operator:string,n:string)=>`${operator} (${n==='1'?'TRUE':'FALSE'})`)
   .replace(/\?/g,()=>{if(index>=values.length)throw new Error('Missing statement parameter.');const value=values[index++];if(value===null)return 'NULL';if(typeof value==='number'){if(!Number.isFinite(value))throw new Error('Invalid numeric parameter.');return String(value);}if(typeof value!=='string'||value.includes('\0'))throw new Error('Invalid text parameter.');return "'"+value.replaceAll("'","''")+"'";});
 }).join('');
 if(index!==values.length)throw new Error('Unexpected statement parameters.');return sql+(ignore?' ON CONFLICT DO NOTHING':'');
}
