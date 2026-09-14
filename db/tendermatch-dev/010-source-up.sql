-- Additive contract only. No changes to registry or the existing 17-profile API.
-- Fail on pre-existing names; do not adopt an unknown schema or role.
CREATE ROLE tendermatch_all_supplier_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE SCHEMA tendermatch_all_supplier_api AUTHORIZATION neondb_owner;
REVOKE ALL ON SCHEMA tendermatch_all_supplier_api FROM PUBLIC;
CREATE TABLE tendermatch_all_supplier_api.approved_company_ids_v1 (canonical_entity_id uuid PRIMARY KEY);
INSERT INTO tendermatch_all_supplier_api.approved_company_ids_v1
SELECT id FROM registry.entities WHERE entity_type_code='company';

-- Private helper: ambiguous pins are deliberately not resolved by date or LIMIT 1.
CREATE VIEW tendermatch_all_supplier_api.pinned_profiles_v1 WITH (security_barrier=true) AS
SELECT p.id, p.entity_id, p.version_code, p.batch_id, b.batch_code,
       p.readiness_status, p.readiness_contract_version, p.verification_status,
       count(*) OVER (PARTITION BY p.entity_id) AS candidate_count
FROM registry.supplier_profile_versions p
JOIN registry.import_batches b ON b.id=p.batch_id
JOIN tendermatch_all_supplier_api.approved_company_ids_v1 i ON i.canonical_entity_id=p.entity_id
WHERE (b.batch_code, p.version_code) IN (
 ('accio-neutral-suppliers-2026-09-01-v2.1-policy-corrected','v2.1-policy-corrected-2026-09-01'),
 ('accio-goods-works-suppliers-2026-09-01-v1.3-critical-evidence-corrected-db-staged','v1.3-critical-evidence-corrected-2026-09-01')
);

CREATE VIEW tendermatch_all_supplier_api.supplier_evidence_v1 WITH (security_barrier=true) AS
SELECT 'tendermatch-all-company-read/1.0.0'::text AS contract_version,
       c.entity_id AS canonical_entity_id, c.profile_version_id, p.version_code AS profile_version,
       p.batch_id, p.batch_code, c.id AS claim_id, c.external_claim_id,
       c.claim_key AS source_field,
       CASE c.claim_key WHEN 'operating_geography' THEN 'geographic_markets' ELSE c.claim_key END AS field,
       c.raw_value AS display_value,
       COALESCE(c.source_assertion_status,c.claim_status,'UNKNOWN') AS status,
       CASE WHEN COALESCE(c.source_assertion_status,c.claim_status,'UNKNOWN')='UNKNOWN' OR c.raw_value IS NULL
            OR lower(trim(c.raw_value)) IN ('','unknown','n/a') THEN 'MISSING' ELSE 'SOURCE' END AS value_class,
       c.source_record_id, c.source_system, c.retrieved_at,
       -- Artifact IDs/hashes only: no local paths, raw content, contact fields,
       -- arbitrary nested JSON, notes, or potentially credential-bearing URLs.
       a.id AS source_artifact_id,
       COALESCE(a.retrieval_status='saved' AND a.artifact_sha256 IS NOT NULL,false) AS artifact_available,
       COALESCE(a.retrieval_status,'not_linked') AS artifact_status, a.artifact_sha256,
       CASE WHEN a.retrieval_status='saved' AND a.artifact_sha256 IS NOT NULL THEN NULL
            WHEN a.id IS NULL THEN 'NO_EXACT_ARTIFACT_LINK' ELSE 'ARTIFACT_UNAVAILABLE' END AS artifact_limitation,
       CASE WHEN c.claim_key IN ('product_families','works_specializations','industries_served','materials','capacity','geographic_markets','operating_geography')
            THEN 'FORMULA_OPERAND' ELSE 'SUPPORTING_ONLY' END AS formula_role
FROM registry.entity_claims c
JOIN tendermatch_all_supplier_api.pinned_profiles_v1 p ON p.id=c.profile_version_id AND p.entity_id=c.entity_id AND p.candidate_count=1
JOIN registry.source_records sr ON sr.id=c.source_record_id AND sr.batch_id=p.batch_id
LEFT JOIN registry.source_artifacts a ON a.id=c.source_artifact_id AND a.batch_id=p.batch_id AND a.entity_id=c.entity_id
WHERE c.claim_key IN (
 'classification','product_families','works_specializations','industries_served','materials',
 'certifications','geographic_markets','capacity','financial',
 'main_activity','operating_geography','identity_company_type',
 'manufacturing_capabilities_capacity','products_portfolio','product_categories','materials_specs',
 'export_markets','installation_after_sales','local_presence','moq_lead_time_incoterms',
 'project_references','turnover_scale','compliance_risks'
);

CREATE VIEW tendermatch_all_supplier_api.supplier_profiles_v1 WITH (security_barrier=true) AS
SELECT 'tendermatch-all-company-read/1.0.0'::text AS contract_version,
       e.id AS canonical_entity_id, e.legal_name, COALESCE(NULLIF(e.trading_name,''),e.legal_name) AS display_name,
       e.country_code, e.entity_type_code, e.verification_status,
       p.id AS profile_version_id, p.version_code AS profile_version, p.batch_id, p.batch_code,
       COALESCE(pc.candidate_count,0)::integer AS profile_candidate_count,
       CASE WHEN pc.candidate_count IS NULL THEN 'MISSING' WHEN pc.candidate_count>1 THEN 'AMBIGUOUS' ELSE 'PINNED' END AS profile_state,
       p.readiness_status, p.readiness_contract_version,
       -- Classification must be a unique, explicit usable claim; never inferred from a name/activity.
       CASE WHEN cl.values_count=1 THEN cl.classification ELSE NULL END AS classification,
       CASE WHEN cl.values_count=1 THEN 'SOURCE' ELSE 'MISSING' END AS classification_value_class,
       COALESCE(cl.claim_ids,ARRAY[]::uuid[]) AS classification_claim_ids,
       CASE WHEN cl.values_count>1 THEN 'CONFLICTING_CLASSIFICATION' WHEN cl.values_count=0 THEN 'CLASSIFICATION_MISSING' ELSE NULL END AS classification_limitation,
       (SELECT count(*)::integer FROM tendermatch_all_supplier_api.supplier_evidence_v1 ev WHERE ev.canonical_entity_id=e.id) AS evidence_count
FROM tendermatch_all_supplier_api.approved_company_ids_v1 i
JOIN registry.entities e ON e.id=i.canonical_entity_id AND e.entity_type_code='company'
LEFT JOIN (SELECT entity_id,max(candidate_count) AS candidate_count FROM tendermatch_all_supplier_api.pinned_profiles_v1 GROUP BY entity_id) pc ON pc.entity_id=e.id
LEFT JOIN tendermatch_all_supplier_api.pinned_profiles_v1 p ON p.entity_id=e.id AND p.candidate_count=1
LEFT JOIN LATERAL (
 SELECT count(DISTINCT upper(trim(ev.display_value))) AS values_count,
        min(upper(trim(ev.display_value))) AS classification, array_agg(ev.claim_id ORDER BY ev.claim_id) AS claim_ids
 FROM tendermatch_all_supplier_api.supplier_evidence_v1 ev
 WHERE ev.canonical_entity_id=e.id AND ev.field='classification' AND ev.value_class='SOURCE'
   AND upper(trim(ev.display_value)) IN ('GOODS','WORKS')
) cl ON true;

CREATE VIEW tendermatch_all_supplier_api.current_supplier_profiles AS SELECT * FROM tendermatch_all_supplier_api.supplier_profiles_v1;
CREATE VIEW tendermatch_all_supplier_api.current_supplier_evidence AS SELECT * FROM tendermatch_all_supplier_api.supplier_evidence_v1;
CREATE VIEW tendermatch_all_supplier_api.contract_manifest_v1 AS
SELECT 'tendermatch-all-company-read/1.0.0'::text AS contract_version,117::integer AS expected_company_count,
       (SELECT count(*)::integer FROM registry.entities WHERE entity_type_code='company') AS source_company_count,
       (SELECT count(*)::integer FROM tendermatch_all_supplier_api.current_supplier_profiles) AS profile_count,
       (SELECT count(*)::integer FROM tendermatch_all_supplier_api.current_supplier_evidence) AS evidence_count,
       (SELECT md5(string_agg(canonical_entity_id::text,',' ORDER BY canonical_entity_id)) FROM tendermatch_all_supplier_api.approved_company_ids_v1) AS pinned_id_checksum,
       (SELECT md5(string_agg(id::text,',' ORDER BY id)) FROM registry.entities WHERE entity_type_code='company') AS source_id_checksum;

REVOKE ALL ON ALL TABLES IN SCHEMA tendermatch_all_supplier_api FROM PUBLIC;
GRANT USAGE ON SCHEMA tendermatch_all_supplier_api TO tendermatch_all_supplier_reader;
GRANT SELECT ON tendermatch_all_supplier_api.supplier_profiles_v1,tendermatch_all_supplier_api.supplier_evidence_v1,
 tendermatch_all_supplier_api.current_supplier_profiles,tendermatch_all_supplier_api.current_supplier_evidence,
 tendermatch_all_supplier_api.contract_manifest_v1 TO tendermatch_all_supplier_reader;
COMMENT ON SCHEMA tendermatch_all_supplier_api IS 'TenderMatch development-only all-company read/1.0.0; not the preserved 17-profile consumer API';
