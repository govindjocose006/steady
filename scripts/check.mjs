import {spawnSync} from 'node:child_process';
const checks=[
 ['scripts/verify-foundation.mjs'],
 ['scripts/verify-applications.mjs'],
 ['scripts/verify-workspace.mjs'],
 ['scripts/verify-motivation.mjs'],
 ['scripts/verify-opportunities.mjs'],
 ['node_modules/typescript/bin/tsc','--noEmit','--incremental','false']
];
for(const args of checks){
 const result=spawnSync(process.execPath,args,{stdio:'inherit',env:process.env});
 if(result.error){console.error(result.error.message);process.exit(1);}
 if(result.status!==0)process.exit(result.status??1);
}
console.log('All Steady checks passed.');
