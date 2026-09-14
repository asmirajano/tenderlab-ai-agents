import {createStage8Store,bindPin} from '../../scripts/lib/tendermatch-stage8-store.mjs';
import {createCursorCodec} from '../../packages/tendermatch/src/service-stage8.ts';
import {createHostedFetch,hostedSessions} from '../../packages/tendermatch/src/hosted-stage8.ts';
import {createReadPool} from './database.mjs';
import {STAGE9_BROWSER} from '../../packages/tendermatch/src/stage9-browser-contract.ts';

let handler;
function initialize(){
  const pin=JSON.parse(process.env.TENDERMATCH_STAGE8_PIN_JSON??'null');
  if(bindPin(pin).bindingId!=='26e1bab78a38d8d520d59563e702bc4540405213f39cbb7b40a49ecbb03a4080')throw new Error('Round 1 binding required');
  const sessions=hostedSessions(JSON.parse(process.env.TENDERMATCH_STAGE8_SESSIONS_JSON??'null'));
  const secret=process.env.TENDERMATCH_STAGE8_CURSOR_KEY??'';
  if(!/^[a-f0-9]{64}$/.test(secret))throw new Error('Signing secret required');
  if(process.env.DATABASE_URL!==process.env.TENDERMATCH_STAGE8_READ_URL||process.env.DATABASE_URL_UNPOOLED!==process.env.TENDERMATCH_STAGE8_READ_URL)throw new Error('Injected owner URL overrides required');
  const {connect}=createReadPool(process.env.TENDERMATCH_STAGE8_READ_URL);
  const store=createStage8Store({connect,pins:[pin],cursors:createCursorCodec(Buffer.from(secret,'hex'))});
  const allowedOrigins=JSON.parse(process.env.TENDERMATCH_STAGE9_ORIGINS_JSON??'[]');
  if(!Array.isArray(allowedOrigins)||allowedOrigins.length>1||allowedOrigins.some(origin=>origin!==STAGE9_BROWSER.origin))throw new Error('Exact development origin required');
  return createHostedFetch({store,sessions,allowedOrigins,codeHash:process.env.TENDERMATCH_STAGE8_CODE_HASH});
}
export default {async fetch(request){
  try{handler??=initialize();return await handler(request);}
  catch{return new Response(JSON.stringify({error:{code:'HOST_CONFIGURATION_UNAVAILABLE'},legacyFallback:false}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});}
}};
