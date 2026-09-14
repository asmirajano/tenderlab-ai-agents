/** Synthetic local SQL only. Never connects to source or results Neon. */
import {readFile} from 'node:fs/promises';
import {initializeStage6Fixture,sealSyntheticRanking,supplier,tender} from './tendermatch-stage6.mjs';
import {TENANT,sha} from '../../scripts/lib/tendermatch-input-manifest.mjs';
import {createShortlistRun,prepareShortlistRun,executeShortlist,completeShortlistRun} from '../../scripts/lib/tendermatch-stage6.mjs';
import {hash} from '../../packages/tendermatch/src/escalation-stage7.ts';
export async function initializeStage7Fixture(db,c,{supplierCount=null,tenderCount=null}={}){
 await initializeStage6Fixture(db);const sql=await readFile(new URL('../../db/tendermatch-dev/100-escalation-up.sql',import.meta.url),'utf8');await db.exec(sql.slice(sql.indexOf('CREATE TABLE')));
 const seeds=supplierCount&&tenderCount?[...Array.from({length:supplierCount},(_,n)=>supplier(n+1,n%3===0?[]:undefined)),...Array.from({length:tenderCount},(_,n)=>tender(n+10000,'GOODS',n%2?'medical supplies':'transformers electrical steel'))]:[supplier(1),supplier(2,[]),supplier(3,undefined,'WORKS'),supplier(4,[]),tender(20),tender(21,'GOODS','medical'),tender(22,'SERVICES'),tender(23,'WORKS','construction'),tender(24),tender(25),tender(26)],loaded=await sealSyntheticRanking(c,seeds,{register:true}),shortlist=createShortlistRun(loaded,{hash:sha('Stage7 synthetic shortlist')});await prepareShortlistRun(c,shortlist);await executeShortlist(c,shortlist);await completeShortlistRun(c,shortlist);
 const rows=[];for(const p of shortlist.pairs){const input=loaded.pairs.find(x=>x.supplierId===p.supplierId&&x.tenderId===p.tenderId),[f]=(await c.query(`SELECT f.states FROM tendermatch_retrieval.ranking_pair r JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=r.tenant_id AND f.policy_hash=r.formula_policy AND f.supplier_key=r.supplier_key AND f.tender_key=r.tender_key WHERE r.tenant_id=$1 AND r.method_hash=decode($2,'hex') AND r.formula_policy=decode($3,'hex') AND r.supplier_profile=decode($4,'hex') AND r.tender_profile=decode($5,'hex')`,[TENANT,p.methodHash,p.formulaPolicy,p.supplierProfile,p.tenderProfile])).rows;
 rows.push({pairKey:p.key,supplierId:p.supplierId,tenderId:p.tenderId,tier:p.tier,supplierProfile:p.supplierProfile,tenderProfile:p.tenderProfile,methodHash:p.methodHash,formulaPolicy:p.formulaPolicy,units:input.units,score:input.score,coverage:input.coverage,confidence:input.confidence,states:f.states,selection:p.selection});}
 rows.sort((a,b)=>a.pairKey<b.pairKey?-1:1);return {shortlistRunId:shortlist.runId,rows,inputHash:hash(rows)};
}
