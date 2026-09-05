-- Synthetic schema-compatible fixtures only; no real company data or credentials.
CREATE ROLE neondb_owner SUPERUSER;
CREATE SCHEMA registry;
CREATE TABLE registry.entities(id uuid PRIMARY KEY,entity_type_code text,legal_name text,trading_name text,country_code text,verification_status text);
CREATE TABLE registry.import_batches(id uuid PRIMARY KEY,batch_code text);
CREATE TABLE registry.supplier_profile_versions(id uuid PRIMARY KEY,entity_id uuid,batch_id uuid,version_code text,readiness_status text,readiness_contract_version text,verification_status text);
ALTER TABLE registry.supplier_profile_versions ADD COLUMN public_business_contacts jsonb;
CREATE TABLE registry.source_records(id uuid PRIMARY KEY,batch_id uuid,raw_payload jsonb);
CREATE TABLE registry.source_artifacts(id uuid PRIMARY KEY,batch_id uuid,entity_id uuid,retrieval_status text,artifact_sha256 text,raw_content text);
CREATE TABLE registry.entity_claims(id uuid PRIMARY KEY,entity_id uuid,profile_version_id uuid,external_claim_id text,claim_key text,raw_value text,normalized_value jsonb,source_assertion_status text,claim_status text,source_record_id uuid,source_system text,retrieved_at timestamptz,source_artifact_id uuid);
CREATE SCHEMA tendermatch_supplier_api;
CREATE VIEW tendermatch_supplier_api.current_supplier_profiles AS SELECT i FROM generate_series(1,17) i;
INSERT INTO registry.entities SELECT ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'company','Synthetic company '||i,NULL,'XX','under_review' FROM generate_series(1,117) i;
INSERT INTO registry.entities VALUES('00000000-0000-0000-0000-999999999999','person','Not a company',NULL,'XX','under_review');
INSERT INTO registry.import_batches VALUES
 ('10000000-0000-0000-0000-000000000001','accio-neutral-suppliers-2026-09-01-v2.1-policy-corrected'),
 ('10000000-0000-0000-0000-000000000002','accio-goods-works-suppliers-2026-09-01-v1.3-critical-evidence-corrected-db-staged'),
 ('10000000-0000-0000-0000-000000000003','unapproved-future');
INSERT INTO registry.supplier_profile_versions(id,entity_id,batch_id,version_code,readiness_status,readiness_contract_version,verification_status)
 SELECT ('20000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,id,
   '10000000-0000-0000-0000-000000000001','v2.1-policy-corrected-2026-09-01','usable_with_limitations','legacy','under_review'
 FROM (SELECT *,row_number() OVER(ORDER BY id) i FROM registry.entities WHERE entity_type_code='company' ORDER BY id LIMIT 116) e;
-- Company 116 has two allowed pins: ambiguous, not silently latest-wins.
INSERT INTO registry.supplier_profile_versions(id,entity_id,batch_id,version_code,readiness_status,readiness_contract_version,verification_status) VALUES
 ('20000000-0000-0000-0000-000000000999','00000000-0000-0000-0000-000000000116','10000000-0000-0000-0000-000000000002','v1.3-critical-evidence-corrected-2026-09-01','usable_with_limitations','v1.3','under_review'),
 ('20000000-0000-0000-0000-000000000998','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','newest-but-unapproved','ready_for_exploratory_matching','future','under_review');
INSERT INTO registry.source_records VALUES('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','{"private":"DO_NOT_EXPOSE"}');
INSERT INTO registry.source_artifacts VALUES('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','saved',repeat('a',64),'DO_NOT_EXPOSE');
INSERT INTO registry.entity_claims
 SELECT ('50000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',NULL,k,v,
 '{"private":"DO_NOT_EXPOSE"}',s,'INFERRED','30000000-0000-0000-0000-000000000001','synthetic','2026-09-01T00:00:00Z',
 CASE WHEN i=2 THEN '40000000-0000-0000-0000-000000000001'::uuid ELSE NULL END
 FROM (VALUES(1,'classification','GOODS','STATED_UNVERIFIED'),(2,'product_families','Refrigerators','STATED_UNVERIFIED'),
 (3,'capacity','UNKNOWN','UNKNOWN'),(4,'operating_geography','Global',NULL),
 (5,'contact_email','DO_NOT_EXPOSE','STATED_UNVERIFIED'),(6,'private_notes','DO_NOT_EXPOSE','STATED_UNVERIFIED'),
 (7,'financial','Annual revenue: synthetic statement','INFERRED'),
 (8,'manufacturing_capabilities_capacity','Synthetic manufacturing capacity','INFERRED'),
 (9,'products_portfolio','Synthetic products','INFERRED'),
 (10,'turnover_scale','Synthetic scale, not a comparable threshold','INFERRED'),
 (11,'export_markets','Synthetic export market','INFERRED'),
 (12,'materials_specs','Synthetic materials','INFERRED')) rows(i,k,v,s);
REVOKE ALL ON SCHEMA registry FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
