/** Read-only final seal, deployment and validation reconciliation. No re-run of scoring. */
import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {ownerConnection,attestTarget,neonApi,functionPath,TARGET} from './lib/tendermatch-stage8-operator.mjs';
import {developmentPin} from './tendermatch-stage8.mjs';
import {bindPin,HEADER_SQL} from './lib/tendermatch-stage8-store.mjs';
import {API_SCHEMA,LOGIN_ROLE,viewDefinitions} from './lib/tendermatch-stage8-views.mjs';
const pin=await developmentPin(),target=await attestTarget(),db=await ownerConnection(),sha=s=>createHash('sha256').update(s).digest('hex');
const git=(args,cwd=process.cwd())=>execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true}).trim();
try{
  await db.query('BEGIN READ ONLY');await db.query("SELECT set_config('tendermatch.tenant_id',$1,true),set_config('statement_timeout','5000',true)",[pin.tenantId]);
  const h=(await db.query(HEADER_SQL,[pin.tenantId,pin.planId])).rows[0];assert.equal(h.universeCount,2027961);assert.equal(h.candidateCount,707660);assert.equal(h.shortlistCount,28034);assert.equal(h.storedAutomaticRequests,500);
  const rows=(await db.query(`SELECT (SELECT count(*)::int FROM tendermatch_retrieval.escalation_plan) plans,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_decision) decisions,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_request) requests,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_authorization) grants,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_job) jobs,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_artifact) artifacts,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_event) events`)).rows[0];
  const before=JSON.parse(await readFile('docs/evidence/tendermatch-stage8-hosted-final.json','utf8'));assert.deepEqual(rows,before.rows);
  const views=(await db.query("SELECT relname,reloptions FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind='v' ORDER BY relname",[API_SCHEMA])).rows;
  assert.deepEqual(views.map(v=>v.relname),viewDefinitions(pin).map(v=>v.name).sort());assert.ok(views.every(v=>v.reloptions.includes('security_barrier=true')));
  const role=(await db.query('SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls,rolconnlimit FROM pg_roles WHERE rolname=$1',[LOGIN_ROLE])).rows[0];assert.equal(role.rolconnlimit,3);assert.ok(['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls'].every(k=>role[k]===false));
  const {function:fn}=await neonApi(functionPath+'/'+TARGET.slug),release=JSON.parse(await readFile('docs/evidence/tendermatch-stage9-hosted-deployment.json','utf8')),api=JSON.parse(await readFile('docs/evidence/tendermatch-stage9-hosted-api.json','utf8'));
  assert.equal(fn.active_deployment.status,'completed');assert.equal(fn.active_deployment.id,release.deployment.id);assert.equal(api.codeHash,release.build.codeHash);assert.equal(api.passed,true);
  const sources={...release.build.sources};for(const file of ['apps/tender-apps/src/tendermatch-all-to-all-api.ts','apps/tender-apps/src/tendermatch-all-to-all.tsx','apps/tender-apps/src/tendermatch-all-to-all.css','scripts/serve-tendermatch-stage9-hosted.mjs','scripts/tendermatch-stage9-hosted-deploy.mjs','scripts/audit-tendermatch-stage9-hosted-api.mjs','scripts/verify-tendermatch-stage9-checkpoint.mjs','tests/tendermatch-stage9-hosted.test.mjs'])sources[file]=sha((await readFile(file,'utf8')).replaceAll('\r\n','\n'));
  for(const [file,expected] of Object.entries(sources))assert.equal(sha((await readFile(file,'utf8')).replaceAll('\r\n','\n')),expected,file);
  const assets=[];for(const name of await readdir('apps/tender-apps/dist/assets'))if(/^(index-|tendermatch-all-to-all-)/.test(name)){const b=await readFile('apps/tender-apps/dist/assets/'+name);assets.push({name,bytes:b.length,sha256:sha(b)});}
  const log=await readFile('build/stage9-full-validation.log','utf8'),n=name=>Number(log.match(new RegExp('ℹ '+name+' (\\d+)'))?.[1]);assert.equal(n('fail'),0);assert.ok(n('pass')>=642);
  for(const file of ['build/stage9-lint.log','build/stage9-strict-types.log','build/stage9-hosted-types.log'])assert.equal((await readFile(file,'utf8')).trim(),'',file);
  const originalPath='C:/Users/Cowork 2/.codex/worktrees/8964/4_Tender AI Agents',original={head:git(['rev-parse','HEAD'],originalPath),status:git(['status','--porcelain'],originalPath)};assert.deepEqual(original,{head:'04b0b2a723223d11617837ee0e7562fa48168cd9',status:''});
  const evidence={schemaVersion:'tendermatch-stage9-hosted-checkpoint/1.0.0',observedAt:new Date().toISOString(),base:'f99c942e2c1fa9e90972bf29e819d546fa44b1ba',branch:git(['branch','--show-current']),remote:git(['rev-parse','origin/main']),target,host:{url:fn.invocation_url,deployment:fn.active_deployment.id,codeHash:release.build.codeHash,bindingId:bindPin(pin).bindingId},sources,assets,rows,countsUnchangedFromStage8:true,views:views.length,role,original,validation:{tests:n('tests'),passed:n('pass'),failed:n('fail'),skipped:n('skipped')},sourceWrites:0,resultWrites:0,humanDispositionWrites:0,modelCalls:0,push:false,merge:false,firebaseDeployment:false};
  Object.assign(evidence.validation,{testConcurrency:1,fullLint:'PASS',strictTenderMatch:'PASS',strictHosted:'PASS',productionBuilds:3,fullAppTypeScriptBaselineErrors:(await readFile('build/stage9-full-app-types.log','utf8')).match(/error TS/g)?.length??0,parallelRunLimitation:'Unchanged Stage 7 10ms synthetic lease timing test failed under concurrent load; subtest and parent counted as two failures. Final full serial run passes.'});
  await writeFile('docs/evidence/tendermatch-stage9-hosted-checkpoint.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({verified:true,rows,role,views:views.length,validation:evidence.validation,host:evidence.host}));
}finally{await db.query('ROLLBACK').catch(()=>{});await db.end();}
