/** Stage 4 reads the explicitly approved Stage 3 snapshot, never refreshes sources. */
import {readFile} from 'node:fs/promises';
import {TENANT,sha} from './tendermatch-input-manifest.mjs';
import {loadPinnedScopeInputs,stage2,stage2a} from './tendermatch-eligibility-inputs.mjs';
import {createRun,eligibilityCodeIdentity} from './tendermatch-eligibility.mjs';
import {adaptStage2aSupplier,adaptStage2Tender} from '../../packages/tendermatch/src/formula-stage4-adapter.ts';
const root=new URL('../../',import.meta.url);
export const BASE='4b66114330e302f80f9415910d2e029106578d76';
export const STAGE3_RUN='7b3fbc39a401a72a6452c1d9bb050c18bc92d32a0f69acb4829f0a42236e102d';
export async function loadFormulaInputs(c){
 const proof=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage3-execute.json',root),'utf8'));
 const loaded=await loadPinnedScopeInputs(c),code=await eligibilityCodeIdentity(),scope=createRun(loaded.inputs,loaded.protectedInputs,code);
 if(scope.runId!==STAGE3_RUN||proof.runId!==STAGE3_RUN||sha(code)!==sha(proof.code))throw new Error('Approved Stage 3 implementation/input identity differs');
 const [header]=(await c.query('SELECT r.identity,c.outcome_hash,c.pair_count::text,c.counts FROM tendermatch_retrieval.eligibility_run r JOIN tendermatch_retrieval.eligibility_completion c USING(tenant_id,run_id) WHERE tenant_id=$1 AND run_id=$2',[TENANT,STAGE3_RUN])).rows;
 if(!header||sha(header.identity)!==STAGE3_RUN||header.outcome_hash!==proof.readback.outcomeHash||Number(header.pair_count)!==2027961||sha(header.counts)!==sha(proof.readback.counts))throw new Error('Approved Stage 3 completion differs');
 const readiness=JSON.parse(await readFile(new URL(`outputs/stage2a/readiness-${stage2a.runId}.json`,root),'utf8'));
 const suppliers=readiness.records.map(r=>adaptStage2aSupplier(r,scope.suppliers.find(s=>s.id===r.supplierId)));
 const scopeTenders=new Map(scope.tenders.map(t=>[t.id,t]));let after=null;const tenders=[];
 while(true){const rows=(await c.query(`SELECT m.entity_id::text,f.feature FROM tendermatch_retrieval.normalization_member m JOIN tendermatch_retrieval.normalized_feature f USING(tenant_id,feature_key) WHERE m.tenant_id=$1 AND m.normalization_id=$2 AND m.kind='tender' AND ($3::uuid IS NULL OR m.entity_id>$3::uuid) ORDER BY m.entity_id LIMIT 500`,[TENANT,stage2.normalizationId,after])).rows;
  for(const {feature:f} of rows){const {contentHash,...body}=f;if(sha(body)!==contentHash)throw new Error('Tender input hash differs');tenders.push(adaptStage2Tender(f,scopeTenders.get(f.id)));}
  if(rows.length<500)break;after=rows.at(-1).entity_id;
 }
 return {inputs:[...suppliers,...tenders],scope,stage3OutcomeHash:header.outcome_hash,stage3Counts:header.counts,protectedInputs:loaded.protectedInputs};
}
