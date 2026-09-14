/** Stage 2 CLI. No frontend, scoring, ranking, provider or source writes. */
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import pg from 'pg';
import {authority,secret} from './tendermatch-input-manifest.mjs';
import {DEV_TARGET as T,guardUrl,assertRestrictedRole,RESULT_TABLES,expectDenied} from './lib/tendermatch-dev-contract.mjs';
import {guardTenderUrl,TENDER,TENANT,register,sha} from './lib/tendermatch-input-manifest.mjs';
import {NORMALIZATION_VERSION,normalizerCodeIdentity,captureFeatureSource,reconcileSourceCapture,loadRegistered,prepareFeatures,normalizationIdentity,persistNormalization,readbackNormalization} from './lib/tendermatch-normalization.mjs';
const root=new URL('../',import.meta.url);
const tally=items=>{const r={};for(const x of items)r[x]=(r[x]??0)+1;return r;};
async function connect(url,database,role){const c=new pg.Client({connectionString:url.href,connectionTimeoutMillis:15000,query_timeout:35000,enableChannelBinding:true});c.on('error',()=>{});const original=c.query.bind(c);c.stage2Metrics={database,role,queries:0,responseJsonBytes:0,maxResponseJsonBytes:0};c.query=async(...args)=>{c.stage2Metrics.queries++;const r=await original(...args);const bytes=Buffer.byteLength(JSON.stringify(r.rows??[]));c.stage2Metrics.responseJsonBytes+=bytes;c.stage2Metrics.maxResponseJsonBytes=Math.max(c.stage2Metrics.maxResponseJsonBytes,bytes);return r;};try{await c.connect();const [r]=(await c.query('SELECT current_database() db,current_user role')).rows;if(r.db!==database||r.role!==role)throw new Error('Connected target mismatch');return c;}catch{await c.end().catch(()=>{});throw new Error('Connection failed (details suppressed)');}}
export async function migrateNormalization(c){await c.query('BEGIN');try{await c.query("SELECT set_config('tendermatch.approved_branch_id',$1,true)",[T.branchId]);const sql=await readFile(new URL('db/tendermatch-dev/050-normalization-up.sql',root),'utf8');await c.query(sql);await c.query('COMMIT');return {version:'20260906-normalization-v1',sqlHash:sha(sql),sourceWrites:0,credentialChanges:0};}catch(e){await c.query('ROLLBACK');throw e;}}
async function forbiddenState(c){const counts={};for(const table of RESULT_TABLES.filter(t=>!['normalized_feature','schema_migration'].includes(t))){counts[table]=(await c.query(`SELECT count(*)::int count FROM tendermatch_retrieval.${table}`)).rows[0].count;}if(Object.values(counts).some(n=>n!==0))throw new Error('Stage 2 refuses active scoring/retrieval/model state');return counts;}
async function negativeChecks(c,snapshot){
 await assertRestrictedRole(c,T.writerLogin,T.writerRole,true);await assertRestrictedRole(c,T.writerRole,null,false);
 for(const table of ['normalized_feature','normalization_snapshot','normalization_member']){
  const [p]=(await c.query("SELECT has_table_privilege(current_user,$1,'SELECT') s,has_table_privilege(current_user,$1,'INSERT') i,has_table_privilege(current_user,$1,'UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') extra",[`tendermatch_retrieval.${table}`])).rows;
  if(!p.s||!p.i||p.extra)throw new Error('Unexpected normalization grants');
  await expectDenied(c,`UPDATE tendermatch_retrieval.${table} SET tenant_id=tenant_id WHERE false`);
  await expectDenied(c,`DELETE FROM tendermatch_retrieval.${table} WHERE false`);
  await expectDenied(c,`TRUNCATE tendermatch_retrieval.${table}`);
 }
 await expectDenied(c,'CREATE TABLE tendermatch_retrieval.stage2_forbidden(id int)');
 await c.query('BEGIN');try{
  await c.query("SELECT set_config('tendermatch.tenant_id','stage2-other-tenant-probe',true)");
  for(const table of ['normalized_feature','normalization_snapshot','normalization_member'])if((await c.query(`SELECT count(*)::int n FROM tendermatch_retrieval.${table}`)).rows[0].n)throw new Error('Tenant read isolation failed');
  let code;try{await c.query('INSERT INTO tendermatch_retrieval.normalization_snapshot(tenant_id,normalization_id,manifest_id,identity,supplier_count,tender_count) VALUES($1,$2,$3,$4,0,0)',[TENANT,'f'.repeat(64),snapshot.identity.manifestId,'{}']);}catch(e){code=e.code;}if(code!=='42501')throw new Error('Tenant write isolation failed');
 }finally{await c.query('ROLLBACK');}
 await c.query('BEGIN');try{
  await c.query("SELECT set_config('tendermatch.tenant_id',$1,true)",[TENANT]);let code;
  try{await c.query('INSERT INTO tendermatch_retrieval.normalization_member SELECT * FROM tendermatch_retrieval.normalization_member WHERE tenant_id=$1 AND normalization_id=$2 LIMIT 1',[TENANT,snapshot.normalizationId]);}catch(e){code=e.code;}if(code!=='P0001')throw new Error('Normalization seal failed');
 }finally{await c.query('ROLLBACK');}
 return {roles:'restricted/no ownership',writer:'SELECT/INSERT only',updateDeleteTruncateDdl:'denied',crossTenantRead:'zero',crossTenantWrite:'denied',lateAssociationInsert:'denied',probeRowsCommitted:0,boundary:'trusted-service tenant GUC, not authentication'};
}
export async function main(args=process.argv.slice(2),env=process.env){const action=args[0]??'plan';const connections=[];const started=performance.now(),startedAt=new Date().toISOString();try{
 if(action==='plan')return {version:NORMALIZATION_VERSION,connects:false,actions:['inspect','execute','migrate'],target:{project:T.projectId,branch:T.branchId,database:T.resultDatabase},scoring:'NOT RUN'};
 if(!['inspect','execute','migrate'].includes(action))throw new Error('Unknown Stage 2 action');authority(args,env);
 if(action==='migrate'){const c=await connect(guardUrl(env.TENDERMATCH_RESULTS_OWNER_URL,'results'),T.resultDatabase,T.owner);connections.push(c);return await migrateNormalization(c);}
 const c=await connect(guardUrl(await secret(new URL(T.writerSecretFile,root),T.writerVariable),'results',T.writerLogin),T.resultDatabase,T.writerLogin);connections.push(c);
 await assertRestrictedRole(c,T.writerLogin,T.writerRole,true);await c.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[TENANT]);
 const manifestId=env.TENDERMATCH_INPUT_MANIFEST_ID;const registered=await loadRegistered(c,manifestId);
 const before=await forbiddenState(c);
 const s=await connect(guardUrl(await secret(new URL(T.consumerSecretFile,root),T.consumerVariable),'source',T.consumerLogin),T.sourceDatabase,T.consumerLogin);connections.push(s);
 await assertRestrictedRole(s,T.consumerLogin,T.readerRole,true);
 const supplier=await captureFeatureSource(s,'supplier');
 const t=await connect(guardTenderUrl(await secret(env.TENDERMATCH_TENDER_ENV_FILE,'TENDERMATCH_NEON_DATABASE_URL')),TENDER.database,TENDER.role);connections.push(t);
 const tender=await captureFeatureSource(t,'tender');
 const captured=reconcileSourceCapture(supplier,tender,registered);
 const report={version:NORMALIZATION_VERSION,action,startedAt,priorManifestId:manifestId,manifestId:captured.fresh.manifestId,sourceUnchanged:captured.unchanged,
  sourceObservations:captured.fresh.observations,sourceMetrics:{supplier:supplier.metrics,tender:tender.metrics},sourceWrites:0,scoring:'NOT RUN',eligibility:'NOT RUN',retrieval:'NOT RUN',embeddings:'NOT RUN',ai:'NOT RUN',frontendChanged:false,businessBefore:before};
 if(!captured.unchanged){if(action==='inspect')throw new Error('SOURCE_DRIFT_REQUIRES_COMPLETE_STAGE1_REGISTRATION');report.freshBoundary=await register(c,captured.fresh);}
 const code=await normalizerCodeIdentity();report.code=code;report.baseCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 const prepared=await prepareFeatures(c,captured.source,code.hash);report.preparation=prepared.metrics;
 const features=prepared.features,snapshot=normalizationIdentity(report.manifestId,code.hash,features);report.normalizationId=snapshot.normalizationId;report.identity=snapshot.identity;
 report.coverage={total:features.length,byKind:tally(features.map(f=>f.kind)),byState:tally(features.map(f=>f.normalization.status)),supplierClassification:tally(features.filter(f=>f.kind==='supplier').map(f=>f.procurementType??'MISSING')),tenderScope:tally(features.filter(f=>f.kind==='tender').map(f=>f.procurementType)),reasons:tally(features.flatMap(f=>f.normalization.reasons))};
 const claims=features.flatMap(f=>f.claims??[]),quantities=features.flatMap(f=>f.quantities??[]);
 report.claims={total:claims.length,byField:tally(claims.map(c=>c.field)),status:tally(claims.map(c=>c.sourceStatus)),valueClass:tally(claims.map(c=>c.valueClass)),missing:claims.filter(c=>c.value===null).length,unavailableArtifacts:claims.filter(c=>!c.artifactAvailable).length};
 report.quantities={total:quantities.length,typed:quantities.filter(q=>q.valueClass==='SOURCE').length,missing:quantities.filter(q=>q.valueClass==='MISSING').length,reasons:tally(quantities.flatMap(q=>q.reasons))};
 report.artifact={featureBytes:features.reduce((n,f)=>n+Buffer.byteLength(JSON.stringify(f)),0),maxFeatureBytes:Math.max(...features.map(f=>Buffer.byteLength(JSON.stringify(f)))),rawBodiesArchived:0,contactsProjected:0};
 if(action==='execute'){
  report.persistence=await persistNormalization(c,snapshot,features);
  const replay=await prepareFeatures(c,captured.source,code.hash);report.reuse=replay.metrics;
  if(replay.metrics.normalized!==0||replay.metrics.reused!==features.length)throw new Error('Unchanged input reuse failed');
  report.idempotency=await persistNormalization(c,snapshot,replay.features);
  if(report.idempotency.insertedFeatures||report.idempotency.insertedOutcomes||report.idempotency.insertedSnapshots)throw new Error('Idempotent persistence failed');
  report.independentReadback=await readbackNormalization(c,snapshot,features);
  report.negativeChecks=await negativeChecks(c,snapshot);
  report.storage=(await c.query("SELECT relname table_name,pg_total_relation_size(c.oid)::text total_bytes,pg_relation_size(c.oid)::text heap_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tendermatch_retrieval' AND relname IN ('normalized_feature','normalization_snapshot','normalization_member') ORDER BY relname")).rows;
 }
 report.businessAfter=await forbiddenState(c);report.durationMs=Math.round(performance.now()-started);report.memory=process.memoryUsage();report.connectionMetrics=connections.map(c=>c.stage2Metrics);report.executedFiles={};for(const file of ['scripts/tendermatch-normalize-inputs.mjs','db/tendermatch-dev/050-normalization-up.sql'])report.executedFiles[file]=sha(await readFile(new URL(file,root),'utf8'));report.finishedAt=new Date().toISOString();report.status=action==='execute'?'PERSISTED_READBACK_VERIFIED':'ISOLATED_READ_ONLY_EXPERIMENT';
 if(env.TENDERMATCH_STAGE2_REPORT){const target=new URL(env.TENDERMATCH_STAGE2_REPORT,root);if(!target.href.startsWith(new URL('docs/evidence/',root).href)||!target.pathname.endsWith('.json'))throw new Error('Report destination outside evidence directory');await writeFile(target,JSON.stringify(report,null,2)+'\n');}
 return report;
 }finally{for(const c of connections)await c.end().catch(()=>{});delete env.TENDERMATCH_RESULTS_OWNER_URL;}}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(JSON.stringify({status:'FAILED',code:/^[A-Z0-9]{5}$/.test(e.code??'')?e.code:'STAGE2_FAILED',reason:e.message?.startsWith('SOURCE_DRIFT')?e.message:'Credential-bearing errors suppressed; no automatic retries or scope changes.'}));process.exitCode=1;});
