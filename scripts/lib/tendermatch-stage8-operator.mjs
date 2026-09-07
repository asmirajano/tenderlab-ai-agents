/** Operator-only Neon API access. Never bundled, logged or sent to the Function. */
import pg from 'pg';
import {loadOperatorSecret} from './tendermatch-stage8-vault.mjs';
export const TARGET=Object.freeze({project:'dry-union-87553313',branch:'br-polished-boat-b1qddx0m',database:'tendermatch_results_dev',host:'ep-dark-dew-b15ctyr1.c-5.eu-central-1.aws.neon.tech',region:'aws-eu-central-1',org:'org-dark-snow-95046181',slug:'tendermatchstage8'});
export async function neonApi(path,options={}) {
  if(!path.startsWith('/projects/'+TARGET.project))throw new Error('Project-scoped API only');
  const v=await loadOperatorSecret('neon-project-deploy');
  if(v.projectId!==TARGET.project||v.branchId!==TARGET.branch)throw new Error('Vault target mismatch');
  const response=await fetch('https://console.neon.tech/api/v2'+path,{...options,headers:{...options.headers,Authorization:'Bearer '+v.key},signal:AbortSignal.timeout(30000)});
  if(!response.ok)throw new Error('Neon API HTTP '+response.status); // Provider bodies may contain secrets.
  return response.json();
}
export const functionPath='/projects/'+TARGET.project+'/branches/'+TARGET.branch+'/functions';
export async function attestTarget(){
  const {project}=await neonApi('/projects/'+TARGET.project);
  const {branch}=await neonApi('/projects/'+TARGET.project+'/branches/'+TARGET.branch);
  if(project.id!==TARGET.project||project.org_id!==TARGET.org||project.region_id!==TARGET.region||branch.id!==TARGET.branch||branch.name!=='development'||branch.default||branch.protected)throw new Error('Development target mismatch');
  return {projectId:project.id,branchId:branch.id,branchName:branch.name,region:project.region_id};
}
export async function ownerConnection(){
  await attestTarget();
  const {uri}=await neonApi('/projects/'+TARGET.project+'/connection_uri?'+new URLSearchParams({branch_id:TARGET.branch,database_name:TARGET.database,role_name:'neondb_owner',pooled:'false'}));
  const u=new URL(uri);
  if(u.hostname!==TARGET.host||u.pathname!=='/'+TARGET.database||decodeURIComponent(u.username)!=='neondb_owner')throw new Error('Owner target mismatch');
  u.searchParams.set('sslmode','verify-full');u.searchParams.set('channel_binding','require');
  const c=new pg.Client({connectionString:u.href,enableChannelBinding:true,connectionTimeoutMillis:10000,query_timeout:10000});c.on('error',()=>{});
  try {await c.connect();const {rows:[r]}=await c.query("SELECT current_database() db,current_user role,shobj_description(oid,'pg_database') description FROM pg_database WHERE datname=current_database()");
    if(r.db!==TARGET.database||r.role!=='neondb_owner'||r.description!=='TenderMatch development result store; prepared contract 20260906; branch '+TARGET.branch)throw new Error('Database attestation failed');
    return c;
  }catch{await c.end().catch(()=>{});throw new Error('Attested owner connection unavailable');}
}
