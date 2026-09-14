/** Independent read-only Stage 6 audit. No owner DDL, probes or data writes. */
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {connectStage3} from './lib/tendermatch-eligibility-inputs.mjs';
import {executionAuthority} from './lib/tendermatch-dev-contract.mjs';
import {TENANT,sha} from './lib/tendermatch-input-manifest.mjs';
import {loadShortlistInputs,protectedStage6State} from './tendermatch-stage6.mjs';
import {stage6CodeIdentity,createShortlistRun,loadContextCache,executeShortlist,queryShortlist,selectedShortlistDetail,shortlistPageSpec,TABLES} from './lib/tendermatch-stage6.mjs';
const root=new URL('../',import.meta.url),assert=(condition,message)=>{if(!condition)throw new Error(message);};
export async function main(args=process.argv.slice(2)){
 if((args[0]??'plan')==='plan')return {stage:6,connects:false,readOnly:true,modes:['verify']};
 if(args[0]!=='verify')throw new Error('Unknown Stage 6 audit mode');executionAuthority(args,process.env);
 const proof=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage6-execute.json',root),'utf8')),comparison=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage6-comparison.json',root),'utf8')),code=await stage6CodeIdentity();
 assert(sha(proof.code)===sha(code)&&sha(comparison.code)===sha(code),'Stage 6 evidence/code binding differs');
 for(const p of [proof.execution,proof.readback,proof.rerun])assert(p.count===28034&&p.outcomeHash===comparison.identity.outcomeHash,'Persisted/replayed union differs');
 const c=await connectStage3(),start=performance.now();try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const before=await protectedStage6State(c),loaded=await loadShortlistInputs(c),cache=await loadContextCache(c),run=createShortlistRun(loaded,code,{contextCache:cache}),replayed=createShortlistRun({...loaded,pairs:[...loaded.pairs].reverse(),members:[...loaded.members].reverse()},code);
  assert(run.runId===proof.runId&&run.runId===replayed.runId&&run.extraction.extracted===0&&run.extraction.reused===17450,'Context extraction/replay differs');
  assert(sha(run.contexts)===sha(replayed.contexts)&&sha(run.pairs)===sha(replayed.pairs),'Fresh nomination replay differs from stored contexts');
  const report={stage:6,evidenceClass:'INDEPENDENT_READ_ONLY_NEON_VALIDATION',runId:run.runId,identity:run.identity,code,validatorHash:sha((await readFile(new URL('scripts/tendermatch-validate-stage6.mjs',root),'utf8')).replaceAll('\r\n','\n')),startedAt:new Date().toISOString(),protectedBefore:before,inputMetrics:loaded.metrics,contextReuse:run.extraction,freshReversedReplay:{contexts:replayed.contexts.length,pairs:replayed.pairs.length,identical:true}};
  report.fullReadback=await executeShortlist(c,run,{readOnly:true});
  const begun=performance.now();
  const [counts]=(await c.query(`SELECT count(*)::int total,count(DISTINCT (p.supplier_id,p.tender_id))::int unique_pairs,
   count(*) FILTER(WHERE p.tier=1)::int review,count(*) FILTER(WHERE p.tier=2)::int audit,
   count(*) FILTER(WHERE r.supplier_id IS NULL OR f.supplier_key IS NULL)::int missing_prior,
   count(*) FILTER(WHERE p.tier=1 AND r.relevance_units<=0 OR p.tier=2 AND r.relevance_units<>0)::int invalid_tier,
   count(*) FILTER(WHERE (p.selection->>'reasonMask')::int NOT IN (1,2,3,4,8,12) OR
    p.tier=1 AND (p.selection->>'reasonMask')::int NOT IN (1,2,3) OR p.tier=2 AND (p.selection->>'reasonMask')::int NOT IN (4,8,12))::int invalid_reasons
   FROM tendermatch_retrieval.shortlist_pair p
   JOIN tendermatch_retrieval.shortlist_member s ON s.tenant_id=p.tenant_id AND s.run_id=$2 AND s.kind='supplier' AND s.context_key=p.supplier_context
   JOIN tendermatch_retrieval.shortlist_member t ON t.tenant_id=p.tenant_id AND t.run_id=$2 AND t.kind='tender' AND t.context_key=p.tender_context
   LEFT JOIN tendermatch_retrieval.ranking_pair r ON r.tenant_id=p.tenant_id AND r.method_hash=p.method_hash AND r.formula_policy=p.formula_policy AND r.supplier_profile=p.supplier_profile AND r.tender_profile=p.tender_profile
   LEFT JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=r.tenant_id AND f.policy_hash=r.formula_policy AND f.supplier_key=r.supplier_key AND f.tender_key=r.tender_key
   WHERE p.tenant_id=$1 AND p.policy_hash=decode($3,'hex')`,[TENANT,run.runId,run.policyHash])).rows;
  assert(counts.total===28034&&counts.unique_pairs===28034&&counts.review===18531&&counts.audit===9503&&counts.missing_prior===0&&counts.invalid_tier===0&&counts.invalid_reasons===0,'Independent SQL pair reconciliation failed');
  const [union]=(await c.query(`WITH noms AS MATERIALIZED (
   SELECT c.kind,c.entity_id,n FROM tendermatch_retrieval.shortlist_member m JOIN tendermatch_retrieval.shortlist_context c USING(tenant_id,context_key)
   CROSS JOIN LATERAL jsonb_array_elements(c.context->'nominations') n WHERE m.tenant_id=$1 AND m.run_id=$2)
   SELECT count(*)::int nominations,count(DISTINCT (n->>'supplierId',n->>'tenderId'))::int union_pairs,
   count(*) FILTER(WHERE (n->>'rank')::int<1 OR (n->>'rank')::int>CASE WHEN kind='supplier' THEN CASE WHEN n->>'tier'='REVIEW_CANDIDATE' THEN 100 ELSE 2 END ELSE CASE WHEN n->>'tier'='REVIEW_CANDIDATE' THEN 3 ELSE 1 END END OR entity_id::text<>n->>(kind||'Id'))::int invalid_nomination,
   count(*) FILTER(WHERE n->>'tier'='REVIEW_CANDIDATE')::int positive_nominations,
   count(*) FILTER(WHERE n->>'tier'='AUDIT_ONLY')::int audit_nominations FROM noms`,[TENANT,run.runId])).rows;
  assert(union.union_pairs===28034&&union.invalid_nomination===0,'Independent nomination union/caps failed');
  report.sql={...counts,...union,elapsedMs:Math.round(performance.now()-begun)};
  const nominationStart=performance.now();
  const [nominations]=(await c.query(`WITH b AS MATERIALIZED (
   SELECT p.supplier_id,p.tender_id,p.relevance_units units,f.pair_score score,f.data_coverage coverage,f.evidence_confidence confidence
   FROM tendermatch_retrieval.ranking_pair p JOIN tendermatch_retrieval.ranking_member s ON s.tenant_id=p.tenant_id AND s.run_id=$2 AND s.kind='supplier' AND s.profile_key=p.supplier_profile
   JOIN tendermatch_retrieval.ranking_member t ON t.tenant_id=p.tenant_id AND t.run_id=$2 AND t.kind='tender' AND t.profile_key=p.tender_profile
   JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=p.tenant_id AND f.policy_hash=p.formula_policy AND f.supplier_key=p.supplier_key AND f.tender_key=p.tender_key
   WHERE p.tenant_id=$1 AND p.method_hash=decode($3,'hex') AND p.formula_policy=decode($4,'hex')),
   pos AS MATERIALIZED (SELECT *,row_number() OVER(PARTITION BY supplier_id ORDER BY units DESC,score DESC,coverage DESC,confidence DESC,tender_id) sr,
    row_number() OVER(PARTITION BY tender_id ORDER BY units DESC,score DESC,coverage DESC,confidence DESC,supplier_id) tr,
    count(*) OVER(PARTITION BY supplier_id,units,score,coverage,confidence) st,count(*) OVER(PARTITION BY tender_id,units,score,coverage,confidence) tt FROM b WHERE units>0),
   zeros AS MATERIALIZED (SELECT *,encode(sha256(convert_to('["tendermatch-directional-shortlist/1.0.0","blind-spot-audit","'||supplier_id::text||'","'||tender_id::text||'"]','UTF8')),'hex') priority FROM b WHERE units=0),
   audit AS MATERIALIZED (SELECT *,row_number() OVER(PARTITION BY supplier_id ORDER BY priority,tender_id) sr,row_number() OVER(PARTITION BY tender_id ORDER BY priority,supplier_id) tr,count(*) OVER(PARTITION BY supplier_id) st,count(*) OVER(PARTITION BY tender_id) tt FROM zeros),
   chosen AS (SELECT 'supplier' kind,supplier_id id,supplier_id,tender_id,1 tier,sr rank,st ties FROM pos WHERE sr<=100
    UNION ALL SELECT 'tender',tender_id,supplier_id,tender_id,1,tr,tt FROM pos WHERE tr<=3
    UNION ALL SELECT 'supplier',supplier_id,supplier_id,tender_id,2,sr,st FROM audit WHERE sr<=2
    UNION ALL SELECT 'tender',tender_id,supplier_id,tender_id,2,tr,tt FROM audit WHERE tr<=1),
   expected AS (SELECT kind,id,jsonb_agg(jsonb_build_object('supplierId',supplier_id::text,'tenderId',tender_id::text,'tier',CASE WHEN tier=1 THEN 'REVIEW_CANDIDATE' ELSE 'AUDIT_ONLY' END,'rank',rank,'tieSize',ties,'reason',upper(kind)||CASE WHEN tier=1 THEN '_POSITIVE_BUDGET' ELSE '_ZERO_RETRIEVAL_AUDIT' END) ORDER BY tier,rank) noms FROM chosen GROUP BY kind,id)
   SELECT count(*)::int contexts,count(*) FILTER(WHERE c.context->'nominations' IS DISTINCT FROM coalesce(e.noms,'[]'::jsonb))::int mismatches,
   (SELECT count(*)::int FROM b) candidates,(SELECT count(*)::int FROM chosen) nominations
   FROM tendermatch_retrieval.shortlist_member m JOIN tendermatch_retrieval.shortlist_context c USING(tenant_id,context_key)
   LEFT JOIN expected e ON e.kind=c.kind AND e.id=c.entity_id WHERE m.tenant_id=$1 AND m.run_id=$5`,[TENANT,loaded.rankingRunId,loaded.rankingIdentity.methodHash,loaded.rankingIdentity.formulaPolicy,run.runId])).rows;
  assert(nominations.contexts===17450&&nominations.candidates===707660&&nominations.mismatches===0&&nominations.nominations===union.nominations,'Independent full-population SQL nomination replay differs');
  report.independentSqlNominations={...nominations,elapsedMs:Math.round(performance.now()-nominationStart)};
  const [completion]=(await c.query('SELECT outcome_hash,pair_count::int,review_count::int,audit_count::int FROM tendermatch_retrieval.shortlist_completion WHERE tenant_id=$1 AND run_id=$2',[TENANT,run.runId])).rows;
  assert(completion.outcome_hash===run.identity.outcomeHash&&completion.pair_count===28034&&completion.review_count===18531&&completion.audit_count===9503,'Completion differs');report.completion=completion;
  report.boundedPages={};report.fullTraversals={};report.plans={};report.emptyFocuses={};
  for(const direction of ['supplier','tender']){
   const focused=new Map();for(const p of run.pairs)focused.set(p[`${direction}Id`],(focused.get(p[`${direction}Id`])??0)+1);
   const [focusId,expected]=[...focused].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0],pageStart=performance.now(),bounded=await queryShortlist(c,run,{direction,focusId,limit:25});
   report.boundedPages[direction]={rows:bounded.results.length,elapsedMs:Math.round(performance.now()-pageStart),bytes:Buffer.byteLength(JSON.stringify(bounded)),hasMore:bounded.hasMore,includesCompletionCheck:true};
   const traverseStart=performance.now(),seen=new Set();let cursor=null,pages=0,last=null,maxResponse=0,review=0,audit=0;
   do{const page=await queryShortlist(c,run,{direction,focusId,limit:100,cursor});pages++;maxResponse=Math.max(maxResponse,Buffer.byteLength(JSON.stringify(page)));assert(page.results.length<=100,'Unbounded shortlist page');
    for(const row of page.results){const id=row[direction==='supplier'?'tenderId':'supplierId'],tier=row.shortlist.tier==='REVIEW_CANDIDATE'?1:2;assert(!seen.has(id),'Duplicate shortlist row');seen.add(id);
     if(last)assert(last.tier<tier||last.tier===tier&&last.id<id,'Unstable shortlist order');
     assert(row.formula.denominator===100&&row.retrieval.semanticSimilarity===null&&row.aiAuthorized===false&&row.onDemandEscalationEligible===true&&row.humanDisposition===null&&row.aiTors===null,'Signal boundary differs');
     assert(tier===1?row.retrieval.units>0:row.retrieval.units===0,'Tier differs from retrieval');review+=Number(tier===1);audit+=Number(tier===2);last={tier,id};
    }cursor=page.nextCursor;
   }while(cursor);
   assert(seen.size===expected,'Incomplete focused traversal');report.fullTraversals[direction]={focusId,rows:seen.size,pages,review,audit,maxResponseBytes:maxResponse,elapsedMs:Math.round(performance.now()-traverseStart),unique:true,ordered:true};
   const spec=shortlistPageSpec(run,{direction,focusId});report.plans[direction]=(await c.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+spec.text,spec.values)).rows[0]['QUERY PLAN'];
   assert(JSON.stringify(report.plans[direction]).includes(`shortlist_pair_${direction}`),'Focused index not used');
   const empty=run.contexts.find(p=>p.kind===direction&&p.candidateCount===0);assert(empty,'Expected empty focus absent');const result=await queryShortlist(c,run,{direction,focusId:empty.id});assert(result.results.length===0&&!result.nextCursor,'Noncandidate focus shortlisted');report.emptyFocuses[direction]={id:empty.id,rows:0};
  }
  report.detailSamples=[];
  for(const sample of comparison.selectedSamples){const detail=await selectedShortlistDetail(c,run,sample.input);assert(sha(detail.shortlist)===sha(sample.shortlist),'Selected nomination detail differs');assert(detail.retrieval.units===sample.input.units&&detail.formula.pairScore===sample.input.score&&detail.formula.dataCoverage===sample.input.coverage&&detail.formula.evidenceConfidence===sample.input.confidence,'Selected original dimensions differ');assert(detail.criteria.reduce((n,x)=>n+x.points,0)===detail.formula.pairScore&&detail.criteria.reduce((n,x)=>n+x.maxPoints,0)===100,'Criterion sums differ');assert(detail.aiAuthorized===false,'Invented AI authorization');report.detailSamples.push({...sample,criterionParity:true});}
  const selected=new Set(run.pairs.map(p=>`${p.supplierId}:${p.tenderId}`)),omitted=loaded.pairs.find(p=>!selected.has(`${p.supplierId}:${p.tenderId}`)),detail=await selectedShortlistDetail(c,run,omitted);
  assert(detail.state==='NOT_STORED_IN_SHORTLIST'&&detail.shortlist===null&&detail.onDemandEscalationEligible&&detail.aiAuthorized===false&&detail.formula.pairScore===omitted.score&&detail.retrieval.units===omitted.units,'Omitted candidate detail boundary differs');report.omittedCandidate={supplierId:omitted.supplierId,tenderId:omitted.tenderId,state:detail.state,onDemandEscalationEligible:detail.onDemandEscalationEligible,aiAuthorized:detail.aiAuthorized,formula:detail.formula,retrieval:detail.retrieval};
  report.privileges=(await c.query(`SELECT relname,relrowsecurity,pg_get_userbyid(relowner) owner,has_table_privilege(current_user,oid,'SELECT') can_select,has_table_privilege(current_user,oid,'INSERT') can_insert,has_table_privilege(current_user,oid,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') extra FROM pg_class WHERE relnamespace='tendermatch_retrieval'::regnamespace AND relname=ANY($1::text[]) ORDER BY relname`,[TABLES])).rows;
  assert(report.privileges.length===5&&report.privileges.every(p=>p.relrowsecurity&&p.owner==='neondb_owner'&&p.can_select&&p.can_insert&&!p.extra),'Writer privileges/RLS differ');
  const migration=(await readFile(new URL('db/tendermatch-dev/090-shortlist-up.sql',root),'utf8')).replaceAll('\r\n','\n'),bodies=[...migration.matchAll(/CREATE FUNCTION tendermatch_retrieval\.([a-z_]+)\([\s\S]*?AS \$\$([\s\S]*?)\$\$;/g)].map(m=>({name:m[1],body:m[2].trim()}));
  const installed=(await c.query(`SELECT proname name,prosrc body FROM pg_proc WHERE pronamespace='tendermatch_retrieval'::regnamespace AND proname=ANY($1::text[]) ORDER BY proname`,[bodies.map(b=>b.name)])).rows;
  assert(bodies.length===7&&installed.length===7&&installed.every(p=>p.body.replaceAll('\r\n','\n').trim()===bodies.find(b=>b.name===p.name)?.body),'Installed migration function bodies differ');
  report.migrationBindings={functions:installed.map(p=>({name:p.name,bodyHash:sha(p.body.replaceAll('\r\n','\n').trim())})),exactBodies:true,marker:(await c.query("SELECT version FROM tendermatch_retrieval.schema_migration WHERE version='20260907-shortlist-stage6-v1'")).rows};assert(report.migrationBindings.marker.length===1,'Stage 6 migration marker absent');
  report.rows={};for(const table of TABLES)report.rows[table]=(await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${table}`)).rows[0].n;
  assert(report.rows.shortlist_context===17450&&report.rows.shortlist_member===17450&&report.rows.shortlist_run===1&&report.rows.shortlist_completion===1&&report.rows.shortlist_pair===28034,'Stored cardinalities differ');
  report.databaseBytes=(await c.query('SELECT pg_database_size(current_database())::text n')).rows[0].n;
  report.storage=(await c.query(`SELECT relname table_name,pg_total_relation_size(oid)::text total_bytes,pg_relation_size(oid)::text heap_bytes,pg_indexes_size(oid)::text index_bytes FROM pg_class WHERE relnamespace='tendermatch_retrieval'::regnamespace AND relname=ANY($1::text[]) ORDER BY relname`,[TABLES])).rows;
  report.protectedAfter=await protectedStage6State(c);assert(sha(before)===sha(report.protectedAfter)&&sha(before)===sha(proof.protectedBefore)&&sha(before)===sha(comparison.protectedBefore),'Protected prior-stage state differs');
  report.metrics={elapsedMs:Math.round(performance.now()-start),connection:c.metrics,memory:process.memoryUsage()};report.finishedAt=new Date().toISOString();report.sourceConnections=0;report.modelCalls=0;report.committedWrites=0;
  await c.query('ROLLBACK');await writeFile(new URL('docs/evidence/tendermatch-stage6-validation.json',root),JSON.stringify(report,null,2)+'\n');return report;
 }finally{await c.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({status:'FAILED',message:e.message?.replace(/postgres(?:ql)?:\/\/\S+/gi,'[redacted]'),code:e.code??'STAGE6_VALIDATION_FAILED'}));process.exitCode=1;});
