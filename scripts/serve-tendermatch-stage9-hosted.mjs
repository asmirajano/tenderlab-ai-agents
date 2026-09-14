/** Owner-launched loopback static preview. No API proxy, database or session issuer. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadOperatorSecret} from './lib/tendermatch-stage8-vault.mjs';
import {STAGE9_BROWSER as contract} from '../packages/tendermatch/src/stage9-browser-contract.ts';
import {validateDevelopmentSession} from '../apps/tender-apps/src/tendermatch-all-to-all-api.ts';

const root=path.resolve(import.meta.dirname,'..');
export async function loadStage9Bootstrap(){
  const pointer=JSON.parse(await readFile(path.join(root,'build/tendermatch-stage9/session-pointer.json'),'utf8'));
  if(!/^browser-stage9-\d{13}$/.test(pointer.vaultName))throw new Error('Explicit local operator session required');
  const vault=await loadOperatorSecret(pointer.vaultName),s=vault.sessions.find(s=>s.name==='browser');
  if(vault.codeHash!==pointer.codeHash||JSON.stringify(vault.contract)!==JSON.stringify(contract))throw new Error('Session/build binding mismatch');
  return validateDevelopmentSession({schemaVersion:'tendermatch-browser-session/1.0.0',sourceMode:'hosted-development-stage8',bindingId:contract.bindingId,token:s.token,csrfToken:vault.csrfToken,subject:s.subject,scopes:['read'],expiresAt:s.expiresAt,initialSupplierId:vault.initialSupplierId,initialTenderId:vault.initialTenderId,hosted:{apiOrigin:contract.apiOrigin,browserOrigin:contract.origin,audience:contract.audience,codeHash:vault.codeHash,readOnly:true}});
}
export async function createStage9HostedPreview({approved=false,dist=path.join(root,'apps/tender-apps/dist'),bootstrap}={}){
  if(!approved)throw new Error('Explicit hosted development preview authority required');
  const session=bootstrap??await loadStage9Bootstrap(),resolved=path.resolve(dist);
  await readFile(path.join(resolved,'index.html'));
  const server=createServer(async(req,res)=>{
    try{
      // Exact Host and fetch metadata protect the local session from rebinding and cross-site reads.
      if(req.headers.host!==new URL(contract.origin).host||req.headers.origin&&req.headers.origin!==contract.origin||req.headers['sec-fetch-site']&&!['none','same-origin'].includes(req.headers['sec-fetch-site'])||['iframe','frame','object','embed'].includes(req.headers['sec-fetch-dest'])){res.writeHead(403,{'Cache-Control':'no-store'});res.end('Local owner audience required');return;}
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
      const u=new URL(req.url,contract.origin),pathname=decodeURIComponent(u.pathname);
      if(u.origin!==contract.origin||pathname.startsWith('/api/')){res.writeHead(404);res.end();return;}
      const html=['/','/tendermatch','/tenderboost','/tenderboost-ai'].includes(pathname),file=html?path.join(resolved,'index.html'):path.resolve(resolved,'.'+pathname);
      if(!file.startsWith(resolved+path.sep)){res.writeHead(403);res.end();return;}
      let content;try{content=await readFile(file);}catch{res.writeHead(404);res.end('Not found');return;}
      if(html&&u.searchParams.get('mode')==='all-to-all-dev'&&Date.now()<session.expiresAt)content=Buffer.from(content.toString().replace('</head>','<script type="application/json" id="tendermatch-all-to-all-session">'+JSON.stringify(session).replaceAll('<','\\u003c')+'</script></head>'));
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.jpg':'image/jpeg'}[path.extname(file)]??'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ${contract.apiOrigin}; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`});
      res.end(req.method==='HEAD'?undefined:content);
    }catch{res.writeHead(503,{'Cache-Control':'no-store'});res.end('Development preview unavailable');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(Number(new URL(contract.origin).port),'127.0.0.1',resolve);});
  return {origin:contract.origin,expiresAt:session.expiresAt,close:async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const server=await createStage9HostedPreview({approved:process.argv.includes('--hosted-readonly-approved')});
  console.log(JSON.stringify({url:server.origin+'/tendermatch?mode=all-to-all-dev',expiresAt:new Date(server.expiresAt).toISOString(),mode:'HOSTED_DEVELOPMENT_READ_ONLY',apiProxy:false}));
  for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>void server.close());
}
