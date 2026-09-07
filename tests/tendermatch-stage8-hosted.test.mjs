import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHostedFetch,hostedSessions,readonlyResult} from '../packages/tendermatch/src/hosted-stage8.ts';
import {API_PREFIX,createCursorCodec} from '../packages/tendermatch/src/service-stage8.ts';
import {bindPin,createStage8Store,REQUIRED_TABLES} from '../scripts/lib/tendermatch-stage8-store.mjs';
import {viewDefinitions,applyViewSql,rollbackViewSql,LOGIN_ROLE,API_SCHEMA} from '../scripts/lib/tendermatch-stage8-views.mjs';
import {mappedReadQuery,guardedRuntimeUrl} from '../functions/tendermatch-stage8/database.mjs';
import {rowResult,resultColumns} from '../functions/tendermatch-stage8/projection.mjs';
import {rowResult as legacyProjection,resultColumns as legacyColumns} from '../scripts/lib/tendermatch-formula.mjs';
import {initializeStage8Fixture} from './fixtures/tendermatch-stage8.mjs';
import {id} from './fixtures/tendermatch-stage6.mjs';
const hash=v=>createHash('sha256').update(v).digest('hex'),token=()=>randomBytes(32).toString('base64url');
function seed(credential,extra={}){return {tokenHash:hash(credential),subject:'local-test-owner',tenantId:'tendermatch-development-stage1',issuedAt:1000,expiresAt:3601000,...extra};}

test('hosted sessions are hash-only, expiring, restart-safe and bounded',()=>{
  const t=token();let now=2000;const s=hostedSessions([seed(t)],()=>now);
  assert.equal(s.authenticate('Bearer '+t).scopes.join(','),'read');
  assert.throws(()=>s.authenticate('Bearer '+t+', '+t),/AUTHENTICATION/);
  now=3601001;assert.throws(()=>s.authenticate('Bearer '+t),/EXPIRED/);
  const restarted=hostedSessions([seed(t)],()=>now);assert.throws(()=>restarted.authenticate('Bearer '+t),/EXPIRED/);
  assert.throws(()=>hostedSessions([seed(t,{expiresAt:86401001})]),/Invalid/);
  assert.throws(()=>hostedSessions([seed(t),seed(t)]),/Invalid/);
  now=2000;const limited=hostedSessions([seed(t)],()=>now);for(let i=0;i<120;i++)limited.authenticate('Bearer '+t);assert.throws(()=>limited.authenticate('Bearer '+t),/RATE_LIMIT/);
});

test('Fetch adapter authenticates before DB; rejects writes, unsafe origins and malformed bounds',async()=>{
  const t=token(),bad=token();let calls=0;const store={health:async()=>{calls++;return {context:{capabilities:{intentBoundaryAvailable:true}}};},page:async(p,b,q)=>{calls++;return q;},detail:async()=>{calls++;return {};}};
  const fetch=createHostedFetch({store,sessions:hostedSessions([seed(t),seed(bad,{expiresAt:1500})],()=>2000),allowedOrigins:[],codeHash:hash('code')});
  const call=(route,options={})=>fetch(new Request('https://test.invalid'+API_PREFIX+route,{headers:{Authorization:'Bearer '+t,...options.headers},...options}));
  assert.equal((await call('/health?binding='+hash('pin'),{headers:{}})).status,401);assert.equal(calls,0);
  assert.equal((await call('/health?binding='+hash('pin'),{headers:{Authorization:'Bearer '+bad}})).status,401);assert.equal(calls,0);
  assert.equal((await call('/health?binding='+hash('pin'),{headers:{Authorization:'Bearer '+t,Origin:'https://untrusted.invalid'}})).status,403);assert.equal(calls,0);
  for(const method of ['POST','PUT','PATCH','DELETE','OPTIONS','HEAD'])assert.equal((await call('/health?binding='+hash('pin'),{method})).status,405);
  for(const route of ['/intents','/jobs/'+hash('job'),'/artifacts/'+hash('artifact'),'/matrix','/export'])assert.equal((await call(route+'?binding='+hash('pin'))).status,404);
  for(const params of ['binding='+hash('pin')+'&tenantId=other','binding='+hash('pin')+'&binding='+hash('pin'),'binding=nope',''])assert.equal((await call('/health?'+params)).status,400);
  assert.equal(calls,0);
  for(const limit of ['0','101','-1','1e2','1&limit=2'])assert.equal((await call('/suppliers/'+id(1)+'/results?binding='+hash('pin')+'&limit='+limit)).status,400);
  for(const [query,n] of [['',25],['&limit=100',100]]){const r=await call('/suppliers/'+id(1)+'/results?binding='+hash('pin')+query);assert.equal(r.status,200);assert.equal((await r.json()).limit,n);}
  const health=await call('/health?binding='+hash('pin'));assert.equal(health.headers.get('cache-control'),'no-store');assert.equal(health.headers.get('access-control-allow-origin'),null);assert.equal((await health.json()).context.capabilities.intentBoundaryAvailable,false);
});

test('hosted responses sanitize obsolete action hints and never leak errors or oversize results',async()=>{
  const cleaned=readonlyResult({pair:{formula:{pairScore:0,fit:[null,0]},retrieval:{units:0,semanticSimilarity:null},aiTors:{state:'OLD'},executionAuthorization:{authorityGranted:true},humanDisposition:{value:null}}});
  assert.deepEqual(cleaned.pair.formula,{pairScore:0,fit:[null,0]});assert.equal(cleaned.pair.executionAuthorization.authorityGranted,false);assert.equal(cleaned.pair.aiTors.state,'UNAVAILABLE_READ_ONLY_HOST');
  const t=token(),sessions=hostedSessions([seed(t)],()=>2000),request=()=>new Request('https://test.invalid'+API_PREFIX+'/health?binding='+hash('pin'),{headers:{Authorization:'Bearer '+t}});
  for(const health of [async()=>{throw new Error('postgresql://secret@private');},async()=>({large:'x'.repeat(524289)})]){
    const fetch=createHostedFetch({store:{health},sessions,allowedOrigins:[],codeHash:hash('code')});const r=await fetch(request());assert.equal(r.status,503);assert.ok(!(await r.text()).includes('secret'));
  }
  let finish;const fetch=createHostedFetch({store:{health:()=>new Promise(resolve=>{finish=resolve;})},sessions,allowedOrigins:[],codeHash:hash('code')});const a=fetch(request());const completeA=finish;const b=fetch(request());const completeB=finish;assert.equal((await fetch(request())).status,503);completeA({});completeB({});assert.equal((await a).status,200);assert.equal((await b).status,200);
});

test('runtime URL and SQL are read-only; hosted Stage 4 projection equals frozen helper',()=>{
  const base='postgresql://'+LOGIN_ROLE+':local-test@ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech/tendermatch_results_dev?sslmode=verify-full&channel_binding=require';assert.equal(guardedRuntimeUrl(base),base);
  for(const wrong of [base.replace(LOGIN_ROLE,'neondb_owner'),base.replace('results_dev','sources'),base.replace('verify-full','require'),base+'&options=-cunsafe'])assert.throws(()=>guardedRuntimeUrl(wrong),/runtime URL/);
  for(const q of ['INSERT INTO x VALUES(1)','BEGIN','COMMIT','SELECT 1; DELETE FROM x','COPY x TO STDOUT'])assert.throws(()=>mappedReadQuery(q),/Read-only/);
  assert.equal(mappedReadQuery('SELECT * FROM tendermatch_retrieval.ranking_pair').text,'SELECT * FROM '+API_SCHEMA+'.ranking_pair');
  assert.deepEqual(mappedReadQuery('SELECT to_regclass($1)',['tendermatch_retrieval.']).values,[API_SCHEMA+'.']);
  assert.equal(resultColumns,legacyColumns);for(const score of [0,20,100]){const row=Object.fromEntries(resultColumns.split(',').map((k,i)=>[k,k==='pair_score'?score:i]));assert.deepEqual(rowResult(row),legacyProjection(row));}
});

test('actual PostgreSQL pinned views preserve sealed reads and deny base tables, writes and other tenants',{skip:!process.env.TENDERMATCH_PGLITE_ROOT},async()=>{
  const {PGlite}=await import(pathToFileURL(path.join(process.env.TENDERMATCH_PGLITE_ROOT,'@electric-sql/pglite/dist/index.js')).href),db=new PGlite();
  const c={query:async(q,v)=>{const r=await db.query(q,v);return {...r,rowCount:r.affectedRows??r.rows.length};},end:async()=>{}};
  try{
    const f=await initializeStage8Fixture(db,c);const pin=f.pin,binding=bindPin(pin).bindingId;
    await db.exec('RESET ROLE');const database=(await db.query('SELECT current_database() db')).rows[0].db;
    await db.exec(applyViewSql(pin).replaceAll('DATABASE tendermatch_results_dev','DATABASE "'+database+'"'));
    assert.equal(viewDefinitions(pin).length,REQUIRED_TABLES.length);
    await db.exec('SET ROLE '+LOGIN_ROLE);await db.query("SELECT set_config('tendermatch.tenant_id',$1,false)",[pin.tenantId]);
    const connect=async()=>({query:(q,v)=>{const mapped=mappedReadQuery(q,v);return db.query(mapped.text,mapped.values);},end:async()=>{}});
    let now=2000;const cursors=createCursorCodec(randomBytes(32),()=>now),store=createStage8Store({connect,pins:[pin],cursors,connectionLimit:1}),principal={tenantId:pin.tenantId};
    const h=await store.health(principal,binding);assert.equal(h.state,'AVAILABLE_SEALED_BOUNDARY');assert.equal(h.context.population.universe,f.header.universeCount);
    const page=await store.page(principal,binding,{direction:'supplier',focusId:id(1),limit:1});assert.equal(page.results.length,1);assert.ok(page.nextCursor);
    const next=await store.page(principal,binding,{direction:'supplier',focusId:id(1),limit:1,cursor:page.nextCursor});assert.notEqual(next.results[0].tenderId,page.results[0].tenderId);
    await assert.rejects(()=>store.page(principal,binding,{direction:'supplier',focusId:id(2),limit:1,cursor:page.nextCursor}),/SCOPE/);
    now+=900001;await assert.rejects(()=>store.page(principal,binding,{direction:'supplier',focusId:id(1),limit:1,cursor:page.nextCursor}),/EXPIRY/);
    const detail=await store.detail(principal,binding,page.results[0].supplierId,page.results[0].tenderId);assert.ok(detail.pair.criteria.some(c=>c.fit===null&&c.state==='MISSING'));assert.equal(detail.pair.formula.denominator,100);
    const outside=await store.detail(principal,binding,id(1),id(22));assert.equal(outside.pair.formula.pairScore,null);
    // Every original fixture pair: indexed hosted rewrite and redacted evidence
    // projection must produce the exact existing service result, not an approximation.
    const original=createStage8Store({connect:async()=>c,pins:[pin],cursors,connectionLimit:1});
    for(const supplier of [1,2,3,4])for(const tender of [20,21,22,23,24,25,26]){
      const hosted=await store.detail(principal,binding,id(supplier),id(tender));
      await db.exec('SET ROLE tendermatch_result_writer');const legacy=await original.detail(principal,binding,id(supplier),id(tender));await db.exec('SET ROLE '+LOGIN_ROLE);
      assert.deepEqual(hosted,legacy,`selected pair ${supplier}/${tender} unchanged`);
    }
    await assert.rejects(()=>store.health(principal,hash('wrong')),/PINNED/);await assert.rejects(()=>store.health({tenantId:'wrong-tenant'},binding),/TENANT/);
    for(const sql of ['SELECT * FROM tendermatch_retrieval.formula_pair LIMIT 1','SELECT * FROM tendermatch_retrieval.formula_input LIMIT 1','INSERT INTO '+API_SCHEMA+'.schema_migration VALUES (\'no\')','CREATE ROLE stage8_forbidden','CREATE DATABASE stage8_forbidden'])await assert.rejects(()=>db.query(sql));
    await db.query("SELECT set_config('tendermatch.tenant_id','wrong-tenant',false)");assert.equal((await db.query('SELECT count(*)::int n FROM '+API_SCHEMA+'.ranking_member')).rows[0].n,0);
    await db.exec('RESET ROLE');await db.exec(rollbackViewSql().replaceAll('DATABASE tendermatch_results_dev','DATABASE "'+database+'"'));assert.equal((await db.query("SELECT count(*)::int n FROM pg_roles WHERE rolname=$1",[LOGIN_ROLE])).rows[0].n,0);
  }finally{await db.close();}
});

test('retained hosted evidence binds the exact bundle, restricted role and sealed Round 1',{skip:process.env.TENDERMATCH_HOSTED_EVIDENCE!=='1'},async()=>{
  const root=new URL('../',import.meta.url),load=async f=>JSON.parse(await readFile(new URL('docs/evidence/'+f,root),'utf8'));
  const [release,probe,db]=await Promise.all(['tendermatch-stage8-hosted-deployment.json','tendermatch-stage8-hosted-probes.json','tendermatch-stage8-hosted-db.json'].map(load));
  for(const [name,expected] of Object.entries(release.build.sources))assert.equal(hash((await readFile(new URL(name,root),'utf8')).replaceAll('\r\n','\n')),expected,name);
  assert.equal(probe.passed,true);assert.equal(probe.codeHash,release.build.codeHash);assert.equal(probe.deployment.status,'completed');assert.equal(probe.bindingId,'26e1bab78a38d8d520d59563e702bc4540405213f39cbb7b40a49ecbb03a4080');
  assert.equal(probe.readRole,LOGIN_ROLE);assert.equal(probe.injectedOwnerUrlsOverridden,true);assert.equal(probe.resultWrites,0);assert.equal(probe.modelCalls,0);assert.equal(probe.sourceWrites,0);assert.equal(db.checks.length,25);
  assert.deepEqual(db.population,{universe:2027961,candidates:707660,unscored:1320301,shortlist:28034});assert.ok(probe.maximumPayloadBytes<=524288);
  for(const name of ['unauthenticated','expired session','wrong server tenant','wrong pin','maximum101 denied','forged cursor','cross-focus cursor','expired signed cursor','intents disabled','jobs disabled','artifacts disabled'])assert.ok(probe.requests.find(r=>r.name===name&&r.status>=400),name);
});

test('hosted entry has no injected owner credentials, public auth issuer, model or frontend wiring',async()=>{
  const entry=await readFile(new URL('../functions/tendermatch-stage8/index.mjs',import.meta.url),'utf8');
  assert.match(entry,/TENDERMATCH_STAGE8_READ_URL/);assert.doesNotMatch(entry,/createReadPool\(process\.env\.DATABASE_URL|NEON_AI_GATEWAY|TENDERMATCH_RESULT_DATABASE_URL/);assert.match(entry,/allowedOrigins:\[\]/);
  assert.match(entry,/process\.env\.DATABASE_URL!==process\.env\.TENDERMATCH_STAGE8_READ_URL/);
});
