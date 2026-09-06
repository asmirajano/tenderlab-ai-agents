/** Synthetic isolated SQL fixtures only; never connects to Neon or source systems. */
import {readFile} from 'node:fs/promises';
import {TENANT,sha} from '../../scripts/lib/tendermatch-input-manifest.mjs';
import {supplier,tender,id,sealSyntheticFormula} from './tendermatch-stage5.mjs';
import {createRankingRun,prepareRankingRun,executeRanking,completeRankingRun} from '../../scripts/lib/tendermatch-stage5.mjs';
export {supplier,tender,id};
export async function initializeStage6Fixture(db){
 await db.exec(`CREATE SCHEMA tendermatch_retrieval;CREATE ROLE tendermatch_result_writer NOLOGIN;GRANT USAGE ON SCHEMA tendermatch_retrieval TO tendermatch_result_writer;CREATE TABLE tendermatch_retrieval.schema_migration(version text primary key);CREATE FUNCTION tendermatch_retrieval.reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Immutable'; END $$;
CREATE TABLE tendermatch_retrieval.normalized_feature(tenant_id text,feature_key text,PRIMARY KEY(tenant_id,feature_key));CREATE TABLE tendermatch_retrieval.normalization_snapshot(tenant_id text,normalization_id text,supplier_count int,tender_count int,PRIMARY KEY(tenant_id,normalization_id));CREATE TABLE tendermatch_retrieval.normalization_member(tenant_id text,normalization_id text,kind text,entity_id uuid,feature_key text);`);
 for(const file of ['060-eligibility-up.sql','070-formula-up.sql','080-ranking-up.sql','090-shortlist-up.sql']){const sql=await readFile(new URL('../../db/tendermatch-dev/'+file,import.meta.url),'utf8');await db.exec(sql.slice(sql.indexOf('CREATE TABLE')));}
 await db.exec('GRANT SELECT ON tendermatch_retrieval.normalization_member,tendermatch_retrieval.normalization_snapshot TO tendermatch_result_writer');
}
export async function sealSyntheticRanking(c,seeds,{register=false}={}){
 const loaded=await sealSyntheticFormula(c,seeds,{register}),run=createRankingRun(loaded,{hash:sha('Stage6 synthetic ranking code')});await prepareRankingRun(c,run);const proof=await executeRanking(c,run);await completeRankingRun(c,run,proof);
 const members=[...run.suppliers,...run.tenders].map(p=>({kind:p.kind,id:p.id,profile_key:p.key,input_key:p.formulaInputKey}));
 const pairs=[];for(const s of run.suppliers){const rows=(await c.query(`SELECT supplier_id::text "supplierId",tender_id::text "tenderId",units,score,coverage,confidence,mask,limitation FROM tendermatch_retrieval.shortlist_focus_inputs($1,$2,'supplier',$3) ORDER BY supplier_id,tender_id`,[TENANT,run.runId,s.id])).rows;pairs.push(...rows);}
 return {rankingRunId:run.runId,rankingIdentity:run.identity,rankingOutcomeHash:proof.outcomeHash,members,pairs,inputHash:sha(pairs),ranking:run};
}
