/** Loopback-only test harness. Ephemeral sessions/DB; never a deployment runtime. */
import {readFile,stat} from 'node:fs/promises';
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createSessionRegistry,createCursorCodec,SCOPES,API_PREFIX} from '../packages/tendermatch/src/service-stage8.ts';
import {createStage8Store,bindPin} from './lib/tendermatch-stage8-store.mjs';
import {createStage8HttpServer} from './lib/tendermatch-stage8-http.mjs';
import {initializeStage9Fixture,id} from '../tests/fixtures/tendermatch-stage9.mjs';
import {initializeStage6Fixture} from '../tests/fixtures/tendermatch-stage6.mjs';
import {TENANT} from './lib/tendermatch-input-manifest.mjs';
import {hash} from '../packages/tendermatch/src/escalation-stage7.ts';
const root=fileURLToPath(new URL('../',import.meta.url)),defaultDist=path.join(root,'apps/tender-apps/dist');
const credential=()=>randomBytes(32).toString('base64url');
export async function createStage9FixtureServer({localFixture=false,missingStage7=false,dist=defaultDist,port=0}={}) {
  if(!localFixture)throw new Error('Explicit local synthetic fixture authority required');
  const runtime=process.env.TENDERMATCH_PGLITE_ROOT;if(!runtime)throw new Error('Explicit isolated PGlite runtime required');
  const {PGlite}=await import(pathToFileURL(path.join(runtime,'@electric-sql/pglite/dist/index.js')).href),db=new PGlite(),metrics={apiRequests:[],staticRequests:[],databaseQueries:0,maxDatabaseResponseBytes:0},c={query:async(q,v)=>{metrics.databaseQueries++;const r=await db.query(q,v);metrics.maxDatabaseResponseBytes=Math.max(metrics.maxDatabaseResponseBytes,Buffer.byteLength(JSON.stringify(r.rows)));return {...r,rowCount:r.affectedRows??r.rows.length};},end:async()=>{}};
  let server,api;try{
    let fixture;
    if(missingStage7){await initializeStage6Fixture(db);fixture={pin:{tenantId:TENANT,...Object.fromEntries(['planId','shortlistRunId','shortlistOutcomeHash','rankingRunId','rankingOutcomeHash','formulaRunId','formulaOutcomeHash','eligibilityRunId','eligibilityOutcomeHash','methodHash','formulaPolicy','eligibilityPolicy','planCodeHash','allocationHash'].map(k=>[k,hash('Stage9 missing '+k)])),automaticRequests:0},initialSupplierId:id(2),initialTenderId:id(10000)};}
    else fixture=await initializeStage9Fixture(db,c);
    await db.exec('SET ROLE tendermatch_result_writer');let tail=Promise.resolve();const connect=async()=>{const before=tail;let release;tail=new Promise(resolve=>{release=resolve;});await before;return {query:c.query,end:async()=>release()};};
    const session={token:credential(),csrfToken:credential(),subject:'stage9-local-fixture-reviewer',tenantId:TENANT,scopes:[...SCOPES],expiresAt:Date.now()+3600000},bound=bindPin(fixture.pin),bootstrap={schemaVersion:'tendermatch-browser-session/1.0.0',sourceMode:'synthetic-local-postgresql',bindingId:bound.bindingId,token:session.token,csrfToken:session.csrfToken,subject:session.subject,scopes:session.scopes,expiresAt:session.expiresAt,initialSupplierId:fixture.initialSupplierId,initialTenderId:fixture.initialTenderId},sessions=createSessionRegistry([session]),store=createStage8Store({connect,pins:[fixture.pin],cursors:createCursorCodec(randomBytes(32)),connectionLimit:2});
    const resolvedDist=path.resolve(dist);await stat(path.join(resolvedDist,'index.html'));let origin;
    server=createServer(async(req,res)=>{try{
      if(req.headers.host!==new URL(origin).host){res.writeHead(403);res.end('Loopback host required');return;}const u=new URL(req.url,origin),pathname=decodeURIComponent(u.pathname);
      if(pathname.startsWith('/api/')){if(!pathname.startsWith(API_PREFIX+'/')){res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Only the explicit Stage 8 fixture API is mounted'}));return;}const started=performance.now(),entry={method:req.method,path:pathname,query:[...u.searchParams.keys()],status:null,bytes:0,elapsedMs:null};metrics.apiRequests.push(entry);const end=res.end.bind(res);res.end=(chunk,...args)=>{entry.status=res.statusCode;entry.bytes=chunk?Buffer.byteLength(chunk):0;entry.elapsedMs=Math.round((performance.now()-started)*100)/100;return end(chunk,...args);};api.emit('request',req,res);return;}
      metrics.staticRequests.push(pathname);if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
      const file=path.resolve(resolvedDist,'.'+pathname);if(file!==resolvedDist&&!file.startsWith(resolvedDist+path.sep)){res.writeHead(403);res.end();return;}
      let target=file;if(['/','/tendermatch','/balance-sheet-review','/landed-cost'].includes(pathname))target=path.join(resolvedDist,'index.html');let content;try{content=await readFile(target);}catch{res.writeHead(404);res.end('Not found');return;}
      const ext=path.extname(target),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2'}[ext]??'application/octet-stream';
      if(ext==='.html'&&u.searchParams.get('mode')==='all-to-all-dev')content=Buffer.from(content.toString().replace('</head>','<script type="application/json" id="tendermatch-all-to-all-session">'+JSON.stringify(bootstrap).replaceAll('<','\\u003c')+'</script></head>'));
      res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(req.method==='HEAD'?undefined:content);
    }catch{res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'LOCAL_FIXTURE_FAILED'}));}});
    await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;api=createStage8HttpServer({store,sessions,allowedOrigins:[origin]});
    return {origin,metrics,fixture,bootstrap,db,c,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));api.closeAllConnections();await tail;await db.close();}};
  }catch(error){server?.closeAllConnections();server?.close();await db.close();throw error;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const local=process.argv.includes('--local-fixture');const server=await createStage9FixtureServer({localFixture:local,missingStage7:process.argv.includes('--missing-stage7'),port:Number(process.env.TENDERMATCH_STAGE9_PORT??0)});console.log(JSON.stringify({mode:'SYNTHETIC_LOCAL_POSTGRESQL_NOT_NEON',url:server.origin+'/tendermatch?mode=all-to-all-dev',modelCalls:0,neonConnections:0,sourceConnections:0}));for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>void server.close());}
