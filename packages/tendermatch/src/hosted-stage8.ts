/** Node 24 Fetch boundary for the development-only, read-only sealed service. */
import {createHash} from 'node:crypto';
import {API_PREFIX,SERVICE_VERSION,SERVICE_LIMITS,ServiceError,fail,digest,uuid,pageLimit} from './service-stage8.ts';
import type {Principal} from './service-stage8.ts';

export const HOSTED_VERSION='tendermatch-neon-readonly/1.0.0';
export type HostedSession={tokenHash:string;subject:string;tenantId:string;issuedAt:number;expiresAt:number};
export type ReadStore={
  health:(principal:Principal,binding:string)=>Promise<unknown>;
  page:(principal:Principal,binding:string,query:{direction:string;focusId:string;limit:number;cursor:string|null})=>Promise<unknown>;
  detail:(principal:Principal,binding:string,supplierId:string,tenderId:string)=>Promise<unknown>;
};
/** Hash-only seeds remain safe to load after expiry or isolate restart. No issuer/refresh route. */
export function hostedSessions(seeds:HostedSession[],clock=Date.now){
  if(!Array.isArray(seeds)||!seeds.length||seeds.length>10)throw new Error('Bounded owner sessions required');
  const entries=new Map<string,{seed:HostedSession;window:number;count:number}>();
  for(const s of seeds){
    digest(s.tokenHash);
    if(![s.subject,s.tenantId].every(v=>/^[A-Za-z0-9._:@-]{3,128}$/.test(v))||!Number.isSafeInteger(s.issuedAt)||!Number.isSafeInteger(s.expiresAt)||s.expiresAt<=s.issuedAt||s.expiresAt-s.issuedAt>86400000||entries.has(s.tokenHash))throw new Error('Invalid session seed');
    entries.set(s.tokenHash,{seed:{...s},window:-1,count:0});
  }
  return {authenticate(value:string|null):Principal{
    if(!value||!/^Bearer [A-Za-z0-9_-]{43,256}$/.test(value))return fail(401,'AUTHENTICATION_REQUIRED');
    const id=createHash('sha256').update(value.slice(7)).digest('hex'),entry=entries.get(id),now=clock();
    if(!entry||entry.seed.issuedAt>now||entry.seed.expiresAt<=now)return fail(401,'INVALID_OR_EXPIRED_SESSION');
    const window=Math.floor(now/60000);if(entry.window!==window){entry.window=window;entry.count=0;}
    if(++entry.count>SERVICE_LIMITS.requestsPerMinute)return fail(429,'SESSION_RATE_LIMIT');
    return Object.freeze({subject:entry.seed.subject,tenantId:entry.seed.tenantId,sessionId:id,scopes:Object.freeze(['read'] as const)});
  }};
}
function queryBinding(url:URL,allowed:string[]){
  const seen=new Set<string>();for(const key of url.searchParams.keys()){if(!allowed.includes(key)||seen.has(key))fail(400,'UNEXPECTED_QUERY_PARAMETERS');seen.add(key);}
  return digest(url.searchParams.get('binding'));
}
/** Remove obsolete route hints; no result can advertise a hosted write or AI action. */
export function readonlyResult(value:unknown):unknown{
  if(Array.isArray(value))return value.map(readonlyResult);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>{
    if(key==='capabilities')return [key,{provider:'UNCONFIGURED',readOnly:true,intentBoundaryAvailable:false,executionAuthority:false,automaticMatchDecision:false,aiRoutesAvailable:false}];
    if(key==='aiTors')return [key,{state:'UNAVAILABLE_READ_ONLY_HOST',value:null}];
    if(key==='executionAuthorization')return [key,{state:'NOT_IMPLIED',authorityGranted:false,actualAuthorization:'NOT_LOADED_READ_ONLY_HOST'}];
    return [key,readonlyResult(v)];
  }));
  return value;
}
export function createHostedFetch({store,sessions,allowedOrigins,codeHash,clock=Date.now}:{store:ReadStore;sessions:ReturnType<typeof hostedSessions>;allowedOrigins:string[];codeHash:string;clock?:()=>number}){
  digest(codeHash);
  if(!Array.isArray(allowedOrigins)||allowedOrigins.length>5)throw new Error('Restrictive origins required');
  const origins=new Set(allowedOrigins.map(value=>{const u=new URL(value);if(u.origin!==value||u.username||u.password||!(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))throw new Error('Exact origin required');return value;}));
  let active=0;
  return async(request:Request):Promise<Response>=>{
    const started=clock(),origin=request.headers.get('origin');let admitted=false;
    const send=(status:number,payload:unknown)=>{
      let body=JSON.stringify(payload);if(Buffer.byteLength(body)>SERVICE_LIMITS.responseBytes){status=503;body=JSON.stringify({error:{code:'BOUNDED_RESPONSE_UNAVAILABLE'}});}
      const headers:Record<string,string>={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive','Vary':'Authorization, Origin','X-TenderMatch-Code':codeHash,'X-TenderMatch-Runtime':HOSTED_VERSION,'Server-Timing':`app;dur=${Math.max(0,clock()-started)}`};
      if(origin&&origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
      return new Response(status===204?null:body,{status,headers});
    };
    try{
      const url=new URL(request.url);
      if(request.url.length>4096||url.hash||url.username||url.password)fail(400,'INVALID_REQUEST_TARGET');
      let headerBytes=0,headerCount=0;for(const [k,v] of request.headers){headerBytes+=k.length+v.length;headerCount++;}
      if(headerBytes>8192||headerCount>32)fail(431,'HEADERS_TOO_LARGE');
      if(origin&&!origins.has(origin))fail(403,'TRUSTED_ORIGIN_REQUIRED');
      // No cross-origin browser integration in Stage 8: even preflight requires auth.
      const principal=sessions.authenticate(request.headers.get('authorization'));
      if(request.method!=='GET')fail(405,'READ_ONLY_METHOD_REQUIRED');
      if(request.body||request.headers.has('content-encoding'))fail(400,'BODY_NOT_SUPPORTED');
      if(active>=SERVICE_LIMITS.concurrency)fail(503,'BOUNDED_SERVICE_BUSY');
      let operation:()=>Promise<unknown>=async()=>fail(404,'READ_ONLY_ROUTE_NOT_FOUND'),match:RegExpMatchArray|null;
      if(url.pathname===API_PREFIX+'/health'){
        const binding=queryBinding(url,['binding']);operation=()=>store.health(principal,binding);
      }else if((match=url.pathname.match(new RegExp('^'+API_PREFIX+'/(suppliers|tenders)/([^/]+)/results$')))){
        const binding=queryBinding(url,['binding','limit','cursor']),focusId=uuid(match[2]),limit=pageLimit(url.searchParams.get('limit')),direction=match[1]==='suppliers'?'supplier':'tender';
        operation=()=>store.page(principal,binding,{direction,focusId,limit,cursor:url.searchParams.get('cursor')});
      }else if((match=url.pathname.match(new RegExp('^'+API_PREFIX+'/pairs/([^/]+)/([^/]+)$')))){
        const binding=queryBinding(url,['binding']),supplierId=uuid(match[1]),tenderId=uuid(match[2]);operation=()=>store.detail(principal,binding,supplierId,tenderId);
      }else fail(404,'READ_ONLY_ROUTE_NOT_FOUND');
      active++;admitted=true;
      const result=await operation();
      return send(200,{...readonlyResult(result) as object,host:{version:HOSTED_VERSION,codeHash,readOnly:true,modelCalls:0,legacyFallback:false}});
    }catch(error){return send(error instanceof ServiceError?error.status:503,{version:SERVICE_VERSION,error:{code:error instanceof ServiceError?error.code:'SERVICE_UNAVAILABLE'},modelCalls:0,legacyFallback:false});}
    finally{if(admitted)active--;}
  };
}
