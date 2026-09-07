/** Small serial owner-only probes of the actual development Function. No credentials in evidence. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {attestTarget,neonApi,functionPath,TARGET} from './lib/tendermatch-stage8-operator.mjs';
import {loadOperatorSecret} from './lib/tendermatch-stage8-vault.mjs';
import {API_PREFIX,createCursorCodec} from '../packages/tendermatch/src/service-stage8.ts';
const target=await attestTarget(),{function:fn}=await neonApi(functionPath+'/'+TARGET.slug);
assert.equal(fn.active_deployment.status,'completed');assert.equal(fn.active_deployment.runtime,'nodejs24');
const origin=new URL(fn.invocation_url).origin;
assert.equal(origin,'https://br-polished-boat-b1qddx0m-tendermatchstage8.compute.c-5.eu-central-1.aws.neon.tech');
const v=await loadOperatorSecret('runtime-readonly-v1'),release=JSON.parse(await readFile('docs/evidence/tendermatch-stage8-hosted-deployment.json','utf8')),db=JSON.parse(await readFile('docs/evidence/tendermatch-stage8-hosted-db.json','utf8')),binding=release.bindingId,codeHash=release.build.codeHash;
const env=fn.active_deployment.environment;
// Neon returns variable names, not secret values. Successful health on the exact
// code hash below proves the runtime's fail-closed injected-URL equality check.
assert.ok(Array.isArray(env)&&['DATABASE_URL','DATABASE_URL_UNPOOLED','TENDERMATCH_STAGE8_READ_URL','TENDERMATCH_STAGE8_CODE_HASH'].every(k=>env.includes(k)),'Required runtime variable names');
const evidence={schemaVersion:'tendermatch-stage8-hosted-probes/1.0.0',observedAt:new Date().toISOString(),target,url:origin,codeHash,bindingId:binding,deployment:{id:fn.active_deployment.id,status:fn.active_deployment.status,runtime:fn.active_deployment.runtime,memoryMiB:fn.active_deployment.memory_mib},readRole:db.role.rolname,injectedOwnerUrlsOverridden:true,checks:[],requests:[],sourceWrites:0,resultWrites:0,modelCalls:0};
const check=(name,ok)=>{assert.ok(ok,name);evidence.checks.push({name,passed:true});};
async function call(name,route,expected,{session='owner',method='GET',headers={},query={}}={}){
  const u=new URL(API_PREFIX+route,origin);u.searchParams.set('binding',binding);for(const [k,val] of Object.entries(query))u.searchParams.set(k,val);
  const credentials=session?{Authorization:'Bearer '+v.sessions.find(s=>s.name===session).token}:{};
  const start=performance.now(),r=await fetch(u,{method,headers:{...credentials,...headers},signal:AbortSignal.timeout(30000)}),text=await r.text();let body;try{body=JSON.parse(text);}catch{body={error:{code:'NON_JSON_HOST_RESPONSE'}};}
  const record={name,status:r.status,ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex'),serverTiming:r.headers.get('server-timing'),errorCode:body.error?.code};evidence.requests.push(record);console.log(JSON.stringify(record));
  assert.equal(r.status,expected,name+' '+body.error?.code);assert.equal(r.headers.get('x-tendermatch-code'),codeHash,name+' exact code identity');check(name+' no-store',r.headers.get('cache-control')==='no-store');check(name+' bounded payload',record.bytes<=524288);return body;
}
try{
  await call('unauthenticated','/health',401,{session:null});await call('expired session','/health',401,{session:'expired'});await call('wrong server tenant','/health',403,{session:'wrongTenant'});
  await call('wrong pin','/health',409,{query:{binding:'0'.repeat(64)}});await call('client tenant injection','/health',400,{query:{tenantId:'other'}});await call('untrusted CORS origin','/health',403,{headers:{Origin:'https://untrusted.invalid'}});
  await call('intents disabled','/intents',405,{method:'POST'});await call('jobs disabled','/jobs/'+'0'.repeat(64),404);await call('artifacts disabled','/artifacts/'+'0'.repeat(64),404);await call('bulk matrix absent','/matrix',404);
  const health=await call('first authenticated health','/health',200);assert.deepEqual(health.context.population,db.population);check('read-only capabilities',health.context.capabilities.readOnly&&!health.context.capabilities.intentBoundaryAvailable&&!health.context.capabilities.aiRoutesAvailable);check('sealed health',health.state==='AVAILABLE_SEALED_BOUNDARY');
  const supplier='/suppliers/'+db.selected.supplierId+'/results',tender='/tenders/'+db.selected.tenderId+'/results';
  const defaults=await call('default supplier page',supplier,200);check('default25',defaults.results.length===25);
  await call('maximum101 denied',supplier,400,{query:{limit:'101'}});
  const first=await call('supplier page100',supplier,200,{query:{limit:'100'}});check('maximum100',first.results.length===100&&first.maximumPage===100&&first.hasMore);
  const second=await call('supplier continuation',supplier,200,{query:{limit:'100',cursor:first.nextCursor}});check('supplier no duplicate continuation',!second.results.some(p=>first.results.some(q=>p.supplierId===q.supplierId&&p.tenderId===q.tenderId)));
  await call('forged cursor',supplier,400,{query:{cursor:'forged'}});await call('cross-focus cursor',tender,400,{query:{cursor:first.nextCursor}});
  const scope=JSON.parse(Buffer.from(first.nextCursor.split('.')[0],'base64url').toString()).scope,expired=createCursorCodec(Buffer.from(v.cursorKey,'hex'),()=>Date.now()-901000).encode(scope,0,db.selected.tenderId);
  await call('expired signed cursor',supplier,400,{query:{cursor:expired}});
  const tenderFirst=await call('tender page100',tender,200,{query:{limit:'100'}}),tenderSecond=tenderFirst.nextCursor?await call('tender continuation',tender,200,{query:{limit:'100',cursor:tenderFirst.nextCursor}}):{results:[],hasMore:false};
  check('bounded complete representative tender traversal',!tenderSecond.hasMore&&new Set([...tenderFirst.results,...tenderSecond.results].map(p=>p.supplierId)).size===tenderFirst.results.length+tenderSecond.results.length);evidence.tenderTraversalCount=tenderFirst.results.length+tenderSecond.results.length;
  const detail=await call('scored pair detail','/pairs/'+db.selected.supplierId+'/'+db.selected.tenderId,200);check('stored score and independent lexical semantics',detail.pair.formula.state==='SCORED'&&detail.pair.formula.denominator===100&&detail.pair.retrieval.semanticSimilarity===null);check('missing fit preserved',detail.pair.criteria.some(c=>c.state==='MISSING'&&c.fit===null&&c.points===0));check('human and AI authority absent',detail.pair.humanDisposition.value===null&&!detail.pair.executionAuthorization.authorityGranted&&detail.pair.aiTors.value===null);
  const outside=await call('outside scope pair','/pairs/'+db.outside.supplierId+'/'+db.outside.tenderId,200);check('outside is unscored not zero',outside.pair.eligibility.state==='OUTSIDE_FORMULA_V1_1_SCOPE'&&outside.pair.formula.pairScore===null&&outside.pair.retrieval.units===null);
  for(let n=1;n<=3;n++)await call('repeat health '+n,'/health',200);
  evidence.passed=true;evidence.maximumPayloadBytes=Math.max(...evidence.requests.map(r=>r.bytes));const sorted=evidence.requests.filter(r=>r.status===200).map(r=>r.ms).sort((a,b)=>a-b);evidence.latencyMs={samples:sorted.length,min:sorted[0],median:sorted[Math.floor(sorted.length/2)],max:sorted.at(-1),meaning:'Small serial Windows-to-Frankfurt samples; not a load/cold-start SLA'};
  evidence.ownerSessionExpiresAt=release.ownerSessionExpiresAt;
  await writeFile('docs/evidence/tendermatch-stage8-hosted-probes.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify({passed:true,url:origin,checks:evidence.checks.length,requests:evidence.requests.length,maximumPayloadBytes:evidence.maximumPayloadBytes,latencyMs:evidence.latencyMs}));
}catch(e){evidence.passed=false;evidence.failure=e instanceof assert.AssertionError?e.message:'Hosted probe failed; details suppressed';await writeFile('docs/evidence/tendermatch-stage8-hosted-probes.json',JSON.stringify(evidence,null,2)+'\n');console.error(evidence.failure);process.exitCode=1;}
