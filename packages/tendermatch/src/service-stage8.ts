/** Authenticated bounded service contract. No database, provider or score mutation. */
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';

export const SERVICE_VERSION='tendermatch-sealed-service/1.0.0';
export const API_PREFIX='/api/tendermatch/all-to-all/v1';
export const SERVICE_LIMITS=Object.freeze({page:100,defaultPage:25,bodyBytes:8192,responseBytes:524288,concurrency:2,statementMs:5000,cursorMs:900000,requestsPerMinute:120});
export class ServiceError extends Error {
  status:number;
  code:string;
  constructor(status:number,code:string){super(code);this.status=status;this.code=code;}
}
export const fail=(status:number,code:string):never=>{throw new ServiceError(status,code);};
export const uuid=(value:unknown):string=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value)?value:fail(400,'INVALID_CANONICAL_ID');
export const digest=(value:unknown):string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value)?value:fail(400,'INVALID_VERSION_IDENTITY');
const secretHash=(value:string)=>createHash('sha256').update(value).digest();
const equal=(a:Buffer,b:Buffer)=>a.length===b.length&&timingSafeEqual(a,b);
export const SCOPES=['read','request-review','request-audit','assessment-read'] as const;
export type SessionSeed={token:string;csrfToken:string;subject:string;tenantId:string;scopes:typeof SCOPES[number][];expiresAt:number};
export type Principal=Readonly<{subject:string;tenantId:string;scopes:readonly typeof SCOPES[number][];sessionId:string}>;

/** Server-provisioned opaque credentials, not a login/IdP or browser credential issuer. */
export function createSessionRegistry(seeds:SessionSeed[],clock=Date.now){
  if(!Array.isArray(seeds)||seeds.length<1||seeds.length>1000)throw new Error('Explicit bounded server sessions required');
  const sessions=new Map<string,{principal:Principal;csrf:Buffer;expires:number;window:number;count:number}>();
  for(const s of seeds){
    if(!/^[A-Za-z0-9_-]{43,256}$/.test(s.token)||!/^[A-Za-z0-9_-]{43,256}$/.test(s.csrfToken)||s.token===s.csrfToken||![s.subject,s.tenantId].every(v=>/^[A-Za-z0-9._:@-]{3,128}$/.test(v))||!Number.isSafeInteger(s.expiresAt)||s.expiresAt<=clock()||s.expiresAt>clock()+86400000||!s.scopes.length||s.scopes.some(v=>!SCOPES.includes(v)))throw new Error('Invalid explicit server session');
    const id=secretHash(s.token).toString('hex');if(sessions.has(id))throw new Error('Duplicate session credential');
    sessions.set(id,{principal:Object.freeze({subject:s.subject,tenantId:s.tenantId,scopes:Object.freeze([...new Set(s.scopes)]),sessionId:id}),csrf:secretHash(s.csrfToken),expires:s.expiresAt,window:0,count:0});
  }
  return {
    authenticate(authorization:unknown):Principal {
      if(typeof authorization!=='string'||!/^Bearer [A-Za-z0-9_-]{43,256}$/.test(authorization))return fail(401,'AUTHENTICATION_REQUIRED');
      const session=sessions.get(secretHash(authorization.slice(7)).toString('hex'));
      if(!session||session.expires<=clock())return fail(401,'INVALID_OR_EXPIRED_SESSION');
      const window=Math.floor(clock()/60000);if(window!==session.window){session.window=window;session.count=0;}
      if(++session.count>SERVICE_LIMITS.requestsPerMinute)return fail(429,'SESSION_RATE_LIMIT');return session.principal;
    },
    authorize(principal:Principal,scope:typeof SCOPES[number]){if(!principal.scopes.includes(scope))fail(403,'SCOPE_REQUIRED');},
    csrf(principal:Principal,token:unknown){const session=sessions.get(principal.sessionId);if(!session||session.expires<=clock()||typeof token!=='string'||token.length>256||!equal(session.csrf,secretHash(token)))fail(403,'CSRF_TOKEN_REQUIRED');},
    revoke(token:string){return sessions.delete(secretHash(token).toString('hex'));},
  };
}

/** Tamper-evident, expiring tenant/version/focus-bound cursors. */
export function createCursorCodec(key:Buffer,clock=Date.now){
  if(!Buffer.isBuffer(key)||key.length<32)throw new Error('Server cursor signing key required');
  const signingKey=Buffer.from(key),mac=(body:string)=>createHmac('sha256',signingKey).update(body).digest();
  return {
    encode(scope:string,units:number,id:string){const body=Buffer.from(JSON.stringify({scope,units,id,expires:clock()+SERVICE_LIMITS.cursorMs})).toString('base64url');return body+'.'+mac(body).toString('base64url');},
    decode(token:unknown,scope:string){
      if(token===null||token===undefined)return null;
      if(typeof token!=='string'||token.length>1024||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token))return fail(400,'INVALID_CURSOR');
      const [body,signature]=token.split('.'),decoded=Buffer.from(signature,'base64url');if(decoded.toString('base64url')!==signature||!equal(mac(body),decoded))return fail(400,'INVALID_CURSOR');
      let p;try{p=JSON.parse(Buffer.from(body,'base64url').toString('utf8'));}catch{return fail(400,'INVALID_CURSOR');}
      if(!p||Object.keys(p).sort().join(',')!=='expires,id,scope,units'||p.scope!==scope||!Number.isSafeInteger(p.expires)||p.expires<=clock()||p.expires>clock()+SERVICE_LIMITS.cursorMs||!Number.isInteger(p.units)||p.units<0||p.units>1000000)return fail(400,'CURSOR_SCOPE_OR_EXPIRY');
      uuid(p.id);return p as {scope:string;units:number;id:string;expires:number};
    },
  };
}

export function pageLimit(value:unknown){if(value===null||value===undefined)return SERVICE_LIMITS.defaultPage;if(typeof value!=='string'||!/^\d{1,3}$/.test(value))return fail(400,'INVALID_PAGE_LIMIT');const n=Number(value);return n>=1&&n<=SERVICE_LIMITS.page?n:fail(400,'INVALID_PAGE_LIMIT');}
export function exactKeys(value:unknown,keys:string[]){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!==[...keys].sort().join(','))fail(400,'UNEXPECTED_REQUEST_FIELDS');}
export function intentInput(body:unknown,idempotencyKey:unknown){
  exactKeys(body,['supplierId','tenderId','kind','justification']);const p=body as {supplierId:string;tenderId:string;kind:string;justification:string};uuid(p.supplierId);uuid(p.tenderId);
  if(!['USER_REVIEW','REPORT_REQUEST','AUDIT_REQUEST'].includes(p.kind)||typeof p.justification!=='string'||p.justification.trim().length<3||p.justification.length>2000)fail(400,'ATTRIBUTED_INTENT_REQUIRED');
  if(typeof idempotencyKey!=='string'||!/^[A-Za-z0-9._:-]{8,128}$/.test(idempotencyKey))fail(400,'IDEMPOTENCY_KEY_REQUIRED');
  return {...p,requestId:idempotencyKey as string};
}
