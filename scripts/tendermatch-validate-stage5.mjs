/** Independent read-only Stage 5 persistence audit; never migrates or modifies rows. */
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {connectStage3} from './lib/tendermatch-eligibility-inputs.mjs';
import {executionAuthority} from './lib/tendermatch-dev-contract.mjs';
import {TENANT,sha} from './lib/tendermatch-input-manifest.mjs';
import {stage5CodeIdentity,loadSealedFormula,loadCachedProfiles,createRankingRun,queryRanking,selectedRankingDetail,TABLES} from './lib/tendermatch-stage5.mjs';
const root=new URL('../',import.meta.url);
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
export async function main(args=process.argv.slice(2)){
 if((args[0]??'plan')==='plan')return {stage:5,connects:false,readOnly:true,modes:['verify']};
 if(args[0]!=='verify')throw new Error('Unknown Stage 5 audit mode');executionAuthority(args,process.env);
 const proof=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage5-execute.json',root),'utf8'));
 const experiment=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage5-inspect.json',root),'utf8'));
 const code=await stage5CodeIdentity();assert(sha(proof.code)===sha(code)&&sha(experiment.code)===sha(code),'Stage 5 code/evidence binding differs');
 for(const p of [proof.execution,proof.readback,proof.rerun])assert(p.count===707660&&p.outcomeHash===experiment.experiment.outcomeHash&&p.formulaCandidateHash===experiment.experiment.formulaCandidateHash,'Full persisted/replayed outcome differs');
 const c=await connectStage3(),start=performance.now();try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const loaded=await loadSealedFormula(c),cached=await loadCachedProfiles(c,loaded.inputs),run=createRankingRun(loaded,code,{profileCache:cached});
  assert(run.runId===proof.runId&&run.extraction.extracted===0&&run.extraction.reused===17450,'Stored profile reuse differs');
  const report={stage:5,evidenceClass:'INDEPENDENT_READ_ONLY_NEON_VALIDATION',runId:run.runId,code,validatorHash:sha((await readFile(new URL('scripts/tendermatch-validate-stage5.mjs',root),'utf8')).replaceAll('\r\n','\n')),startedAt:new Date().toISOString(),profileReuse:run.extraction};
  const sqlStart=performance.now();
  const [counts]=(await c.query(`WITH profiles AS MATERIALIZED (
 SELECT profile_key,jsonb_array_length(profile->'terms') terms,jsonb_array_length(profile->'concepts') concepts FROM tendermatch_retrieval.ranking_profile WHERE tenant_id=$1)
 SELECT count(*)::int total,count(DISTINCT (p.supplier_id,p.tender_id))::int unique_pairs,
 count(*) FILTER(WHERE p.relevance_units=0)::int zero,min(p.relevance_units)::int min_units,max(p.relevance_units)::int max_units,
 count(*) FILTER(WHERE p.relevance_units NOT BETWEEN 0 AND 1000000 OR p.lexical_overlap>p.lexical_union OR p.structured_overlap>p.structured_union
 OR p.lexical_union<>s.terms+t.terms-p.lexical_overlap OR p.structured_union<>s.concepts+t.concepts-p.structured_overlap
 OR p.relevance_units<>(CASE WHEN p.lexical_union=0 THEN 0 ELSE 800000*p.lexical_overlap/p.lexical_union END)+(CASE WHEN p.structured_union=0 THEN 0 ELSE 200000*p.structured_overlap/p.structured_union END))::int invalid_components,
 count(*) FILTER(WHERE f.supplier_key IS NULL)::int missing_formula
 FROM tendermatch_retrieval.ranking_pair p JOIN profiles s ON s.profile_key=p.supplier_profile JOIN profiles t ON t.profile_key=p.tender_profile
 LEFT JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=p.tenant_id AND f.policy_hash=p.formula_policy AND f.supplier_key=p.supplier_key AND f.tender_key=p.tender_key
 WHERE p.tenant_id=$1 AND p.method_hash=decode($2,'hex') AND p.formula_policy=decode($3,'hex')`,[TENANT,run.methodHash,run.formula.policyHash])).rows;
  assert(counts.total===707660&&counts.unique_pairs===707660&&counts.zero===683653&&counts.invalid_components===0&&counts.missing_formula===0,'Independent SQL reconciliation failed');
  report.sql={...counts,elapsedMs:Math.round(performance.now()-sqlStart)};
  const [completion]=(await c.query(`SELECT outcome_hash,pair_count::text,zero_count::text FROM tendermatch_retrieval.ranking_completion WHERE tenant_id=$1 AND run_id=$2`,[TENANT,run.runId])).rows;
  assert(completion.outcome_hash===proof.readback.outcomeHash&&Number(completion.pair_count)===707660&&Number(completion.zero_count)===683653,'Completion differs');report.completion=completion;
  const supplierIds=[...run.suppliers].sort((a,b)=>(proof.readback.bySupplier[b.id]??0)-(proof.readback.bySupplier[a.id]??0)||a.id.localeCompare(b.id));
  const tenderIds=[...run.tenders].sort((a,b)=>(proof.readback.byTender[b.id]??0)-(proof.readback.byTender[a.id]??0)||a.id.localeCompare(b.id));
  report.fullTraversals={};report.boundedPages={};
  for(const [direction,profile,expected] of [['supplier',supplierIds[0],proof.readback.bySupplier[supplierIds[0].id]],['tender',tenderIds[0],proof.readback.byTender[tenderIds[0].id]]]){
   const pageStart=performance.now(),bounded=await queryRanking(c,run,{direction,focusId:profile.id,limit:25});
   report.boundedPages[direction]={rows:bounded.results.length,elapsedMs:Math.round(performance.now()-pageStart),bytes:Buffer.byteLength(JSON.stringify(bounded)),hasMore:bounded.hasMore,includesCompletionCheck:true};
   const begun=performance.now(),seen=new Set();let cursor=null,pages=0,last=null,maxResponse=0,zeroRows=0;do{
    const response=await queryRanking(c,run,{direction,focusId:profile.id,limit:100,cursor});pages++;maxResponse=Math.max(maxResponse,Buffer.byteLength(JSON.stringify(response)));
    assert(response.results.length<=100,'Unbounded ranking page');
    for(const row of response.results){const id=direction==='supplier'?row.tenderId:row.supplierId;assert(!seen.has(id),'Duplicate ranked keyset row');seen.add(id);
     if(last)assert(last.units>row.retrieval.units||last.units===row.retrieval.units&&last.id<id,'Ranking order/keyset is unstable');
     assert(Number.isInteger(row.formula.pairScore)&&row.formula.denominator===100&&row.retrieval.semanticSimilarity===null&&row.retrieval.semanticState==='MISSING','Formula/retrieval boundary differs');zeroRows+=Number(row.retrieval.units===0);last={units:row.retrieval.units,id};
    }cursor=response.nextCursor;
   }while(cursor);
   assert(seen.size===expected,'Incomplete focused traversal');report.fullTraversals[direction]={focusId:profile.id,rows:seen.size,pages,maxResponseBytes:maxResponse,elapsedMs:Math.round(performance.now()-begun),unique:true,ordered:true,zeroRows,includesZero:zeroRows>0};
  }
  report.detailSamples=[];for(const sample of proof.readback.samples){const detail=await selectedRankingDetail(c,run,sample);assert(sha(detail.formula)===sha(sample.formula)&&detail.retrieval.relevanceUnits===sample.retrieval.relevanceUnits,'Selected detail differs from complete readback');assert(detail.criteria.reduce((n,x)=>n+x.points,0)===detail.formula.pairScore&&detail.criteria.reduce((n,x)=>n+x.maxPoints,0)===100,'Expanded criterion sum differs');report.detailSamples.push({supplierId:sample.supplierId,tenderId:sample.tenderId,relevance:detail.retrieval.retrievalRelevance,pairScore:detail.formula.pairScore,coverage:detail.formula.dataCoverage,criterionParity:true});}
  const emptySupplier=supplierIds.find(p=>!proof.readback.bySupplier[p.id]),emptyTender=tenderIds.find(p=>!proof.readback.byTender[p.id]);
  for(const [direction,p] of [['supplier',emptySupplier],['tender',emptyTender]]){assert(p,'Expected empty focus absent');const page=await queryRanking(c,run,{direction,focusId:p.id});assert(page.results.length===0&&!page.nextCursor&&!page.hasMore,'Noncandidate focus was ranked');}
  report.emptyFocuses={supplier:emptySupplier.id,tender:emptyTender.id,rows:0};
  report.incrementalCandidateHistogram={};for(const [kind,profiles,counts] of [['supplier',run.suppliers,proof.readback.bySupplier],['tender',run.tenders,proof.readback.byTender]]){const histogram={};for(const p of profiles){const n=counts[p.id]??0;histogram[n]=(histogram[n]??0)+1;}report.incrementalCandidateHistogram[kind]=histogram;}
  report.privileges=(await c.query(`SELECT c.relname,c.relrowsecurity,pg_get_userbyid(c.relowner) owner,has_table_privilege(current_user,c.oid,'SELECT') can_select,has_table_privilege(current_user,c.oid,'INSERT') can_insert,has_table_privilege(current_user,c.oid,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') extra FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tendermatch_retrieval' AND c.relname=ANY($1::text[]) ORDER BY c.relname`,[TABLES])).rows;
  assert(report.privileges.length===5&&report.privileges.every(p=>p.relrowsecurity&&p.owner==='neondb_owner'&&p.can_select&&p.can_insert&&!p.extra),'Role/security differs');
  report.databaseBytes=(await c.query('SELECT pg_database_size(current_database())::text n')).rows[0].n;
  report.storage=(await c.query(`SELECT c.relname table_name,pg_total_relation_size(c.oid)::text total_bytes,pg_relation_size(c.oid)::text heap_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tendermatch_retrieval' AND c.relname=ANY($1::text[]) ORDER BY c.relname`,[TABLES])).rows;
  const [unchanged]=(await c.query(`SELECT outcome_hash,scored_count::text,unscored_count::text FROM tendermatch_retrieval.formula_completion WHERE tenant_id=$1 AND run_id=$2`,[TENANT,run.formula.runId])).rows;assert(unchanged.outcome_hash===run.formula.outcomeHash&&Number(unchanged.scored_count)===707660&&Number(unchanged.unscored_count)===1320301,'Protected Formula completion differs');report.protectedFormula=unchanged;
  report.metrics={elapsedMs:Math.round(performance.now()-start),connection:c.metrics,memory:process.memoryUsage()};report.finishedAt=new Date().toISOString();report.sourceConnections=0;report.modelCalls=0;report.committedWrites=0;
  await c.query('ROLLBACK');await writeFile(new URL('docs/evidence/tendermatch-stage5-validation.json',root),JSON.stringify(report,null,2)+'\n');return report;
 }finally{await c.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({status:'FAILED',message:e.message?.replace(/postgres(?:ql)?:\/\/\S+/gi,'[redacted]'),code:e.code??'STAGE5_VALIDATION_FAILED'}));process.exitCode=1;});
