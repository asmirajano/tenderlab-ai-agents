-- Stage 2 additive results-dev only. No source/role/Formula changes.
DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
 OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 OR (SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database())
 IS DISTINCT FROM 'TenderMatch development result store; prepared contract 20260906; branch br-polished-boat-b1qddx0m'
 THEN RAISE EXCEPTION 'Stage 2 development target mismatch'; END IF;
 IF (SELECT array_agg(version ORDER BY version) FROM tendermatch_retrieval.schema_migration)
 IS DISTINCT FROM ARRAY['20260905-retrieval-v1','20260906-all-to-all-dev-v1','20260906-input-manifest-v1']::text[]
 THEN RAISE EXCEPTION 'Stage 2 base migration mismatch'; END IF;
END $$;

CREATE TABLE tendermatch_retrieval.normalization_snapshot (
 tenant_id text NOT NULL, normalization_id text NOT NULL CHECK(normalization_id ~ '^[a-f0-9]{64}$'),
 manifest_id text NOT NULL, identity jsonb NOT NULL CHECK(jsonb_typeof(identity)='object' AND pg_column_size(identity)<8192),
 supplier_count integer NOT NULL CHECK(supplier_count>=0), tender_count integer NOT NULL CHECK(tender_count>=0),
 created_at timestamptz NOT NULL DEFAULT now(), creation_xid xid8 NOT NULL DEFAULT pg_current_xact_id(),
 PRIMARY KEY(tenant_id,normalization_id), UNIQUE(tenant_id,normalization_id,manifest_id),
 FOREIGN KEY(tenant_id,manifest_id) REFERENCES tendermatch_retrieval.input_manifest(tenant_id,manifest_id)
);
CREATE TABLE tendermatch_retrieval.normalization_member (
 tenant_id text NOT NULL, normalization_id text NOT NULL, manifest_id text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('supplier','tender')), entity_id uuid NOT NULL,
 feature_key text NOT NULL, content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
 state text NOT NULL CHECK(state IN ('NORMALIZED','LIMITED','QUARANTINED')),
 reasons jsonb NOT NULL CHECK(jsonb_typeof(reasons)='array' AND pg_column_size(reasons)<4096),
 PRIMARY KEY(tenant_id,normalization_id,kind,entity_id),
 FOREIGN KEY(tenant_id,normalization_id,manifest_id) REFERENCES tendermatch_retrieval.normalization_snapshot(tenant_id,normalization_id,manifest_id),
 FOREIGN KEY(tenant_id,manifest_id,kind,entity_id) REFERENCES tendermatch_retrieval.input_member(tenant_id,manifest_id,kind,entity_id),
 FOREIGN KEY(tenant_id,feature_key) REFERENCES tendermatch_retrieval.normalized_feature(tenant_id,feature_key)
);
CREATE FUNCTION tendermatch_retrieval.guard_normalization_member() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.normalization_snapshot s WHERE s.tenant_id=NEW.tenant_id AND s.normalization_id=NEW.normalization_id AND s.creation_xid=pg_current_xact_id())
 THEN RAISE EXCEPTION 'Committed normalization membership is sealed'; END IF;
 IF NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.normalized_feature f
 JOIN tendermatch_retrieval.input_member p ON p.tenant_id=NEW.tenant_id AND p.manifest_id=NEW.manifest_id AND p.kind=NEW.kind AND p.entity_id=NEW.entity_id
 WHERE f.tenant_id=NEW.tenant_id AND f.feature_key=NEW.feature_key AND f.kind=NEW.kind AND f.entity_id=NEW.entity_id::text AND f.content_hash=NEW.content_hash
 AND f.feature->'inputIdentity'->>'baseContentHash'=p.provenance->>'content_sha256'
 AND f.feature->'normalization'->>'status'=NEW.state AND f.feature->'normalization'->'reasons'=NEW.reasons)
 THEN RAISE EXCEPTION 'Feature association mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER normalization_member_guard BEFORE INSERT ON tendermatch_retrieval.normalization_member FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.guard_normalization_member();
CREATE FUNCTION tendermatch_retrieval.check_normalization_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s integer; t integer; expected_s integer; expected_t integer;
BEGIN
 SELECT supplier_count,tender_count INTO expected_s,expected_t FROM tendermatch_retrieval.input_manifest WHERE tenant_id=NEW.tenant_id AND manifest_id=NEW.manifest_id;
 SELECT count(*) FILTER(WHERE kind='supplier'),count(*) FILTER(WHERE kind='tender') INTO s,t FROM tendermatch_retrieval.normalization_member WHERE tenant_id=NEW.tenant_id AND normalization_id=NEW.normalization_id;
 IF s<>NEW.supplier_count OR t<>NEW.tender_count OR s<>expected_s OR t<>expected_t THEN RAISE EXCEPTION 'Incomplete normalization membership'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER normalization_complete AFTER INSERT ON tendermatch_retrieval.normalization_snapshot DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_normalization_complete();
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['normalization_snapshot','normalization_member'] LOOP
  EXECUTE format('ALTER TABLE tendermatch_retrieval.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('CREATE POLICY tenant_isolation ON tendermatch_retrieval.%I USING (tenant_id=current_setting(''tendermatch.tenant_id'',true)) WITH CHECK (tenant_id=current_setting(''tendermatch.tenant_id'',true))',n);
  EXECUTE format('CREATE TRIGGER immutable_normalization BEFORE UPDATE OR DELETE ON tendermatch_retrieval.%I FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change()',n);
  EXECUTE format('REVOKE ALL ON tendermatch_retrieval.%I FROM PUBLIC',n);
  EXECUTE format('GRANT SELECT,INSERT ON tendermatch_retrieval.%I TO tendermatch_result_writer',n);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION tendermatch_retrieval.guard_normalization_member(),tendermatch_retrieval.check_normalization_complete() FROM PUBLIC;
INSERT INTO tendermatch_retrieval.schema_migration(version) VALUES('20260906-normalization-v1');
