-- Stage 1 only: compact, immutable input boundaries; no evaluation runs or scores.
-- Caller supplies exact development connection and runs this in one transaction.
DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
 OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 OR (SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database())
 IS DISTINCT FROM 'TenderMatch development result store; prepared contract 20260906; branch br-polished-boat-b1qddx0m'
 THEN RAISE EXCEPTION 'Stage 1 development target mismatch'; END IF;
 IF (SELECT array_agg(version ORDER BY version) FROM tendermatch_retrieval.schema_migration)
 IS DISTINCT FROM ARRAY['20260905-retrieval-v1','20260906-all-to-all-dev-v1']::text[]
 THEN RAISE EXCEPTION 'Stage 1 base migration mismatch'; END IF;
END $$;

CREATE TABLE tendermatch_retrieval.input_manifest (
 tenant_id text NOT NULL, manifest_id text NOT NULL CHECK(manifest_id ~ '^[a-f0-9]{64}$'),
 contract_version text NOT NULL CHECK(contract_version='tendermatch-input-manifest/1.0.0'),
 identity jsonb NOT NULL CHECK(jsonb_typeof(identity)='object' AND pg_column_size(identity)<16384),
 supplier_count integer NOT NULL CHECK(supplier_count>=0), tender_count integer NOT NULL CHECK(tender_count>=0),
 potential_pairs bigint GENERATED ALWAYS AS (supplier_count::bigint*tender_count::bigint) STORED,
 created_at timestamptz NOT NULL DEFAULT now(), creation_xid xid8 NOT NULL DEFAULT pg_current_xact_id(),
 PRIMARY KEY(tenant_id,manifest_id)
);
CREATE TABLE tendermatch_retrieval.input_member (
 tenant_id text NOT NULL, manifest_id text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('supplier','tender')), entity_id uuid NOT NULL,
 provenance jsonb NOT NULL CHECK(jsonb_typeof(provenance)='object' AND pg_column_size(provenance)<4096),
 PRIMARY KEY(tenant_id,manifest_id,kind,entity_id),
 FOREIGN KEY(tenant_id,manifest_id) REFERENCES tendermatch_retrieval.input_manifest(tenant_id,manifest_id)
);
CREATE TABLE tendermatch_retrieval.input_capture (
 tenant_id text NOT NULL, capture_id text NOT NULL CHECK(capture_id ~ '^[a-f0-9]{64}$'), manifest_id text NOT NULL,
 observations jsonb NOT NULL CHECK(jsonb_typeof(observations)='object' AND pg_column_size(observations)<32768),
 registered_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,capture_id),
 FOREIGN KEY(tenant_id,manifest_id) REFERENCES tendermatch_retrieval.input_manifest(tenant_id,manifest_id)
);
CREATE INDEX input_capture_manifest ON tendermatch_retrieval.input_capture(tenant_id,manifest_id,registered_at);

CREATE FUNCTION tendermatch_retrieval.guard_input_member_insert() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.input_manifest m
 WHERE m.tenant_id=NEW.tenant_id AND m.manifest_id=NEW.manifest_id AND m.creation_xid=pg_current_xact_id())
 THEN RAISE EXCEPTION 'Committed input membership is sealed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER input_member_same_transaction BEFORE INSERT ON tendermatch_retrieval.input_member
 FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.guard_input_member_insert();
CREATE FUNCTION tendermatch_retrieval.check_input_membership_complete() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s integer; t integer;
BEGIN
 SELECT count(*) FILTER(WHERE kind='supplier'),count(*) FILTER(WHERE kind='tender') INTO s,t
 FROM tendermatch_retrieval.input_member WHERE tenant_id=NEW.tenant_id AND manifest_id=NEW.manifest_id;
 IF s<>NEW.supplier_count OR t<>NEW.tender_count THEN RAISE EXCEPTION 'Incomplete input manifest membership'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER input_membership_complete AFTER INSERT ON tendermatch_retrieval.input_manifest
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_input_membership_complete();
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['input_manifest','input_member','input_capture'] LOOP
  EXECUTE format('ALTER TABLE tendermatch_retrieval.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('CREATE POLICY tenant_isolation ON tendermatch_retrieval.%I USING (tenant_id=current_setting(''tendermatch.tenant_id'',true)) WITH CHECK (tenant_id=current_setting(''tendermatch.tenant_id'',true))',n);
  EXECUTE format('CREATE TRIGGER immutable_input BEFORE UPDATE OR DELETE ON tendermatch_retrieval.%I FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change()',n);
  EXECUTE format('REVOKE ALL ON tendermatch_retrieval.%I FROM PUBLIC',n);
  EXECUTE format('GRANT SELECT,INSERT ON tendermatch_retrieval.%I TO tendermatch_result_writer',n);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION tendermatch_retrieval.guard_input_member_insert(),tendermatch_retrieval.check_input_membership_complete() FROM PUBLIC;
INSERT INTO tendermatch_retrieval.schema_migration(version) VALUES('20260906-input-manifest-v1');

