/** Bounded, serial live dev probes. Logs/evidence never contain sessions or bodies. */
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadOperatorSecret} from './lib/tendermatch-stage8-vault.mjs';
import {attestTarget,neonApi,functionPath,TARGET} from './lib/tendermatch-stage8-operator.mjs';
import {API_PREFIX,createCursorCodec} from '../packages/tendermatch/src/service-stage8.ts';
import {STAGE9_BROWSER as c} from '../packages/tendermatch/src/stage9-browser-contract.ts';
import {createAllToAllClient} from '../apps/tender-apps/src/tendermatch-all-to-all-api.ts';
import {loadStage9Bootstrap} from './serve-tendermatch-stage9-hosted.mjs';
const target=await attestTarget(),{function:fn}=await neonApi(functionPath+'/'+TARGET.slug),bootstrap=await loadStage9Bootstrap();
assert.equal(fn.active_deployment.status,'completed');assert.equal(new URL(fn.invocation_url).origin,c.apiOrigin);
const pointer=JSON.parse(await readFile('build/tendermatch-stage9/session-pointer.json','utf8')),v=await loadOperatorSecret(pointer.vaultName),old=await loadOperatorSecret('runtime-readonly-v1');
const report={schemaVersion:'tendermatch-stage9-hosted-api/1.0.0',observedAt:new Date().toISOString(),target,deploymentId:fn.active_deployment.id,codeHash:v.codeHash,bindingId:c.bindingId,requests:[],checks:[],sourceWrites:0,resultWrites:0,humanDispositionWrites:0,modelCalls:0,wholeMatrixDownloads:0};
const check=(name,ok)=>{assert.ok(ok,name);report.checks.push({name,passed:true});};
async function call(name,route,expected,{session='browser',method='GET',headers={},query={}}={}){
  const token=session?v.sessions.find(s=>s.name===session)?.token:null;
  const u=new URL(API_PREFIX+route,c.apiOrigin);u.searchParams.set('binding',c.bindingId);for(const [k,val] of Object.entries(query))u.searchParams.set(k,val);
  const start=performance.now(),r=await fetch(u,{method,headers:{Origin:c.origin,...(token?{Authorization:'Bearer '+token,'X-TenderMatch-Audience':c.audience}:{}),...headers},signal:AbortSignal.timeout(15000)}),text=await r.text();let body;try{body=text?JSON.parse(text):{};}catch{throw new Error('Unexpected non-JSON development response');}
  const record={name,method,status:r.status,ms:Math.round(performance.now()-start),bytes:Buffer.byteLength(text),codeHash:r.headers.get('x-tendermatch-code'),errorCode:body.error?.code,sha256:createHash('sha256').update(text).digest('hex')};report.requests.push(record);
  assert.equal(r.status,expected,name+' '+body.error?.code);assert.equal(record.codeHash,v.codeHash,name+' deployed identity');assert.ok(record.bytes<=524288);
  if(headers.Origin&&headers.Origin!==c.origin)assert.equal(r.headers.get('access-control-allow-origin'),null);else assert.equal(r.headers.get('access-control-allow-origin'),c.origin);
  assert.equal(r.headers.get('access-control-allow-credentials'),null);return body;
}
await call('exact read preflight','/health',204,{session:null,method:'OPTIONS',headers:{'Access-Control-Request-Method':'GET','Access-Control-Request-Headers':'authorization,x-tendermatch-audience'}});
await call('write preflight denied','/intents',403,{session:null,method:'OPTIONS',headers:{'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,x-tendermatch-audience'}});
await call('unauthenticated','/health',401,{session:null});await call('expired browser session','/health',401,{session:'expiredBrowser'});await call('wrong server tenant','/health',403,{session:'wrongTenantBrowser'});
await call('wrong audience','/health',403,{headers:{'X-TenderMatch-Audience':'another-audience'}});await call('wrong origin','/health',403,{headers:{Origin:'https://tenderapps-ai.web.app'}});
await call('wrong binding','/health',409,{query:{binding:'0'.repeat(64)}});await call('client tenant denied','/health',400,{query:{tenantId:'other'}});
const health=await call('sealed health','/health',200);check('sealed counts unchanged',JSON.stringify(health.context.population)===JSON.stringify({universe:2027961,candidates:707660,unscored:1320301,shortlist:28034}));
const supplier='/suppliers/'+v.initialSupplierId+'/results',tender='/tenders/'+v.initialTenderId+'/results';
const first=await call('supplier25',supplier,200),next=await call('supplier continuation25',supplier,200,{query:{cursor:first.nextCursor}});
check('25-page bounds and nonduplicate continuation',first.results.length===25&&next.results.length===25&&!next.results.some(p=>first.results.some(q=>p.tenderId===q.tenderId)));
await call('maximum101 denied',supplier,400,{query:{limit:'101'}});const maximum=await call('maximum100',tender,200,{query:{limit:'100'}});check('100 upper bound',maximum.results.length<=100&&maximum.maximumPage===100);
await call('forged cursor',supplier,400,{query:{cursor:'forged'}});await call('cross-direction cursor',tender,400,{query:{cursor:first.nextCursor}});
const scope=JSON.parse(Buffer.from(first.nextCursor.split('.')[0],'base64url').toString()).scope,expired=createCursorCodec(Buffer.from(old.cursorKey,'hex'),()=>Date.now()-901000).encode(scope,0,v.initialTenderId);
await call('expired signed cursor',supplier,400,{query:{cursor:expired}});
const selected=await call('scored detail','/pairs/'+v.initialSupplierId+'/'+v.initialTenderId,200);check('null missing fit and separate evidence',selected.pair.criteria.some(x=>x.state==='MISSING'&&x.fit===null&&x.points===0)&&selected.pair.humanDisposition.value===null&&selected.pair.aiTors.value===null);
const outside=await call('outside scope detail','/pairs/'+v.outside.supplierId+'/'+v.outside.tenderId,200);check('outside unscored not zero',outside.pair.formula.pairScore===null&&outside.pair.eligibility.state==='OUTSIDE_FORMULA_V1_1_SCOPE');
await call('intent write disabled','/intents',405,{method:'POST'});await call('human write disabled','/human-disposition',405,{method:'POST'});await call('AI route absent','/jobs/'+'0'.repeat(64),404);await call('artifact route absent','/artifacts/'+'0'.repeat(64),404);await call('whole matrix absent','/matrix',404);
// Use the actual frontend parser/transport against this host, not a separate data client.
const client=createAllToAllClient(bootstrap,(url,init)=>fetch(url,{...init,headers:{...init.headers,Origin:c.origin}}));
await client.health();const page=await client.page('tender',v.initialTenderId);await client.detail(page.results[0].supplierId,page.results[0].tenderId);await client.detail(v.outside.supplierId,v.outside.tenderId);
check('unmodified frontend response semantics accept actual bounded host',page.results.length===25);
report.frontendTransport=client.observations();report.passed=true;const times=report.requests.filter(r=>r.status===200).map(r=>r.ms).sort((a,b)=>a-b);
report.latencyMs={samples:times.length,min:times[0],median:times[Math.floor(times.length/2)],max:times.at(-1),meaning:'Development Windows-to-Frankfurt observations, not SLA/load test'};report.maxPayloadBytes=Math.max(...report.requests.map(r=>r.bytes));
await writeFile('docs/evidence/tendermatch-stage9-hosted-api.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,requests:report.requests.length+report.frontendTransport.requestCount,checks:report.checks.length,maxPayloadBytes:report.maxPayloadBytes,latencyMs:report.latencyMs}));
