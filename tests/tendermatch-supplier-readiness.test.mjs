import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {alignSupplierReadiness,readinessQuantity,supplierReadinessIdentity,validateSupplierReadiness,readinessClauses,READINESS_FIELDS} from '../packages/tendermatch/src/supplier-readiness.ts';
import {extractOnce,summarizeReadiness,readinessCodeIdentity} from '../scripts/tendermatch-align-suppliers.mjs';
import {sha} from '../scripts/lib/tendermatch-input-manifest.mjs';
const code='a'.repeat(64);
function fixture(rows,version='test-v1'){
  const evidence=rows.map(([field,value,status='STATED_UNVERIFIED',artifact=true],i)=>({canonical_entity_id:'supplier-a',profile_version_id:'profile-a',claim_id:`claim-${i}`,external_claim_id:`external-${i}`,field,source_field:field,display_value:value,status,value_class:status==='UNKNOWN'?'MISSING':'SOURCE',source_record_id:`source-${i}`,source_system:'Synthetic regression',retrieved_at:'2026-09-01T00:00:00Z',source_artifact_id:`artifact-${i}`,artifact_available:artifact,artifact_status:artifact?'saved':'unavailable',artifact_sha256:artifact?'b'.repeat(64):null,artifact_limitation:artifact?'':'No preserved artifact',formula_role:'SUPPORTING_ONLY'}));
  return {kind:'supplier',id:'supplier-a',sourceVersion:version,baseContentHash:sha(evidence),provenance:{batch:'synthetic'},profile:{canonical_entity_id:'supplier-a',profile_version_id:'profile-a',display_name:'Synthetic supplier',legal_name:'Synthetic supplier',country_code:'CN',entity_type_code:'company',classification:null,classification_value_class:'MISSING',classification_claim_ids:[],profile_state:'PINNED',readiness_status:'usable_with_limitations',readiness_contract_version:'synthetic',verification_status:'under_review',evidence_count:evidence.length},evidence};
}
const aligned=rows=>alignSupplierReadiness(fixture(rows),code);
test('equivalent product evidence has equivalent semantic mapping across source batches',()=>{
  const a=aligned([['product_families','Steel tubes']]);const b=aligned([['product_categories','Steel tubes']]);
  assert.deepEqual(a.facts.map(f=>[f.field,f.value,f.rule,f.state]),b.facts.map(f=>[f.field,f.value,f.rule,f.state]));
});
test('all fields are explicit even when every fact is unknown; no zero/exclusion',()=>{
  const r=aligned([['capacity','UNKNOWN','UNKNOWN']]);assert.equal(r.classification.scope,'UNKNOWN');
  assert.deepEqual(Object.keys(r.fields),[...READINESS_FIELDS]);assert.ok(Object.values(r.fields).every(f=>f.state==='UNKNOWN'));
  assert.equal(r.readiness.state,'NEEDS_EVIDENCE');assert.equal(r.execution.eligibilityOutcomes,0);
});
test('service/consulting/mixed evidence is retained without forcing Goods',()=>{
  assert.equal(aligned([['main_activity','Freight forwarding services']]).classification.scope,'SERVICES');
  assert.equal(aligned([['main_activity','Management consulting']]).classification.scope,'CONSULTING');
  assert.equal(aligned([['product_categories','Steel parts'],['main_activity','Sourcing agent services']]).classification.scope,'MIXED');
});
test('mixed Goods and Works preserves legacy declared classification',()=>{
  const input=fixture([['classification','GOODS'],['product_families','Cables'],['works_specializations','EPC']]);input.profile.classification='GOODS';
  const r=alignSupplierReadiness(input,code);assert.equal(r.classification.scope,'MIXED');assert.equal(r.classification.sourceClassification,'GOODS');assert.equal(input.profile.classification,'GOODS');
});
test('unsupported supplier names and country cannot establish capability',()=>{
  const input=fixture([]);input.profile.display_name='Global Construction Steel Factory';
  assert.equal(alignSupplierReadiness(input,code).classification.scope,'UNKNOWN');
});
test('backlog and order book stay monetary and never populate capacity candidates',()=>{
  const r=aligned([['capacity','Backlog: PHP 36.85 billion'],['manufacturing_capabilities_capacity','Order book: PLN 17.86 billion']]);
  assert.equal(r.fields.output_capacity.state,'UNKNOWN');assert.equal(r.formulaInputCandidates.typedCapacity.length,0);
  assert.ok(r.facts.every(f=>f.field==='financial_other'));assert.equal(r.facts[0].value.currency!==null,true);
});
test('performance percentages and ratings never become turnover',()=>{
  const r=aligned([['turnover_scale','On-time dispatch rate: 100.0%'],['financial','38% Reorder rate']]);
  assert.equal(r.fields.financial.state,'UNKNOWN');assert.equal(r.facts.length,2);assert.ok(r.facts.every(f=>f.field==='operating_metrics'));
});
test('missing monetary dimensions preserve known amounts and source verification labels',()=>{
  const r=aligned([['turnover_scale','Annual export revenue: 1.5 - 4.4 million (Verified)','INFERRED']]);
  const f=r.facts[0];assert.equal(f.value.normalizedAmount,'1500000');assert.equal(f.value.normalizedMaximum,'4400000');
  assert.equal(f.value.currency,null);assert.equal(f.value.reportingPeriod,null);assert.equal(f.sourceStatus,'INFERRED');assert.equal(f.state,'NEEDS_EVIDENCE');
});
test('bare dollars have unknown currency and unspecified scale has unknown metric',()=>{
  assert.equal(readinessQuantity('$50M-$100M','financial_other').currency,null);
  const q=readinessQuantity('US$2.5 Million - US$5 Million','financial_other');assert.equal(q.currency,'USD');assert.equal(q.metric,null);assert.equal(q.normalizedMaximum,'5000000');
});
test('exact financial periods, metric, qualifiers and decimal scale remain distinct',()=>{
  const q=readinessQuantity('Revenue: PLN 4,262,947 thousand (H1 2026)','financial');
  assert.equal(q.normalizedAmount,'4262947000');assert.equal(q.reportingPeriod,'H1 2026');assert.equal(q.metric,'Revenue');
  assert.equal(readinessQuantity('Revenue: INR 31,149 crore (FY2025-26)','financial').normalizedAmount,'311490000000');
  assert.equal(readinessQuantity('Below US$1 Million','financial_other').qualifier,'Below');
});
test('zero is a known quantity, absence is missing, negative physical figures need review',()=>{
  assert.equal(readinessQuantity('Output: 0 units (2024)','output_capacity').normalizedAmount,'0');
  assert.equal(readinessQuantity('Output unknown','output_capacity').normalizedAmount,null);
  assert.ok(readinessQuantity('Output: -5 units','output_capacity').reasons.includes('NEGATIVE_PHYSICAL_MEASURE'));
});
test('compound facility/workforce/equipment/output metrics split without corrupting thousands',()=>{
  const r=aligned([['manufacturing_capabilities_capacity','4 production lines, 7,000 m2 floor space, 35 production machinery, 101-200 employees, monthly output 100 million units']]);
  assert.equal(r.facts.length,5);assert.deepEqual(r.facts.map(f=>f.field).sort(),['equipment','equipment','facilities','output_capacity','workforce']);
  assert.equal(r.facts.find(f=>f.field==='facilities').value.normalizedAmount,'7000');
  assert.equal(r.facts.find(f=>f.field==='workforce').value.normalizedMaximum,'200');
});
test('competing area numbers are not silently selected',()=>{
  const q=readinessQuantity('15,000 square meters (Facebook) / 6,500 m2 (Alibaba)','facilities');
  assert.equal(q.amount,null);assert.deepEqual(q.observedNumbers,['15,000','6,500']);assert.ok(q.reasons.includes('MULTIPLE_OR_COMPOUND_NUMBERS'));
});
test('printing colors and product liters/tolerance are specifications, not equipment counts/output',()=>{
  const r=aligned([['manufacturing_capabilities_capacity','9-Color Printing Machine; 1L-220L Capacity; Tolerance up to ±0.005mm']]);
  assert.ok(r.facts.every(f=>f.field==='specifications'));assert.equal(r.formulaInputCandidates.typedCapacity.length,0);
  assert.equal(r.facts.find(f=>f.sourceSpan.includes('Tolerance')).value.unit,'mm');
  assert.equal(r.facts.find(f=>f.sourceSpan.includes('220L')).value.maximum,'220');
});
test('HQ, exhibition, client-count and certificate geography do not establish reach',()=>{
  for(const value of ['Southeast Asia (Exhibitor at WePack SEA)','Global (Participated in Russian expo)','EU (CE certified)','Japan (100+ clients served)']){
    const r=aligned([['export_markets',value],['local_presence','Office in Shenzhen, China']]);assert.equal(r.formulaInputCandidates.market.length,0);assert.equal(r.fields.local_presence.state,'MAPPED');
  }
});
test('explicit supported markets map equally in both field conventions',()=>{
  const a=aligned([['export_markets','United States; Canada']]);const b=aligned([['geographic_markets','United States; Canada']]);
  assert.deepEqual(a.facts.map(f=>[f.field,f.value,f.state]),b.facts.map(f=>[f.field,f.value,f.state]));
});
test('plant presence in countries is not capacity or delivery reach',()=>{
  const r=aligned([['capacity','Plant facilities in 12 countries']]);assert.equal(r.formulaInputCandidates.typedCapacity.length,0);assert.equal(r.formulaInputCandidates.market.length,0);assert.equal(r.fields.local_presence.state,'NEEDS_EVIDENCE');
});
test('generic credentials, marketplace badges and inspection services remain unresolved',()=>{
  for(const v of ['Verified by SGS','ISO standards compliance','Alibaba verification badge','TUV/CE/RoHS (inspection services provided)','Authorized Distributor'])assert.equal(aligned([['certifications',v]]).fields.certifications.state,'NEEDS_EVIDENCE');
  assert.equal(aligned([['certifications','ISO 9001','INFERRED']]).facts[0].sourceStatus,'INFERRED');
});
test('embedded named credentials retained without verification upgrade',()=>{
  const r=aligned([['manufacturing_capabilities_capacity','40+ staff, 3600+ sqm factory, ISO 9001 certified','INFERRED']]);
  assert.equal(r.fields.certifications.state,'MAPPED');assert.equal(r.trust.independentlyVerifiedClaims,0);
});
test('ratings, client names/counts, projects counts and years are not comparable contracts',()=>{
  for(const v of ['15 years experience','5200+ successful projects','Fortune 500 companies','Store rating 4.5/5','24 shipments to 10 buyers','Verified purchase from a buyer'])assert.equal(aligned([['project_references',v]]).fields.comparable_contracts.state,'UNKNOWN');
  assert.equal(aligned([['project_references','Contract ID: C-1; Scope: supplied steel tubes; Role: supplier']]).fields.comparable_contracts.state,'MAPPED');
});
test('artifact loss and unknown status cannot become positive Formula input candidates',()=>{
  const r=aligned([['product_categories','Steel tubes','INFERRED',false],['geographic_markets','Global','UNKNOWN']]);
  assert.equal(r.formulaInputCandidates.technical.length,0);assert.equal(r.formulaInputCandidates.market.length,0);assert.equal(r.audit[1].sourceStatus,'UNKNOWN');
});
test('source entities, profile, claim, artifact and status remain immutable and traceable',()=>{
  const input=fixture([['product_categories','Steel tubes']]);const copy=structuredClone(input);const r=alignSupplierReadiness(input,code);
  assert.deepEqual(input,copy);assert.equal(r.audit[0].sourceClaimHash,sha(input.evidence[0]));assert.equal(r.audit[0].externalClaimId,'external-0');
  for(const f of r.facts)assert.ok(r.audit.some(a=>a.claimId===f.sourceClaimId&&a.factIds.includes(f.id)));
});
test('orphan, duplicate, unapproved and unpinned inputs fail closed',()=>{
  const i=fixture([['product_categories','Steel tubes']]);i.evidence[0].canonical_entity_id='other';assert.throws(()=>alignSupplierReadiness(i,code));
  i.evidence[0].canonical_entity_id=i.id;i.evidence[0].field='contact_email';assert.throws(()=>alignSupplierReadiness(i,code));
  i.evidence[0].field='product_categories';i.profile.profile_state='AMBIGUOUS';assert.throws(()=>alignSupplierReadiness(i,code));
});
test('determinism and idempotence reuse without extracting again',()=>{
  const source=[fixture([['product_categories','Steel tubes'],['capacity','Employees: 10 (2024)']])];
  const a=extractOnce(source,code);const b=extractOnce(source,code,a.records);assert.equal(a.extracted,1);assert.equal(b.extracted,0);assert.equal(b.reused,1);assert.deepEqual(a.records,b.records);
  assert.deepEqual(extractOnce([{...source[0],evidence:[...source[0].evidence].reverse()}],code).records,a.records);
});
test('one changed supplier invalidates only that supplier; code changes invalidate all',()=>{
  const a=fixture([['product_categories','Steel tubes']]);const b=fixture([['product_categories','Bags']]);b.id='supplier-b';b.profile.canonical_entity_id=b.id;b.evidence.forEach(e=>e.canonical_entity_id=b.id);
  const cache=extractOnce([a,b],code);a.evidence[0].display_value='Aluminum tubes';
  const run=extractOnce([a,b],code,cache.records);assert.equal(run.extracted,1);assert.equal(run.reused,1);
  assert.equal(extractOnce([a,b],'c'.repeat(64),cache.records).extracted,2);
});
test('tampered cached record fails instead of being trusted',()=>{
  const i=fixture([['product_categories','Steel tubes']]);const r=alignSupplierReadiness(i,code);r.readiness.state='READY';assert.throws(()=>validateSupplierReadiness(r,i,code));
  assert.notEqual(sha(supplierReadinessIdentity(i,code)),sha(supplierReadinessIdentity(i,'d'.repeat(64))));
});
test('clause grammar does not break ranges, thousands or evidence parentheses',()=>{
  assert.deepEqual(readinessClauses('7,000 m2, 100 staff (source A, B); 4 lines'),['7,000 m2','100 staff (source A, B)','4 lines']);
});
test('accepted Stage 2 and Formula engine are byte-for-byte unchanged',()=>{
  for(const path of ['packages/tendermatch/src/input-normalization.ts','packages/tendermatch/src/exploratory-matching.ts','docs/evidence/tendermatch-development-stage2.json']){
    const baseline=execFileSync('git',['show',`c1cdb6fb7070d62602bc44d09abadec4e7c35581:${path}`],{encoding:'utf8',windowsHide:true});
    assert.equal(readFileSync(new URL('../'+path,import.meta.url),'utf8').replaceAll('\r\n','\n'),baseline.replaceAll('\r\n','\n'));
  }
});
test('all-source evidence report covers 117/1553 with no scoring or exclusions',()=>{
  const r=JSON.parse(readFileSync(new URL('../docs/evidence/tendermatch-stage2a-readiness.json',import.meta.url)));
  assert.equal(r.records.length,117);assert.equal(r.records.reduce((n,s)=>n+s.claimAudit.length,0),1553);
  assert.equal(r.groups.neutral100.suppliers,100);assert.equal(r.groups.original17.suppliers,17);
  assert.ok(Object.values(r.groups).every(g=>g.unchangedStatusAndLineage));assert.equal(r.validation.retryExtracted,0);assert.equal(r.validation.retryReused,117);
  assert.equal(r.validation.pairEvaluations,0);assert.equal(r.validation.databaseWrites,0);assert.equal(r.validation.stage3Started,false);
  assert.ok(r.records.every(r=>r.readiness.automatedFieldReview==='COMPLETE'&&r.readiness.humanReview==='NOT_PERFORMED'));
});
test('group summaries preserve source status independently of mapping quality',()=>{
  const i=fixture([['product_categories','Steel tubes','INFERRED']],'v2.1-synthetic');const report=summarizeReadiness([i],[alignSupplierReadiness(i,code)]);
  assert.equal(report.neutral100.sourceStatuses.INFERRED,1);assert.equal(report.neutral100.after.readiness.NEEDS_EVIDENCE,1);
});
test('shipping cartons do not create service scope and truck freight is not truck supply',()=>{
  assert.equal(aligned([['product_categories','Shipping Cartons']]).classification.scope,'GOODS');
  assert.equal(aligned([['product_categories','Air/Truck/Rail/Sea Freight']]).classification.scope,'SERVICES');
  assert.equal(aligned([['product_categories','China to Canada Warehouse Delivery DDP']]).classification.scope,'SERVICES');
});
test('explicit negation never becomes supported physical capability or held credential',()=>{
  const r=aligned([['product_categories','No evidence of steel production'],['certifications','Not certified ISO 9001']]);
  assert.equal(r.classification.scope,'UNKNOWN');assert.equal(r.formulaInputCandidates.technical.length,0);assert.equal(r.fields.certifications.state,'NEEDS_EVIDENCE');
});
test('plus/minus tolerance is not a negative amount or unrelated polymer plus sign',()=>{
  const q=readinessQuantity('Tolerancia +- 0.005mm','specifications');assert.equal(q.amount,'0.005');assert.equal(q.qualifier,'plus/minus');assert.equal(q.unit,'mm');
  assert.equal(readinessQuantity('PE+PE, 0.05-0.25mm thickness','specifications').qualifier,null);
});
test('held area/facility and specification numbers never change type based on batch',()=>{
  for(const field of ['capacity','manufacturing_capabilities_capacity']){
    const r=aligned([[field,'Collaborating factories: 200; 1 production line; 100000hours life span']]);
    assert.equal(r.fields.output_capacity.state,'UNKNOWN');assert.equal(r.facts.find(f=>f.field==='equipment').value.unit,'production line');
  }
});
test('committed realistic audit is bound to the current mapping implementation',async()=>{
  const r=JSON.parse(readFileSync(new URL('../docs/evidence/tendermatch-stage2a-readiness.json',import.meta.url)));
  assert.deepEqual(r.code,await readinessCodeIdentity());
});
