import {ownerConnection, neonApi, TARGET} from './lib/tendermatch-stage8-operator.mjs';
import {developmentPin} from './tendermatch-stage8.mjs';
import {bindPin} from './lib/tendermatch-stage8-store.mjs';
const c = await ownerConnection();
try {
  await c.query('BEGIN READ ONLY');
  const {rows: tables} = await c.query("SELECT c.relname,c.reltuples::bigint approximate_rows,pg_total_relation_size(c.oid)::bigint bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tendermatch_retrieval' AND c.relkind='r' ORDER BY c.relname");
  const {rows: columns} = await c.query("SELECT table_name,column_name,data_type,udt_schema,udt_name FROM information_schema.columns WHERE table_schema='tendermatch_retrieval' AND udt_schema<>'pg_catalog' ORDER BY table_name,ordinal_position");
  const {rows: constraints} = await c.query("SELECT c.relname,t.contype,pg_get_constraintdef(t.oid) definition FROM pg_constraint t JOIN pg_class c ON c.oid=t.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='tendermatch_retrieval' AND t.contype IN ('f','p') ORDER BY c.relname,t.contype");
  console.log(JSON.stringify({source: TARGET, pin: bindPin(await developmentPin()), tables, nonBuiltinColumns: columns, constraints}));
  await c.query('ROLLBACK');
  const e = await neonApi('/projects/' + TARGET.project + '/endpoints');
  console.log(JSON.stringify({endpoints:e.endpoints.map(x=>({id:x.id,branch_id:x.branch_id,host:x.host,type:x.type,current_state:x.current_state,autoscaling_limit_min_cu:x.autoscaling_limit_min_cu,autoscaling_limit_max_cu:x.autoscaling_limit_max_cu}))}));
} finally { await c.end(); }
