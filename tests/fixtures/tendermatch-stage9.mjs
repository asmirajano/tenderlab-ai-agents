/** Synthetic local source projections through unchanged Stage 3–8 algorithms/SQL. */
import {readFile} from 'node:fs/promises';
import {initializeStage6Fixture,sealSyntheticRanking,supplier,tender,id} from './tendermatch-stage6.mjs';
import {TENANT,sha} from '../../scripts/lib/tendermatch-input-manifest.mjs';
import {createShortlistRun,prepareShortlistRun,executeShortlist,completeShortlistRun} from '../../scripts/lib/tendermatch-stage6.mjs';
import {hash} from '../../packages/tendermatch/src/escalation-stage7.ts';
import {createEscalationPlan,prepareEscalationPlan,automaticRequests,persistRequests} from '../../scripts/lib/tendermatch-stage7-queue.mjs';
import {HEADER_SQL,pinFromHeader} from '../../scripts/lib/tendermatch-stage8-store.mjs';
export {id};
export async function initializeStage9Fixture(db,c) {
  await initializeStage6Fixture(db);const sql=await readFile(new URL('../../db/tendermatch-dev/100-escalation-up.sql',import.meta.url),'utf8');await db.exec(sql.slice(sql.indexOf('CREATE TABLE')));
  const seeds=[supplier(1,[]),supplier(2),supplier(3,undefined,'WORKS'),supplier(4),supplier(5),supplier(6),...Array.from({length:36},(_,n)=>tender(n+10000,'GOODS',n%2?'medical supplies':'transformers electrical steel')),tender(10036,'SERVICES'),tender(10037,'WORKS','construction'),tender(10038,'WORKS','road construction'),tender(10039,'CONSULTING_SERVICES')];
  const loaded=await sealSyntheticRanking(c,seeds,{register:true}),shortlist=createShortlistRun(loaded,{hash:sha('Stage9 synthetic shortlist')});await prepareShortlistRun(c,shortlist);await executeShortlist(c,shortlist);await completeShortlistRun(c,shortlist);
  const rows=[];for(const p of shortlist.pairs){const input=loaded.pairs.find(x=>x.supplierId===p.supplierId&&x.tenderId===p.tenderId),[f]=(await c.query(`SELECT f.states FROM tendermatch_retrieval.ranking_pair r JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=r.tenant_id AND f.policy_hash=r.formula_policy AND f.supplier_key=r.supplier_key AND f.tender_key=r.tender_key WHERE r.tenant_id=$1 AND r.method_hash=decode($2,'hex') AND r.formula_policy=decode($3,'hex') AND r.supplier_profile=decode($4,'hex') AND r.tender_profile=decode($5,'hex')`,[TENANT,p.methodHash,p.formulaPolicy,p.supplierProfile,p.tenderProfile])).rows;rows.push({pairKey:p.key,supplierId:p.supplierId,tenderId:p.tenderId,tier:p.tier,supplierProfile:p.supplierProfile,tenderProfile:p.tenderProfile,methodHash:p.methodHash,formulaPolicy:p.formulaPolicy,units:input.units,score:input.score,coverage:input.coverage,confidence:input.confidence,states:f.states,selection:p.selection});}
  rows.sort((a,b)=>a.pairKey<b.pairKey?-1:1);const escalationInput={shortlistRunId:shortlist.runId,rows,inputHash:hash(rows)},plan=createEscalationPlan(escalationInput,{hash:hash('Stage9-local-upstream-fixture')});await prepareEscalationPlan(c,plan);const requests=await automaticRequests(c,plan,escalationInput);await persistRequests(c,requests);await db.exec('GRANT SELECT ON tendermatch_retrieval.schema_migration TO tendermatch_result_writer');
  const [header]=(await c.query(HEADER_SQL,[TENANT,plan.planId])).rows;return {pin:pinFromHeader(TENANT,header),header,plan,rows,requests,initialSupplierId:id(2),initialTenderId:id(10000),zeroSupplierId:id(1),outsideTenderId:id(10036),scopeTenderId:id(10037),auditPair:rows.find(p=>p.tier===2),reviewPair:rows.find(p=>p.tier===1)};
}
