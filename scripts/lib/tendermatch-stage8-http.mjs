/** Independent versioned HTTP adapter. Existing local routes/static server untouched. */
import {createServer} from 'node:http';
import {API_PREFIX,SERVICE_VERSION,SERVICE_LIMITS,ServiceError,fail,uuid,digest,pageLimit,intentInput} from '../../packages/tendermatch/src/service-stage8.ts';

function parameters(url,allowed){
  const seen=new Set();for(const [key] of url.searchParams){if(!allowed.includes(key)||seen.has(key))fail(400,'UNEXPECTED_QUERY_PARAMETERS');seen.add(key);}
  return digest(url.searchParams.get('binding'));
}
async function body(request){
  if(!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type']??''))fail(415,'JSON_CONTENT_TYPE_REQUIRED');
  if(request.headers['content-encoding'])fail(415,'COMPRESSED_REQUEST_NOT_SUPPORTED');
  if(request.headers['content-length']&&(!/^\d+$/.test(request.headers['content-length'])||Number(request.headers['content-length'])>SERVICE_LIMITS.bodyBytes))fail(413,'REQUEST_BODY_TOO_LARGE');
  const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>SERVICE_LIMITS.bodyBytes)fail(413,'REQUEST_BODY_TOO_LARGE');chunks.push(chunk);}
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{fail(400,'INVALID_JSON_BODY');}
}
export function createStage8HttpServer({store,sessions,allowedOrigins}){
  if(!store||!sessions||!Array.isArray(allowedOrigins)||!allowedOrigins.length||allowedOrigins.length>10)throw new Error('Explicit authenticated service dependencies required');
  const origins=new Set(allowedOrigins.map(value=>{const u=new URL(value);if(u.origin!==value||u.username||u.password||!(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)))throw new Error('Exact HTTPS or loopback origin required');return value;}));
  const send=(response,status,result)=>{
    if(response.destroyed)return;
    let serialized=JSON.stringify(result);if(Buffer.byteLength(serialized)>SERVICE_LIMITS.responseBytes){status=503;serialized=JSON.stringify({version:SERVICE_VERSION,error:{code:'BOUNDED_RESPONSE_UNAVAILABLE'}});}
    response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive','Vary':'Authorization'});response.end(serialized);
  };
  const server=createServer({maxHeaderSize:8192},async(request,response)=>{
    request.setTimeout(5000,()=>request.destroy());
    try{
      for(const name of ['authorization','origin','x-csrf-token','idempotency-key'])if(request.rawHeaders.filter((v,i)=>i%2===0&&v.toLowerCase()===name).length>1)fail(400,'AMBIGUOUS_SECURITY_HEADERS');
      const principal=sessions.authenticate(request.headers.authorization);sessions.authorize(principal,'read');
      if(typeof request.url!=='string'||request.url.length>4096||!request.url.startsWith('/')||request.url.startsWith('//'))fail(400,'INVALID_REQUEST_TARGET');
      const url=new URL(request.url,'http://127.0.0.1');if(url.hash||url.username||url.password)fail(400,'INVALID_REQUEST_TARGET');
      let result,match;const path=url.pathname;
      if(path===API_PREFIX+'/health'){
        if(request.method!=='GET')fail(405,'METHOD_NOT_ALLOWED');const binding=parameters(url,['binding']);result=await store.health(principal,binding);
      }else if((match=path.match(new RegExp('^'+API_PREFIX+'/(suppliers|tenders)/([^/]+)/results$')))){
        if(request.method!=='GET')fail(405,'METHOD_NOT_ALLOWED');const binding=parameters(url,['binding','limit','cursor']),focusId=uuid(match[2]),limit=pageLimit(url.searchParams.get('limit'));result=await store.page(principal,binding,{direction:match[1]==='suppliers'?'supplier':'tender',focusId,limit,cursor:url.searchParams.get('cursor')});
      }else if((match=path.match(new RegExp('^'+API_PREFIX+'/pairs/([^/]+)/([^/]+)$')))){
        if(request.method!=='GET')fail(405,'METHOD_NOT_ALLOWED');const binding=parameters(url,['binding']);result=await store.detail(principal,binding,uuid(match[1]),uuid(match[2]));
      }else if(path===API_PREFIX+'/intents'){
        if(request.method!=='POST')fail(405,'METHOD_NOT_ALLOWED');const binding=parameters(url,['binding']);
        if(typeof request.headers.origin!=='string'||!origins.has(request.headers.origin))fail(403,'TRUSTED_ORIGIN_REQUIRED');sessions.csrf(principal,request.headers['x-csrf-token']);
        const input=intentInput(await body(request),request.headers['idempotency-key']);sessions.authorize(principal,input.kind==='AUDIT_REQUEST'?'request-audit':'request-review');result=await store.intent(principal,binding,input);
      }else if((match=path.match(new RegExp('^'+API_PREFIX+'/intents/([^/]+)$')))){
        if(request.method!=='GET')fail(405,'METHOD_NOT_ALLOWED');sessions.authorize(principal,'assessment-read');const binding=parameters(url,['binding']);result=await store.requestStatus(principal,binding,digest(match[1]));
      }else if((match=path.match(new RegExp('^'+API_PREFIX+'/jobs/([^/]+)$')))){
        if(request.method!=='GET')fail(405,'METHOD_NOT_ALLOWED');sessions.authorize(principal,'assessment-read');const binding=parameters(url,['binding']);result=await store.job(principal,binding,digest(match[1]));
      }else if((match=path.match(new RegExp('^'+API_PREFIX+'/artifacts/([^/]+)$')))){
        if(request.method!=='GET')fail(405,'METHOD_NOT_ALLOWED');sessions.authorize(principal,'assessment-read');const binding=parameters(url,['binding','jobId']);result=await store.artifact(principal,binding,digest(url.searchParams.get('jobId')),digest(match[1]));
      }else fail(404,'VERSIONED_ROUTE_NOT_FOUND');
      send(response,200,result);
    }catch(error){const known=error instanceof ServiceError;send(response,known?error.status:503,{version:SERVICE_VERSION,error:{code:known?error.code:'SERVICE_UNAVAILABLE'},legacyFallback:false,modelCalls:0});}
  });
  server.requestTimeout=5000;server.headersTimeout=5000;server.keepAliveTimeout=1000;server.maxHeadersCount=32;server.maxConnections=8;
  return server;
}
