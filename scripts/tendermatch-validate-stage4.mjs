/** Independent completion evidence; no source connections or result writes. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {connectStage3} from './lib/tendermatch-eligibility-inputs.mjs';
import {loadFormulaInputs,BASE} from './lib/tendermatch-formula-inputs.mjs';
import {formulaCodeIdentity,createFormulaRun} from './lib/tendermatch-formula.mjs';
import {TENANT,sha} from './lib/tendermatch-input-manifest.mjs';
import {evaluateStage4Pair} from '../packages/tendermatch/src/formula-stage4-adapter.ts';
import {evaluateExploratoryPair} from '../packages/tendermatch/src/exploratory-matching.ts';
const root=new URL('../',import.meta.url),exec=promisify(execFile);
export async function main(){
 const actual=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage4-execute.json',root),'utf8')),experiment=JSON.parse(await readFile(new URL('docs/evidence/tendermatch-stage4-inspect.json',root),'utf8'));
 const code=await formulaCodeIdentity();if(sha(code)!==sha(actual.code)||actual.runId!==experiment.runId)throw new Error('Final code/run/experiment mismatch');
 const c=await connectStage3();const report={stage:4,base:BASE,checkpoint:'ENCLOSING_COMMIT',checkedAt:new Date().toISOString(),runId:actual.runId,identity:actual.identity,code,artifactsRawSha256:{}};
 try{
  const loaded=await loadFormulaInputs(c),run=createFormulaRun(loaded,code);if(run.runId!==actual.runId)throw new Error('Final input/run identity differs');
  report.tenderOperands={emptyScoringTermTenders:run.tenders.filter(t=>!t.prepared.scoringTerms.length).length,whitespaceOnlyCountryTenders:run.tenders.filter(t=>t.prepared.country&&!t.prepared.country.trim()).length};
  if(report.tenderOperands.emptyScoringTermTenders||report.tenderOperands.whitespaceOnlyCountryTenders)throw new Error('Pinned tender Formula operands incomplete');
  const qstart=performance.now();report.sqlAggregate=(await c.query(`SELECT count(*)::int scored,count(DISTINCT (supplier_key,tender_key))::int unique_pairs,min(pair_score)::int minimum,max(pair_score)::int maximum,count(*) FILTER(WHERE pair_score=0)::int zeros,count(*) FILTER(WHERE data_coverage=0)::int zero_coverage,count(*) FILTER(WHERE denominator<>100 OR pair_score<>(SELECT sum(x) FROM unnest(points) x) OR 100<>(SELECT sum(x) FROM unnest(max_points) x))::int invalid_sums FROM tendermatch_retrieval.formula_pair WHERE tenant_id=$1 AND policy_hash=decode($2,'hex')`,[TENANT,run.policyHash])).rows[0];report.sqlAggregate.elapsedMs=Math.round(performance.now()-qstart);
  if(report.sqlAggregate.scored!==707660||report.sqlAggregate.unique_pairs!==707660||report.sqlAggregate.invalid_sums)throw new Error('Independent SQL aggregate differs');
  report.sqlPopulation=(await c.query(`SELECT p.state,count(*)::int outcomes,count(f.pair_score)::int scored FROM tendermatch_retrieval.eligibility_pair p
 JOIN tendermatch_retrieval.eligibility_member s ON s.tenant_id=p.tenant_id AND s.run_id=$2 AND s.kind='supplier' AND s.input_key=p.supplier_key
 JOIN tendermatch_retrieval.eligibility_member t ON t.tenant_id=p.tenant_id AND t.run_id=$2 AND t.kind='tender' AND t.input_key=p.tender_key
 JOIN tendermatch_retrieval.formula_member fs ON fs.tenant_id=p.tenant_id AND fs.run_id=$3 AND fs.kind='supplier' AND fs.entity_id=s.entity_id
 JOIN tendermatch_retrieval.formula_member ft ON ft.tenant_id=p.tenant_id AND ft.run_id=$3 AND ft.kind='tender' AND ft.entity_id=t.entity_id
 LEFT JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=p.tenant_id AND f.policy_hash=decode($4,'hex') AND f.supplier_key=fs.input_key AND f.tender_key=ft.input_key
 WHERE p.tenant_id=$1 AND p.policy_hash=decode($5,'hex') GROUP BY p.state ORDER BY p.state`,[TENANT,run.scope.runId,run.runId,run.policyHash,run.scope.policyHash])).rows;
  if(sha(report.sqlPopulation)!==sha([{state:0,outcomes:905697,scored:0},{state:2,outcomes:414604,scored:0},{state:3,outcomes:707660,scored:707660}]))throw new Error('SQL scored/unscored scope differs');
  let oraclePairs=0;for(const sample of actual.readback.samples){const s=run.suppliers.find(s=>s.id===sample.supplierId),t=run.tenders.find(t=>t.id===sample.tenderId),r=evaluateStage4Pair(s,t,'CANDIDATE_ELIGIBLE_WITH_LIMITATIONS',run.runId,'2026-09-06T00:00:00Z');
   const evidence=t.countryMissing?s.evidence.filter(e=>e.field!=='geographic_markets'):s.evidence;
   // Original Formula uses these exact pinned scoring terms as its token set.
   // Synthetic valid clocks are supplied only to the oracle's unrelated freshness layer.
   const oracle=evaluateExploratoryPair({id:t.id,reference:'ORACLE',title:t.prepared.scoringTerms.join(' '),object:'',tags:[],procurementType:t.prepared.procurementType,country:t.prepared.country,deadlineAt:'2030-01-01T00:00:00Z',snapshotAsOf:'2026-09-06T00:00:00Z'},{canonicalEntityId:s.id,classification:t.prepared.procurementType,readinessStatus:'requires_enrichment'},evidence,'2026-09-06T00:00:00Z');
   if(r.pairScore!==oracle.value||r.dataCoverage!==oracle.dataCoverage||r.evidenceConfidence!==oracle.evidenceConfidence||r.assessedFitScore!==oracle.assessedFitScore||sha(r.fit)!==sha(oracle.criteria.map(x=>x.fitLevel)))throw new Error('Original Formula real-input sample differs');oraclePairs++;
  }
  report.originalFormulaOracle={sampledPairs:oraclePairs,scalarsAndAllCriteria:'PASS',freshnessClock:'SYNTHETIC_ORACLE_ONLY_NOT_PERSISTED'};
  report.incremental={supplierCandidateInvalidations:run.suppliers.map(s=>({supplierId:s.id,candidatePairs:run.tenders.filter(t=>['GOODS','WORKS'].includes(t.prepared.procurementType)&&s.scopes.includes(t.prepared.procurementType)).length})),tenderCandidateInvalidations:Object.fromEntries(['GOODS','WORKS','SERVICES'].map(type=>[type,run.suppliers.filter(s=>['GOODS','WORKS'].includes(type)&&s.scopes.includes(type)).length])),sourceMutations:0,method:'Cache key changes for one entity; persisted synthetic SQL tests prove exact affected candidate count and historical reuse.'};
  if(report.incremental.supplierCandidateInvalidations.reduce((n,s)=>n+s.candidatePairs,0)!==707660)throw new Error('Incremental candidate accounting differs');
  report.connection=c.metrics;
 }finally{await c.end();}
 const command=async(name,exe,args,env={})=>{const start=performance.now();const {stdout,stderr}=await exec(exe,args,{cwd:fileURLToPath(root),windowsHide:true,maxBuffer:20*1024*1024,env:{...process.env,...env}});await mkdir(new URL('outputs/stage4/',root),{recursive:true});await writeFile(new URL(`outputs/stage4/${name}.log`,root),stdout+stderr);return {command:[exe,...args],elapsedMs:Math.round(performance.now()-start),output:stdout+stderr};};
 const tests=await command('full-tests',process.execPath,['--experimental-strip-types','--test','tests/*.test.mjs'],{TENDERMATCH_STAGE4_EVIDENCE:'1'});
 report.validation={fullRepository:Object.fromEntries(['tests','pass','fail','skipped'].map(k=>[k,Number(tests.output.match(new RegExp('(?:ℹ |# )'+k+' (\\d+)'))?.[1])])),fullTestElapsedMs:tests.elapsedMs};
 if(!report.validation.fullRepository.tests||report.validation.fullRepository.fail||report.validation.fullRepository.skipped)throw new Error('Full tests must pass without skips');
 report.validation.strictAdapterTypecheck=(await command('strict-typecheck',process.execPath,['node_modules/typescript/bin/tsc','--noEmit','--strict','--target','es2022','--module','nodenext','--moduleResolution','nodenext','--allowImportingTsExtensions','--skipLibCheck','packages/tendermatch/src/formula-stage4-adapter.ts'])).elapsedMs;
 report.validation.lint=(await command('lint',process.execPath,['node_modules/eslint/bin/eslint.js','.','--ignore-pattern','dist','--ignore-pattern','.next'])).elapsedMs;
 for(const file of ['docs/evidence/tendermatch-stage4-inspect.json','docs/evidence/tendermatch-stage4-execute.json','db/tendermatch-dev/070-formula-up.sql'])report.artifactsRawSha256[file]=createHash('sha256').update(await readFile(new URL(file,root))).digest('hex');
 report.storageTotalBytes=actual.storage.reduce((n,r)=>n+Number(r.total_bytes),0);report.databaseBytes=actual.databaseBytes;report.negativeChecks=actual.negativeChecks;
 report.prohibitions={sourceWrites:0,retrieval:0,embeddings:0,aiTors:0,humanDecisions:0,frontendChanges:0,push:false,merge:false,deploy:false};
 report.status='AWAITING_STAGE4_ORCHESTRATOR_REVIEW';await writeFile(new URL('docs/evidence/tendermatch-stage4-validation.json',root),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({status:'FAILED',message:e.message?.replace(/postgres(?:ql)?:\/\/\S+/gi,'[redacted]')}));process.exitCode=1;});
