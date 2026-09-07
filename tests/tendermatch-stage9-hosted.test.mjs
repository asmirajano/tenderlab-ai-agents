import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {STAGE9_BROWSER as c} from '../packages/tendermatch/src/stage9-browser-contract.ts';
import {createHostedFetch,hostedSessions} from '../packages/tendermatch/src/hosted-stage8.ts';
import {createAllToAllClient,validateDevelopmentSession,ALL_TO_ALL_PREFIX as prefix} from '../apps/tender-apps/src/tendermatch-all-to-all-api.ts';
const hash=v=>createHash('sha256').update(v).digest('hex'),credential=()=>randomBytes(32).toString('base64url');
const id='10000000-0000-4000-8000-000000000001';
function browserSession(){return {schemaVersion:'tendermatch-browser-session/1.0.0',sourceMode:'hosted-development-stage8',bindingId:c.bindingId,token:credential(),csrfToken:credential(),subject:'stage9-reader',scopes:['read'],expiresAt:Date.now()+600000,initialSupplierId:id,initialTenderId:id,hosted:{apiOrigin:c.apiOrigin,browserOrigin:c.origin,audience:c.audience,codeHash:hash('code'),readOnly:true}};}
const seed=s=>({tokenHash:hash(s.token),subject:s.subject,tenantId:'tendermatch-development-stage1',issuedAt:Date.now()-1000,expiresAt:s.expiresAt,browserAudience:c.audience,browserOrigin:c.origin});
test('browser session requires exact audience/origin, expires fail closed and never grants write scopes',()=>{
  const s=browserSession(),seeds=[seed(s)];let now=Date.now();const auth=hostedSessions(seeds,()=>now);
  assert.deepEqual(auth.authenticate('Bearer '+s.token,c.origin,c.audience).scopes,['read']);
  for(const [origin,audience] of [[null,null],[c.origin,null],[null,c.audience],['http://localhost:4189',c.audience],[c.origin,'other']])assert.throws(()=>auth.authenticate('Bearer '+s.token,origin,audience),/AUDIENCE/);
  now=s.expiresAt;assert.throws(()=>auth.authenticate('Bearer '+s.token,c.origin,c.audience),/EXPIRED/);assert.throws(()=>hostedSessions(seeds,()=>now).authenticate('Bearer '+s.token,c.origin,c.audience),/EXPIRED/);
  assert.throws(()=>hostedSessions([{...seeds[0],expiresAt:seeds[0].issuedAt+c.sessionMs+1}]),/audience/);
});
test('CORS preflight is GET-only exact-origin/header/route, never authenticates or reads the database',async()=>{
  const s=browserSession();let reads=0;
  const f=createHostedFetch({sessions:hostedSessions([seed(s)]),allowedOrigins:[c.origin],codeHash:s.hosted.codeHash,store:{health:async()=>{reads++;return {};},page:async()=>{reads++;},detail:async()=>{reads++;}}});
  const call=(headers={},path='/health',method='OPTIONS')=>f(new Request(c.apiOrigin+prefix+path+'?binding='+c.bindingId,{method,headers:{Origin:c.origin,'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization,x-tendermatch-audience',...headers}}));
  const r=await call();assert.equal(r.status,204);assert.equal(r.headers.get('access-control-allow-origin'),c.origin);assert.equal(r.headers.get('access-control-allow-methods'),'GET');assert.equal(r.headers.get('access-control-allow-credentials'),null);assert.equal(await r.text(),'');
  for(const headers of [{Origin:'https://tenderapps-ai.web.app'},{Origin:'null'},{'Access-Control-Request-Method':'POST'},{'Access-Control-Request-Headers':'authorization,x-csrf-token'},{'Access-Control-Request-Headers':'authorization'}])assert.equal((await call(headers)).status,403);
  assert.equal((await call({},'/intents')).status,403);assert.equal(reads,0);
  const headers={Authorization:'Bearer '+s.token,'X-TenderMatch-Audience':c.audience};assert.equal((await call(headers,'/health','GET')).status,200);assert.equal(reads,1);
  assert.equal((await call(headers,'/intents','POST')).status,405);assert.equal(reads,1);
});
test('hosted bootstrap rejects origin injection, wider scopes, stale binding and unbounded sessions',()=>{
  const s=browserSession();assert.ok(validateDevelopmentSession(s).hosted);
  for(const change of [{bindingId:hash('wrong')},{scopes:['read','request-review']},{expiresAt:Date.now()+c.sessionMs+10000},{hosted:{...s.hosted,apiOrigin:'https://attacker.invalid'}},{hosted:{...s.hosted,browserOrigin:'http://localhost:4189'}},{hosted:{...s.hosted,audience:'other'}},{hosted:undefined}])assert.throws(()=>validateDevelopmentSession({...s,...change}),/SESSION/);
});
test('hosted transport pins live code and capabilities, refuses writes before network and sends no CSRF',async()=>{
  const s=browserSession(),calls=[];
  const context={version:'tendermatch-sealed-service/1.0.0',bindingId:c.bindingId,planId:hash('p'),formulaRunId:hash('f'),rankingRunId:hash('r'),shortlistRunId:hash('s'),eligibilityRunId:hash('e'),population:{universe:2027961,candidates:707660,unscored:1320301,shortlist:28034},capabilities:{provider:'UNCONFIGURED',readOnly:true,intentBoundaryAvailable:false,aiRoutesAvailable:false,executionAuthority:false,automaticMatchDecision:false}};
  const body={context,state:'AVAILABLE_SEALED_BOUNDARY',modelCalls:0,host:{codeHash:s.hosted.codeHash,readOnly:true,modelCalls:0,legacyFallback:false}};
  let now=Date.now();const client=createAllToAllClient(s,async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json','X-TenderMatch-Code':s.hosted.codeHash}});},8000,()=>now);
  assert.deepEqual((await client.health()).population,context.population);assert.equal(calls.length,1);
  assert.ok(calls[0].url.startsWith(c.apiOrigin+prefix));assert.ok(!calls[0].url.includes(s.token));assert.equal(calls[0].options.headers['X-CSRF-Token'],undefined);assert.equal(calls[0].options.headers['X-TenderMatch-Audience'],c.audience);assert.equal(calls[0].options.credentials,'omit');
  await assert.rejects(()=>client.intent({supplierId:id,tenderId:id,kind:'USER_REVIEW',justification:'Blocked development write'}),/READ_ONLY/);await assert.rejects(()=>client.status(hash('request')),/READ_ONLY/);assert.equal(calls.length,1);
  now=s.expiresAt;await assert.rejects(()=>client.health(),/EXPIRED/);assert.equal(calls.length,1);
  now=Date.now();const expiresInFlight=createAllToAllClient(s,async()=>{now=s.expiresAt;return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json','X-TenderMatch-Code':s.hosted.codeHash}});},8000,()=>now);await assert.rejects(()=>expiresInFlight.health(),/EXPIRED/);
  assert.equal(client.observations().requestCount,1);assert.equal(client.observations().recent.length,1);assert.ok(!JSON.stringify(client.observations()).includes(s.token));assert.ok(!JSON.stringify(client.observations()).includes(c.bindingId));
  const wrong=createAllToAllClient(s,async()=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json','X-TenderMatch-Code':hash('wrong')}}));await assert.rejects(()=>wrong.health(),/HOST_IDENTITY/);
  body.context.capabilities.intentBoundaryAvailable=true;const broader=createAllToAllClient(s,async()=>new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json','X-TenderMatch-Code':s.hosted.codeHash}}));await assert.rejects(()=>broader.health(),/INVALID_VERSIONED/);
});
test('Stage 9 preserves Stage 8 restricted query/view/role/cursor sources and production UI',async()=>{
  const paths=['functions/tendermatch-stage8/database.mjs','functions/tendermatch-stage8/queries.mjs','functions/tendermatch-stage8/projection.mjs','scripts/lib/tendermatch-stage8-store.mjs','scripts/lib/tendermatch-stage8-views.mjs','packages/tendermatch/src/service-stage8.ts','db/tendermatch-dev/110-stage8-reader-up.sql','db/tendermatch-dev/110-stage8-reader-down.sql','apps/tender-apps/src/main.tsx','apps/tender-apps/src/tendermatch-app.tsx','apps/tender-apps/src/tendermatch.css','apps/tender-apps/src/tendermatch-formula-view.tsx','firebase.json','.firebaserc'];
  for(const file of paths){const original=execFileSync('git',['show','f99c942:'+file],{encoding:'utf8',windowsHide:true}),current=await readFile(file,'utf8');assert.equal(current.replaceAll('\r\n','\n'),original.replaceAll('\r\n','\n'),file);}
});
test('hosted Stage 9 evidence binds current sources, live/API/browser observations and unchanged sealed counts',{skip:process.env.TENDERMATCH_STAGE9_HOSTED_EVIDENCE!=='1'},async()=>{
  const load=async n=>JSON.parse(await readFile('docs/evidence/tendermatch-stage9-hosted-'+n+'.json','utf8'));
  const [checkpoint,api,browser]=await Promise.all(['checkpoint','api','browser'].map(load));
  for(const [file,expected] of Object.entries(checkpoint.sources))assert.equal(hash((await readFile(file,'utf8')).replaceAll('\r\n','\n')),expected,file);
  assert.equal(api.passed,true);assert.equal(checkpoint.host.codeHash,api.codeHash);assert.equal(browser.codeHash,api.codeHash);assert.equal(api.bindingId,c.bindingId);assert.equal(browser.bindingId,c.bindingId);
  assert.deepEqual(checkpoint.rows,{plans:1,decisions:28034,requests:500,grants:0,jobs:0,artifacts:0,events:0});assert.equal(checkpoint.views,24);assert.equal(checkpoint.role.rolconnlimit,3);
  assert.ok(browser.checks.every(x=>x.passed));assert.ok(browser.viewports.length>=5);assert.ok(browser.viewports.every(v=>v.pageOverflow===0&&v.minimumButtonHeight>=44&&v.rows<=25));
  assert.equal(browser.fullMatrixDownloaded,false);assert.equal(browser.legacyFallback,false);assert.equal(browser.modelCalls+browser.sourceWrites+browser.resultWrites+browser.humanDispositionWrites,0);
  assert.ok(browser.performanceSample.maxDecodedApiBytes<=524288);assert.ok(api.maxPayloadBytes<=524288);
  for(const name of ['exact read preflight','write preflight denied','expired browser session','wrong server tenant','wrong audience','wrong origin','wrong binding','cross-direction cursor','expired signed cursor','intent write disabled','human write disabled','AI route absent','whole matrix absent'])assert.ok(api.requests.find(r=>r.name===name),name);
});
