import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {developmentPin} from '../scripts/tendermatch-stage8.mjs';
import {bindPin} from '../scripts/lib/tendermatch-stage8-store.mjs';
import {PRODUCTION,ident,sealedSelections,selectRows,guardedProductionReadUrl,validateColumns,GENERATED,restorableDataConstraints} from '../scripts/lib/tendermatch-production-contract.mjs';

test('production identity is explicitly distinct from development',()=>{
  assert.equal(PRODUCTION.database,'tendermatch_results_prod');
  assert.equal(PRODUCTION.branch,'br-wispy-bird-b1fj8mih');
  assert.equal(PRODUCTION.loginRole,'tendermatch_results_reader_prod');
  assert.notEqual(PRODUCTION.loginRole,PRODUCTION.grantRole);
});
test('runtime target rejects development, owner, missing TLS and injected options',()=>{
  const url=`postgresql://${PRODUCTION.loginRole}:test-only@${PRODUCTION.host}/${PRODUCTION.database}?sslmode=verify-full&channel_binding=require`;
  assert.equal(guardedProductionReadUrl(url),url);
  for(const bad of [url.replace('_prod?','_dev?'),url.replace(PRODUCTION.loginRole,'neondb_owner'),url.replace('verify-full','require'),url+'&options=-crole=neondb_owner',url.replace('postgresql:','https:')])assert.throws(()=>guardedProductionReadUrl(bad));
});
test('only exact reviewed stored generated expressions are accepted',()=>{
  const column={name:'expected_pairs',generated:'s',identity:'',default_expression:GENERATED['eligibility_run.expected_pairs']};
  assert.doesNotThrow(()=>validateColumns('eligibility_run',[column]));
  assert.throws(()=>validateColumns('eligibility_run',[{...column,default_expression:'42'}]));
  assert.throws(()=>validateColumns('eligibility_run',[{...column,identity:'a'}]));
});
test('PostgreSQL 18 NOT NULL metadata and writer triggers are not replayed as ADD CONSTRAINT',()=>{
  const source=['n','c','f','p','t','u'].map(type=>({type}));
  assert.deepEqual(restorableDataConstraints(source).map(x=>x.type),['c','f','p','u']);
  assert.throws(()=>restorableDataConstraints([{type:'unknown'}]),/Unreviewed/);
});
test('raw and already-bound approved pins select exactly the same sealed rows',async()=>{
  const p=await developmentPin();
  assert.deepEqual(sealedSelections(p),sealedSelections(bindPin(p)));
  assert.equal(Object.keys(sealedSelections(p)).length,32);
  assert.throws(()=>sealedSelections({...p,planId:'0'.repeat(64)}),/Unapproved/);
});
test('copy preserves full base columns and deterministic primary-key order',()=>{
  const sql=selectRows('formula_pair',['tenant_id','confidence','coverage'],['tenant_id','supplier_key'],'true');
  assert.equal(sql,'SELECT r."tenant_id",r."confidence",r."coverage" FROM tendermatch_retrieval."formula_pair" r WHERE true ORDER BY r."tenant_id",r."supplier_key"');
  assert.throws(()=>ident('bad;DROP TABLE'),/Unexpected/);
});
test('selected namespace is provenance, not silently renamed to production',async()=>{
  const p=await developmentPin();
  assert.equal(p.tenantId,'tendermatch-development-stage1');
  const selections=sealedSelections(p);
  assert.match(selections.eligibility_pair,/tendermatch-development-stage1/);
  assert.match(selections.eligibility_pair,new RegExp(p.eligibilityRunId));
  assert.match(selections.formula_pair,new RegExp(p.formulaPolicy));
  assert.match(selections.ranking_pair,new RegExp(p.methodHash));
});
test('runner fails closed, does not deploy, and disables failed new runtime',async()=>{
  const source=await readFile(new URL('../scripts/tendermatch-production-promote.mjs',import.meta.url),'utf8');
  assert.match(source,/--create-approved/);
  assert.match(source,/Existing promotion attempt/);
  assert.match(source,/runtimeProvisioned.*ALTER ROLE.*NOLOGIN/s);
  assert.doesNotMatch(source,/firebase deploy|gcloud.*deploy|DROP DATABASE|TRUNCATE TABLE/);
});
