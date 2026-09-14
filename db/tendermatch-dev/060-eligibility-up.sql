-- Stage 3: additive, development-only scope ledger; existing Formula tables untouched.
DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
 OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 OR (SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database())
 IS DISTINCT FROM 'TenderMatch development result store; prepared contract 20260906; branch br-polished-boat-b1qddx0m'
 THEN RAISE EXCEPTION 'Stage 3 development target mismatch'; END IF;
 IF (SELECT array_agg(version ORDER BY version) FROM tendermatch_retrieval.schema_migration)
 IS DISTINCT FROM ARRAY['20260905-retrieval-v1','20260906-all-to-all-dev-v1','20260906-input-manifest-v1','20260906-normalization-v1']::text[]
 THEN RAISE EXCEPTION 'Stage 3 base migration mismatch'; END IF;
END $$;

CREATE TABLE tendermatch_retrieval.eligibility_input (
 tenant_id text NOT NULL,input_key bytea NOT NULL CHECK(octet_length(input_key)=32),
 kind text NOT NULL CHECK(kind IN ('supplier','tender')),entity_id uuid NOT NULL,
 feature_key text NOT NULL,projection jsonb NOT NULL CHECK(pg_column_size(projection)<32768),
 PRIMARY KEY(tenant_id,input_key),UNIQUE(tenant_id,input_key,kind,entity_id),
 FOREIGN KEY(tenant_id,feature_key) REFERENCES tendermatch_retrieval.normalized_feature(tenant_id,feature_key)
);
CREATE TABLE tendermatch_retrieval.eligibility_run (
 tenant_id text NOT NULL,run_id text NOT NULL CHECK(run_id ~ '^[a-f0-9]{64}$'),
 policy_hash bytea NOT NULL CHECK(octet_length(policy_hash)=32),
 normalization_id text NOT NULL,identity jsonb NOT NULL CHECK(pg_column_size(identity)<16384),
 supplier_count integer NOT NULL CHECK(supplier_count>0),tender_count integer NOT NULL CHECK(tender_count>0),
 expected_pairs bigint GENERATED ALWAYS AS(supplier_count::bigint*tender_count::bigint) STORED,
 creation_xid xid8 NOT NULL DEFAULT pg_current_xact_id(),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,run_id),
 FOREIGN KEY(tenant_id,normalization_id) REFERENCES tendermatch_retrieval.normalization_snapshot(tenant_id,normalization_id)
);
CREATE TABLE tendermatch_retrieval.eligibility_member (
 tenant_id text NOT NULL,run_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('supplier','tender')),
 entity_id uuid NOT NULL,input_key bytea NOT NULL,
 PRIMARY KEY(tenant_id,run_id,kind,entity_id),UNIQUE(tenant_id,run_id,kind,input_key),
 FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.eligibility_run(tenant_id,run_id),
 FOREIGN KEY(tenant_id,input_key,kind,entity_id) REFERENCES tendermatch_retrieval.eligibility_input(tenant_id,input_key,kind,entity_id)
);
-- One reusable outcome per input pair and policy; no duplicated full run matrix.
-- Integer dictionaries are immutable within schema/policy 1.0.0. No score columns.
CREATE TABLE tendermatch_retrieval.eligibility_pair (
 tenant_id text NOT NULL,policy_hash bytea NOT NULL CHECK(octet_length(policy_hash)=32),
 supplier_key bytea NOT NULL,tender_key bytea NOT NULL,
 state smallint NOT NULL CHECK(state BETWEEN 0 AND 4),reasons integer NOT NULL CHECK(reasons BETWEEN 1 AND 16383),
 hard_gate smallint NOT NULL CHECK(hard_gate BETWEEN 0 AND 2),
 scope_relation smallint NOT NULL CHECK(scope_relation BETWEEN 0 AND 3),
 service_potential smallint NOT NULL CHECK(service_potential BETWEEN 0 AND 1),
 PRIMARY KEY(tenant_id,policy_hash,supplier_key,tender_key),
 FOREIGN KEY(tenant_id,supplier_key) REFERENCES tendermatch_retrieval.eligibility_input(tenant_id,input_key),
 FOREIGN KEY(tenant_id,tender_key) REFERENCES tendermatch_retrieval.eligibility_input(tenant_id,input_key),
 CHECK((state=0 AND scope_relation=3) OR state<>0),
 CHECK((state=4 AND hard_gate=2 AND (reasons & 2048)=2048) OR state<>4),
 CHECK(state<>3 OR (hard_gate=0 AND scope_relation=1)),
 CHECK(service_potential=0 OR state=0)
);
CREATE TABLE tendermatch_retrieval.eligibility_completion (
 tenant_id text NOT NULL,run_id text NOT NULL,outcome_hash text NOT NULL CHECK(outcome_hash ~ '^[a-f0-9]{64}$'),
 pair_count bigint NOT NULL,counts jsonb NOT NULL CHECK(pg_column_size(counts)<131072),
 completed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,run_id),
 FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.eligibility_run(tenant_id,run_id)
);
CREATE FUNCTION tendermatch_retrieval.guard_eligibility_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.eligibility_run r
 JOIN tendermatch_retrieval.normalization_member n ON n.tenant_id=r.tenant_id AND n.normalization_id=r.normalization_id
 JOIN tendermatch_retrieval.eligibility_input i ON i.tenant_id=n.tenant_id AND i.feature_key=n.feature_key
 WHERE r.tenant_id=NEW.tenant_id AND r.run_id=NEW.run_id AND r.creation_xid=pg_current_xact_id()
 AND n.kind=NEW.kind AND n.entity_id=NEW.entity_id AND i.input_key=NEW.input_key)
 THEN RAISE EXCEPTION 'Eligibility membership sealed or not pinned to normalization'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER eligibility_member_guard BEFORE INSERT ON tendermatch_retrieval.eligibility_member FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.guard_eligibility_member();
CREATE FUNCTION tendermatch_retrieval.check_eligibility_membership() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s integer;t integer;es integer;et integer; BEGIN
 SELECT count(*) FILTER(WHERE kind='supplier'),count(*) FILTER(WHERE kind='tender') INTO s,t FROM tendermatch_retrieval.eligibility_member WHERE tenant_id=NEW.tenant_id AND run_id=NEW.run_id;
 SELECT supplier_count,tender_count INTO es,et FROM tendermatch_retrieval.normalization_snapshot WHERE tenant_id=NEW.tenant_id AND normalization_id=NEW.normalization_id;
 IF s<>NEW.supplier_count OR t<>NEW.tender_count OR s<>es OR t<>et THEN RAISE EXCEPTION 'Incomplete pinned eligibility membership'; END IF;
 RETURN NEW; END $$;
CREATE CONSTRAINT TRIGGER eligibility_membership_complete AFTER INSERT ON tendermatch_retrieval.eligibility_run DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_eligibility_membership();
CREATE FUNCTION tendermatch_retrieval.check_eligibility_completion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual bigint;expected bigint; BEGIN
 SELECT expected_pairs INTO expected FROM tendermatch_retrieval.eligibility_run WHERE tenant_id=NEW.tenant_id AND run_id=NEW.run_id;
 SELECT count(*) INTO actual FROM tendermatch_retrieval.eligibility_run r
 JOIN tendermatch_retrieval.eligibility_member s ON s.tenant_id=r.tenant_id AND s.run_id=r.run_id AND s.kind='supplier'
 JOIN tendermatch_retrieval.eligibility_pair p ON p.tenant_id=r.tenant_id AND p.policy_hash=r.policy_hash AND p.supplier_key=s.input_key
 JOIN tendermatch_retrieval.eligibility_member t ON t.tenant_id=r.tenant_id AND t.run_id=r.run_id AND t.kind='tender' AND t.input_key=p.tender_key
 WHERE r.tenant_id=NEW.tenant_id AND r.run_id=NEW.run_id;
 IF actual<>expected OR actual<>NEW.pair_count THEN RAISE EXCEPTION 'Incomplete unique eligibility universe'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER eligibility_complete BEFORE INSERT ON tendermatch_retrieval.eligibility_completion FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_eligibility_completion();
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['eligibility_input','eligibility_run','eligibility_member','eligibility_pair','eligibility_completion'] LOOP
  EXECUTE format('ALTER TABLE tendermatch_retrieval.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('CREATE POLICY tenant_isolation ON tendermatch_retrieval.%I USING (tenant_id=current_setting(''tendermatch.tenant_id'',true)) WITH CHECK (tenant_id=current_setting(''tendermatch.tenant_id'',true))',n);
  EXECUTE format('CREATE TRIGGER immutable_eligibility BEFORE UPDATE OR DELETE ON tendermatch_retrieval.%I FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change()',n);
  EXECUTE format('REVOKE ALL ON tendermatch_retrieval.%I FROM PUBLIC',n);
  EXECUTE format('GRANT SELECT,INSERT ON tendermatch_retrieval.%I TO tendermatch_result_writer',n);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION tendermatch_retrieval.guard_eligibility_member(),tendermatch_retrieval.check_eligibility_membership(),tendermatch_retrieval.check_eligibility_completion() FROM PUBLIC;
INSERT INTO tendermatch_retrieval.schema_migration(version) VALUES('20260906-eligibility-v1');
