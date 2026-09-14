/** Independent final metadata/count readback and local validation ledger, no new calculation. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {ownerConnection,attestTarget,neonApi,functionPath,TARGET} from './lib/tendermatch-stage8-operator.mjs';
import {developmentPin} from './tendermatch-stage8.mjs';
import {bindPin,HEADER_SQL} from './lib/tendermatch-stage8-store.mjs';
import {viewDefinitions,API_SCHEMA} from './lib/tendermatch-stage8-views.mjs';
const pin=await developmentPin(),bound=bindPin(pin),target=await attestTarget(),c=await ownerConnection();
const git=(args,cwd)=>execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true}).trim();
try{
  await c.query('BEGIN READ ONLY');await c.query("SELECT set_config('tendermatch.tenant_id',$1,true),set_config('statement_timeout','5000',true)",[pin.tenantId]);
  const h=(await c.query(HEADER_SQL,[pin.tenantId,pin.planId])).rows[0];assert.equal(h.universeCount,2027961);assert.equal(h.candidateCount,707660);assert.equal(h.shortlistCount,28034);assert.equal(h.storedAutomaticRequests,500);
  const rows=(await c.query(`SELECT (SELECT count(*)::int FROM tendermatch_retrieval.escalation_plan) plans,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_decision) decisions,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_request) requests,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_authorization) grants,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_job) jobs,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_artifact) artifacts,(SELECT count(*)::int FROM tendermatch_retrieval.escalation_event) events`)).rows[0];
  assert.deepEqual(rows,{plans:1,decisions:28034,requests:500,grants:0,jobs:0,artifacts:0,events:0});
  const views=(await c.query('SELECT relname,reloptions FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind=\'v\' ORDER BY relname',[API_SCHEMA])).rows;
  assert.deepEqual(views.map(v=>v.relname),viewDefinitions(pin).map(v=>v.name).sort());assert.ok(views.every(v=>v.reloptions.includes('security_barrier=true')));
  const publicGrants=(await c.query("SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE n.nspname=$1 AND a.grantee=0",[API_SCHEMA])).rows[0].n;assert.equal(publicGrants,0);
  const source='C:/Users/Cowork 2/.codex/worktrees/8964/4_Tender AI Agents',original={head:git(['rev-parse','HEAD'],source),status:git(['status','--porcelain'],source)};assert.equal(original.head,'04b0b2a723223d11617837ee0e7562fa48168cd9');assert.equal(original.status,'');
  const remote=git(['rev-parse','origin/main']);assert.equal(remote,'d230590cf5ee99a679f162b2e3a19b65752c0f16');
  const {function:fn}=await neonApi(functionPath+'/'+TARGET.slug);assert.equal(fn.active_deployment.status,'completed');assert.equal(fn.active_deployment.id,2);
  const release=JSON.parse(await readFile('docs/evidence/tendermatch-stage8-hosted-deployment.json','utf8')),probe=JSON.parse(await readFile('docs/evidence/tendermatch-stage8-hosted-probes.json','utf8'));
  assert.equal(probe.passed,true);assert.equal(probe.codeHash,release.build.codeHash);
  for(const [name,expected] of Object.entries(release.build.sources))assert.equal(createHash('sha256').update((await readFile(name,'utf8')).replaceAll('\r\n','\n')).digest('hex'),expected,name);
  const log=await readFile('build/stage8-full-validation.log','utf8'),number=label=>Number(log.match(new RegExp('ℹ '+label+' (\\d+)'))?.[1]);assert.equal(number('fail'),0);assert.ok(number('pass')>=637);
  const evidence={schemaVersion:'tendermatch-stage8-hosted-final/1.0.0',observedAt:new Date().toISOString(),target,branch:git(['branch','--show-current']),selectedBase:'d584dd455e9b048d178099436d69b32e1cca2e2a',remote,pin:bound,rows,views:views.length,publicViewGrants:publicGrants,original,host:{url:fn.invocation_url,deploymentId:fn.active_deployment.id,codeHash:release.build.codeHash},key:{name:'TenderMatch Stage 8 dev Functions 2026-09-07',scope:'Editor single project / all project branches',projectId:TARGET.project,storage:'Windows CurrentUser DPAPI outside Git; current-user-only directory ACL'},validation:{tests:number('tests'),passed:number('pass'),failed:number('fail'),skipped:number('skipped'),skipReason:'Unrelated MF291 PDF fixture unavailable',fullLint:'PASS',productionBuilds:3,generatedAgentSpecifications:64,strictHostedContract:'PASS',strictTenderMatch:'PASS',fullAppTypeScript:{baselineErrors:24,changedSurfaceErrors:0,scope:'Unchanged TenderBalance/Logistics files'}},hostedChecks:probe.checks.length,hostedRequests:probe.requests.length,maximumPayloadBytes:probe.maximumPayloadBytes,latencyMs:probe.latencyMs,sourceWrites:0,resultRowWrites:0,modelCalls:0,gitPush:false,gitMerge:false,firebaseDeployment:false,stage9Integration:false};
  await writeFile('docs/evidence/tendermatch-stage8-hosted-final.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({verified:true,rows,views:views.length,binding:bound.bindingId,validation:evidence.validation,host:evidence.host}));
}finally{await c.query('ROLLBACK').catch(()=>{});await c.end();}
