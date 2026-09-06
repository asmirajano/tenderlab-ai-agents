/** Explicit local-only command. No credential discovery or cloud connector. */
import {access} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createFileSource} from './lib/tendermatch-stage10-source.mjs';
import {currentVersions,planDelta} from './lib/tendermatch-stage10-plan.mjs';
import {IncrementalStore} from './lib/tendermatch-stage10-store.mjs';
import {executeIncremental} from './lib/tendermatch-stage10.mjs';
export async function main(args=[]){
  if(!args.length)return {state:'DISCONNECTED',sourceConnections:0,modelCalls:0,usage:'--plan|--execute --source-dir DIR --state FILE.sqlite --tenant TENANT [--plan-id SHA256] [--batch N] [--max-batches N]'};
  const flags=new Map();for(let i=0;i<args.length;i++){const k=args[i];if(!['--plan','--execute','--source-dir','--state','--tenant','--plan-id','--batch','--max-batches'].includes(k)||flags.has(k))throw Error('EXPLICIT_LOCAL_ARGUMENTS_REQUIRED');flags.set(k,['--plan','--execute'].includes(k)?true:args[++i]);}
  if(flags.has('--execute')===flags.has('--plan')||!['--source-dir','--state','--tenant'].every(k=>typeof flags.get(k)==='string'))throw Error('EXPLICIT_LOCAL_ARGUMENTS_REQUIRED');
  const execute=flags.has('--execute'),state=flags.get('--state'),tenantId=flags.get('--tenant'),source=await createFileSource(flags.get('--source-dir'),tenantId),versions=await currentVersions();
  let exists=true;try{await access(state);}catch{exists=false;}
  // Planning does not create or mutate a file-backed store.
  let store=exists?new IncrementalStore(state,tenantId,{readOnly:!execute}):new IncrementalStore(':memory:',tenantId);
  try{const capture=await source.capture(),plan=planDelta(capture,store.active(),versions);
    if(!execute)return {state:'PLANNED_LOCAL_ONLY',plan,cloudRuntime:'PENDING_SEPARATE_STAGE7_AND_RUNTIME_GATE'};
    if(flags.get('--plan-id')!==plan.runId)throw Error('REVIEWED_PLAN_ID_REQUIRED');
    if(!exists){store.close();store=new IncrementalStore(state,tenantId);}
    return await executeIncremental({store,source,plan,versions,batch:Number(flags.get('--batch')??128),maxBatches:Number(flags.get('--max-batches')??1000),onProgress:progress=>console.log(JSON.stringify({event:'LOCAL_CHECKPOINT',...progress}))});
  }finally{store.close();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv.slice(2)).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({state:'FAILED_CLOSED',code:/^[A-Z_]{3,100}$/.test(e.message)?e.message:'LOCAL_COORDINATOR_FAILURE',sourceConnections:0,modelCalls:0}));process.exitCode=1;});
