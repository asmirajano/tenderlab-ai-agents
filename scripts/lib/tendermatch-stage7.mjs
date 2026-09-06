/** Only consumes sealed results; never discovers source connections or model credentials. */
import {readFile} from 'node:fs/promises';
import {TENANT,sha} from './tendermatch-input-manifest.mjs';
import {stage6CodeIdentity} from './tendermatch-stage6.mjs';
import {hash,assessmentInputIdentity,PROMPT,TORS_SCHEMA} from '../../packages/tendermatch/src/escalation-stage7.ts';
export const BASE='cc8c121795d6d95e71ab219b316b983a7bed583d';
export const root=new URL('../../',import.meta.url);
export const LIMITS=Object.freeze({automaticRequests:500,onDemandRequests:100,requestsPerPlan:600,perSupplier:10,perTender:2,attemptsPerJob:3,concurrentLeases:2,inputBytes:131072,outputBytes:131072,outputTokens:4096,leaseMs:60000});
export async function providerInspection(){
 const bindings={};for(const file of ['packages/tendermatch/src/selective-assessment.ts','scripts/lib/tendermatch-pair-service.mjs','scripts/serve-tendermatch-local.mjs','scripts/build-tendermatch-pair-snapshot.mjs'])bindings[file]=sha((await readFile(new URL(file,root),'utf8')).replaceAll('\r\n','\n'));
 return {state:'UNCONFIGURED',registeredExecutableAdapters:0,providerVersion:null,modelVersion:null,promptVersion:null,credentialLoaded:false,modelCalls:0,source:'ACTIVE_PATHS_EXPLICITLY_DISABLED_INTERFACE_AND_SYNTHETIC_TEST_PROVIDERS_ONLY',sourceBindings:bindings};
}
export async function stage7CodeIdentity(){const files={};for(const file of ['packages/tendermatch/src/escalation-stage7.ts','scripts/lib/tendermatch-stage7.mjs','scripts/lib/tendermatch-stage7-queue.mjs','scripts/tendermatch-stage7.mjs','db/tendermatch-dev/100-escalation-up.sql'])files[file]=sha((await readFile(new URL(file,root),'utf8')).replaceAll('\r\n','\n'));return {files,hash:sha(files)};}
export async function loadEscalationInputs(c){
 const proof=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage6-execute.json',root),'utf8'));if(sha(proof.code)!==sha(await stage6CodeIdentity()))throw new Error('Approved Stage 6 code differs');
 const [completion]=(await c.query('SELECT run_id,outcome_hash,pair_count::int,review_count::int,audit_count::int FROM tendermatch_retrieval.shortlist_completion WHERE tenant_id=$1 AND run_id=$2',[TENANT,proof.runId])).rows;if(!completion||completion.outcome_hash!==proof.identity.outcomeHash||completion.pair_count!==28034||completion.review_count!==18531||completion.audit_count!==9503)throw new Error('Approved shortlist completion differs');
 const rows=[];let after=null,pages=0;const start=performance.now();
 while(true){const batch=(await c.query(`SELECT encode(p.pair_key,'hex') "pairKey",p.supplier_id::text "supplierId",p.tender_id::text "tenderId",p.tier,encode(p.supplier_profile,'hex') "supplierProfile",encode(p.tender_profile,'hex') "tenderProfile",encode(p.method_hash,'hex') "methodHash",encode(p.formula_policy,'hex') "formulaPolicy",r.relevance_units units,f.pair_score score,f.data_coverage coverage,f.evidence_confidence confidence,f.states,p.selection
  FROM tendermatch_retrieval.shortlist_pair p JOIN tendermatch_retrieval.shortlist_member s ON s.tenant_id=p.tenant_id AND s.run_id=$2 AND s.kind='supplier' AND s.context_key=p.supplier_context
  JOIN tendermatch_retrieval.shortlist_member t ON t.tenant_id=p.tenant_id AND t.run_id=$2 AND t.kind='tender' AND t.context_key=p.tender_context
  JOIN tendermatch_retrieval.ranking_pair r ON r.tenant_id=p.tenant_id AND r.method_hash=p.method_hash AND r.formula_policy=p.formula_policy AND r.supplier_profile=p.supplier_profile AND r.tender_profile=p.tender_profile
  JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=r.tenant_id AND f.policy_hash=r.formula_policy AND f.supplier_key=r.supplier_key AND f.tender_key=r.tender_key
  WHERE p.tenant_id=$1 AND p.policy_hash=decode($3,'hex') AND ($4::bytea IS NULL OR p.pair_key>$4) ORDER BY p.pair_key LIMIT 1000`,[TENANT,proof.runId,proof.identity.policyHash,after&&Buffer.from(after,'hex')])).rows;pages++;rows.push(...batch);if(batch.length<1000)break;after=batch.at(-1).pairKey;}
 if(rows.length!==28034||rows.filter(p=>p.tier===1).length!==18531)throw new Error('Shortlist input projection differs');
 return {shortlistRunId:proof.runId,shortlistIdentity:proof.identity,rows,inputHash:hash(rows),metrics:{pages,elapsedMs:Math.round(performance.now()-start)}};
}
export async function prepareEvidence(c,pairs){
 const keys=[...new Set(pairs.flatMap(p=>[p.supplierProfile,p.tenderProfile]))],profiles=new Map();
 for(let i=0;i<keys.length;i+=200){const rows=(await c.query(`SELECT encode(p.profile_key,'hex') key,encode(p.input_key,'hex') "inputKey",p.kind,i.projection FROM tendermatch_retrieval.ranking_profile p JOIN tendermatch_retrieval.formula_input i ON i.tenant_id=p.tenant_id AND i.input_key=p.input_key WHERE p.tenant_id=$1 AND p.profile_key=ANY($2::bytea[])`,[TENANT,keys.slice(i,i+200).map(k=>Buffer.from(k,'hex'))])).rows;for(const row of rows)profiles.set(row.key,row);}
 if(profiles.size!==keys.length)throw new Error('Pinned frozen evidence absent');
 return pairs.map(p=>{const identity=assessmentInputIdentity(p),evidence=[profiles.get(p.supplierProfile),profiles.get(p.tenderProfile)].map(x=>({id:`formula-input:${x.inputKey}`,content:{kind:x.kind,projection:x.projection}})),input={identity,evidence,prompt:PROMPT,schemaVersion:TORS_SCHEMA};if(Buffer.byteLength(JSON.stringify(input))>LIMITS.inputBytes)throw new Error('INPUT_BUDGET_EXCEEDED');return {supplierId:p.supplierId,tenderId:p.tenderId,input,inputHash:hash(input),bytes:Buffer.byteLength(JSON.stringify(input))};});
}
