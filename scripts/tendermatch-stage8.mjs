/** Default disconnected. Constructing the Neon adapter needs explicit target authority. */
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {executionAuthority} from './lib/tendermatch-dev-contract.mjs';
import {connectStage3} from './lib/tendermatch-eligibility-inputs.mjs';
import {TENANT,sha} from './lib/tendermatch-input-manifest.mjs';
import {createStage8Store} from './lib/tendermatch-stage8-store.mjs';
export const STAGE8_BASE='23560646a3e2734d301d4ac88e5ee000f3a9a7dc';
export const stage8Root=new URL('../',import.meta.url);
export async function stage8CodeIdentity(){const files={};for(const name of ['packages/tendermatch/src/service-stage8.ts','scripts/lib/tendermatch-stage8-store.mjs','scripts/lib/tendermatch-stage8-http.mjs','scripts/tendermatch-stage8.mjs'])files[name]=sha((await readFile(new URL(name,stage8Root),'utf8')).replaceAll('\r\n','\n'));return {files,hash:sha(files)};}
export async function developmentPin(){
  const read=async name=>JSON.parse(await readFile(new URL('docs/evidence/'+name,stage8Root),'utf8'));
  const [s4,s5,s6,s7]=await Promise.all([read('tendermatch-stage4-execute.json'),read('tendermatch-stage5-execute.json'),read('tendermatch-stage6-execute.json'),read('tendermatch-stage7-comparison.json')]);
  return {tenantId:TENANT,planId:s7.expectedPersistence.planId,planCodeHash:s7.code.hash,allocationHash:s7.chosen.outcomeHash,automaticRequests:s7.expectedPersistence.requests,shortlistRunId:s6.runId,shortlistOutcomeHash:s6.identity.outcomeHash,rankingRunId:s5.runId,rankingOutcomeHash:s5.execution.outcomeHash,methodHash:s5.identity.methodHash,formulaRunId:s4.runId,formulaOutcomeHash:s4.execution.outcomeHash,formulaPolicy:s4.identity.policyHash,eligibilityRunId:s4.identity.stage3RunId,eligibilityOutcomeHash:s4.identity.stage3OutcomeHash,eligibilityPolicy:s4.identity.stage3Policy};
}
export async function createApprovedNeonStage8Store({args=[],env=process.env,cursors}){
  executionAuthority(args,env);return createStage8Store({connect:()=>connectStage3(),pins:[await developmentPin()],cursors});
}
export function main(){return {stage:8,base:STAGE8_BASE,connects:false,listens:false,modelCalls:0,requires:['server-provisioned authentication','explicit version binding','installed Stage 7 schema and sealed plan','separate target connection authority'],legacyFallback:false};}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(main(),null,2));
