/** Pooled read-only connector. No injected owner/writer URL is read or used. */
import pg from 'pg';
import {HOSTED_DETAIL_SQL,selectedPairQuery} from './queries.mjs';
export const READ_SCHEMA='tendermatch_stage8_v1';
export const READ_ROLE='tendermatch_stage8_reader_dev';
export function guardedRuntimeUrl(value){
  const u=new URL(value);
  if(u.protocol!=='postgresql:'||u.hostname!=='ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech'||u.port&&u.port!=='5432'||u.pathname!=='/tendermatch_results_dev'||decodeURIComponent(u.username)!==READ_ROLE||!u.password||u.searchParams.get('sslmode')!=='verify-full'||u.searchParams.get('channel_binding')!=='require'||[...u.searchParams.keys()].some(k=>!['sslmode','channel_binding'].includes(k)))throw new Error('Restricted development runtime URL required');
  return u.href;
}
export function mappedReadQuery(text,values=[]){
  if(typeof text!=='string'||!(/^(SELECT|WITH)\b/.test(text)||['BEGIN READ ONLY','ROLLBACK'].includes(text)))throw new Error('Read-only connector');
  if(/\b(INSERT|UPDATE|DELETE|TRUNCATE|CREATE|ALTER|DROP|COPY|CALL|COMMIT)\b/i.test(text)||text.includes(';'))throw new Error('Read-only connector');
  return {text:selectedPairQuery(text)?HOSTED_DETAIL_SQL:text.replaceAll('tendermatch_retrieval.',READ_SCHEMA+'.'),values:values.map(v=>v==='tendermatch_retrieval.'?READ_SCHEMA+'.':v)};
}
export function createReadPool(value,{onQueryError=()=>{}}={}){
  const pool=new pg.Pool({connectionString:guardedRuntimeUrl(value),max:2,idleTimeoutMillis:1000,connectionTimeoutMillis:5000,query_timeout:6500,statement_timeout:5000,idle_in_transaction_session_timeout:8000,enableChannelBinding:true,application_name:'tendermatch-stage8-readonly'});
  pool.on('error',()=>{}); // Never log database errors/credentials or row values.
  return {pool,connect:async()=>{
    const client=await pool.connect();let released=false;const acquired=Date.now();
    return {query:async(text,values)=>{
      if(released)throw new Error('Released connection');
      if(Date.now()-acquired>20000&&text!=='ROLLBACK')throw new Error('Read transaction deadline');
      const q=mappedReadQuery(text,values);try{return await client.query(q.text,q.values);}catch(e){onQueryError({code:e.code??'CLIENT_TIMEOUT',operation:q.text.slice(0,75)});throw e;}
    },end:async()=>{if(!released){released=true;client.release(true);}}}; // Destroy closes failed/aborted transactions; bounded reconnects.
  }};
}
