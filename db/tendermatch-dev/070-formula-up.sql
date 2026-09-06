-- Stage 4 additive development scoring. Apply within BEGIN / COMMIT after attestation.
DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
 OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 OR (SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database())
 IS DISTINCT FROM 'TenderMatch development result store; prepared contract 20260906; branch br-polished-boat-b1qddx0m'
 THEN RAISE EXCEPTION 'Stage 4 development target mismatch'; END IF;
 IF (SELECT array_agg(version ORDER BY version) FROM tendermatch_retrieval.schema_migration)
 IS DISTINCT FROM ARRAY['20260905-retrieval-v1','20260906-all-to-all-dev-v1','20260906-eligibility-v1','20260906-input-manifest-v1','20260906-normalization-v1']::text[]
 THEN RAISE EXCEPTION 'Stage 4 base migration mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.eligibility_completion WHERE run_id='7b3fbc39a401a72a6452c1d9bb050c18bc92d32a0f69acb4829f0a42236e102d' AND pair_count=2027961 AND outcome_hash='9afc0bf6971a5c0ece68ea1aea01a7f14731cee03ec77e8179e0a6d618d8434a')
 THEN RAISE EXCEPTION 'Approved Stage 3 completion absent'; END IF;
END $$;
CREATE TABLE tendermatch_retrieval.formula_input (
 tenant_id text NOT NULL,input_key bytea NOT NULL CHECK(octet_length(input_key)=32),
 eligibility_key bytea NOT NULL,kind text NOT NULL CHECK(kind IN ('supplier','tender')),entity_id uuid NOT NULL,
 projection jsonb NOT NULL CHECK(pg_column_size(projection)<262144),
 PRIMARY KEY(tenant_id,input_key),UNIQUE(tenant_id,input_key,kind,entity_id),
 FOREIGN KEY(tenant_id,eligibility_key,kind,entity_id) REFERENCES tendermatch_retrieval.eligibility_input(tenant_id,input_key,kind,entity_id)
);
CREATE TABLE tendermatch_retrieval.formula_run (
 tenant_id text NOT NULL,run_id text NOT NULL CHECK(run_id ~ '^[a-f0-9]{64}$'),
 policy_hash bytea NOT NULL CHECK(octet_length(policy_hash)=32),
 stage3_run_id text NOT NULL,identity jsonb NOT NULL CHECK(pg_column_size(identity)<16384),
 supplier_count int NOT NULL CHECK(supplier_count>0),tender_count int NOT NULL CHECK(tender_count>0),
 expected_scored bigint NOT NULL CHECK(expected_scored>0),
 formula_version text NOT NULL CHECK(formula_version='tendermatch-match-formula/1.1.0'),
 adapter_version text NOT NULL CHECK(adapter_version='tendermatch-stage2a-formula-adapter/1.0.0'),
 creation_xid xid8 NOT NULL DEFAULT pg_current_xact_id(),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,run_id),
 FOREIGN KEY(tenant_id,stage3_run_id) REFERENCES tendermatch_retrieval.eligibility_completion(tenant_id,run_id)
);
CREATE INDEX formula_run_policy ON tendermatch_retrieval.formula_run(tenant_id,policy_hash);
CREATE TABLE tendermatch_retrieval.formula_member (
 tenant_id text NOT NULL,run_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('supplier','tender')),
 entity_id uuid NOT NULL,input_key bytea NOT NULL,
 PRIMARY KEY(tenant_id,run_id,kind,entity_id),UNIQUE(tenant_id,run_id,kind,input_key),
 FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.formula_run(tenant_id,run_id),
 FOREIGN KEY(tenant_id,input_key,kind,entity_id) REFERENCES tendermatch_retrieval.formula_input(tenant_id,input_key,kind,entity_id)
);
-- Versioned arrays retain every criterion, including NULL fit and zero Missing points.
CREATE TABLE tendermatch_retrieval.formula_pair (
 tenant_id text NOT NULL,policy_hash bytea NOT NULL CHECK(octet_length(policy_hash)=32),
 supplier_key bytea NOT NULL,tender_key bytea NOT NULL,
 pair_score smallint NOT NULL CHECK(pair_score BETWEEN 0 AND 100),
 data_coverage smallint NOT NULL CHECK(data_coverage BETWEEN 0 AND 100),
 assessed_fit smallint NOT NULL CHECK(assessed_fit BETWEEN 0 AND 100),
 evidence_confidence smallint NOT NULL CHECK(evidence_confidence BETWEEN 0 AND 100),
 denominator smallint NOT NULL DEFAULT 100 CHECK(denominator=100),
 fit smallint[] NOT NULL,states smallint[] NOT NULL,points smallint[] NOT NULL,max_points smallint[] NOT NULL,
 confidence smallint[] NOT NULL,ref_groups smallint[] NOT NULL,limitation_masks smallint[] NOT NULL,
 limitation smallint NOT NULL CHECK(limitation BETWEEN 0 AND 4),
 evaluated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,policy_hash,supplier_key,tender_key),
 FOREIGN KEY(tenant_id,supplier_key) REFERENCES tendermatch_retrieval.formula_input(tenant_id,input_key),
 FOREIGN KEY(tenant_id,tender_key) REFERENCES tendermatch_retrieval.formula_input(tenant_id,input_key)
);
CREATE INDEX formula_pair_tender ON tendermatch_retrieval.formula_pair(tenant_id,policy_hash,tender_key,supplier_key);
CREATE TABLE tendermatch_retrieval.formula_completion (
 tenant_id text NOT NULL,run_id text NOT NULL,outcome_hash text NOT NULL CHECK(outcome_hash ~ '^[a-f0-9]{64}$'),
 scored_count bigint NOT NULL,unscored_count bigint NOT NULL,counts jsonb NOT NULL CHECK(pg_column_size(counts)<262144),
 completed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,run_id),
 FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.formula_run(tenant_id,run_id)
);
CREATE FUNCTION tendermatch_retrieval.guard_formula_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.formula_run r
 JOIN tendermatch_retrieval.eligibility_member m ON m.tenant_id=r.tenant_id AND m.run_id=r.stage3_run_id
 JOIN tendermatch_retrieval.formula_input i ON i.tenant_id=m.tenant_id AND i.eligibility_key=m.input_key
 WHERE r.tenant_id=NEW.tenant_id AND r.run_id=NEW.run_id AND r.creation_xid=pg_current_xact_id()
 AND m.kind=NEW.kind AND m.entity_id=NEW.entity_id AND i.input_key=NEW.input_key)
 THEN RAISE EXCEPTION 'Formula membership sealed or outside Stage 3 pin'; END IF; RETURN NEW; END $$;
CREATE TRIGGER formula_member_guard BEFORE INSERT ON tendermatch_retrieval.formula_member FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.guard_formula_member();
CREATE FUNCTION tendermatch_retrieval.check_formula_membership() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s int;t int;es int;et int;ec bigint; BEGIN
 SELECT count(*) FILTER(WHERE kind='supplier'),count(*) FILTER(WHERE kind='tender') INTO s,t FROM tendermatch_retrieval.formula_member WHERE tenant_id=NEW.tenant_id AND run_id=NEW.run_id;
 SELECT r.supplier_count,r.tender_count,(c.counts->'state'->>'CANDIDATE_ELIGIBLE_WITH_LIMITATIONS')::bigint INTO es,et,ec FROM tendermatch_retrieval.eligibility_run r JOIN tendermatch_retrieval.eligibility_completion c USING(tenant_id,run_id) WHERE r.tenant_id=NEW.tenant_id AND r.run_id=NEW.stage3_run_id;
 IF s<>NEW.supplier_count OR t<>NEW.tender_count OR s<>es OR t<>et OR NEW.expected_scored IS DISTINCT FROM ec THEN RAISE EXCEPTION 'Incomplete pinned Formula membership'; END IF; RETURN NEW; END $$;
CREATE CONSTRAINT TRIGGER formula_membership_complete AFTER INSERT ON tendermatch_retrieval.formula_run DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_formula_membership();
CREATE FUNCTION tendermatch_retrieval.guard_formula_pair() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE scope text;s jsonb;i int;g int;mask int;coverage int:=0;pts int:=0;conf int:=0;best int:=1;loss int:=-1;current_loss int; BEGIN
 SELECT t.projection->'prepared'->>'procurementType',si.projection INTO scope,s
 FROM tendermatch_retrieval.formula_input si
 JOIN tendermatch_retrieval.formula_input t ON t.tenant_id=si.tenant_id AND t.input_key=NEW.tender_key AND t.kind='tender'
 JOIN tendermatch_retrieval.eligibility_pair p ON p.tenant_id=si.tenant_id AND p.supplier_key=si.eligibility_key AND p.tender_key=t.eligibility_key AND p.state=3
 WHERE si.tenant_id=NEW.tenant_id AND si.input_key=NEW.supplier_key AND si.kind='supplier'
 AND EXISTS(SELECT 1 FROM tendermatch_retrieval.formula_run r
 JOIN tendermatch_retrieval.eligibility_run e ON e.tenant_id=r.tenant_id AND e.run_id=r.stage3_run_id
 JOIN tendermatch_retrieval.formula_member sm ON sm.tenant_id=r.tenant_id AND sm.run_id=r.run_id AND sm.kind='supplier' AND sm.input_key=NEW.supplier_key
 JOIN tendermatch_retrieval.formula_member tm ON tm.tenant_id=r.tenant_id AND tm.run_id=r.run_id AND tm.kind='tender' AND tm.input_key=NEW.tender_key
 WHERE r.tenant_id=NEW.tenant_id AND r.policy_hash=NEW.policy_hash AND e.policy_hash=p.policy_hash) LIMIT 1;
 IF scope IS NULL OR scope NOT IN ('GOODS','WORKS') THEN RAISE EXCEPTION 'Formula pair is not a pinned candidate'; END IF;
 IF NEW.max_points IS DISTINCT FROM (CASE WHEN scope='WORKS' THEN ARRAY[25,25,20,15,15]::smallint[] ELSE ARRAY[35,20,20,10,15]::smallint[] END)
 OR array_dims(NEW.fit) IS DISTINCT FROM '[1:5]' OR array_dims(NEW.states) IS DISTINCT FROM '[1:5]' OR array_dims(NEW.points) IS DISTINCT FROM '[1:5]'
 OR array_dims(NEW.confidence) IS DISTINCT FROM '[1:5]' OR array_dims(NEW.ref_groups) IS DISTINCT FROM '[1:5]' OR array_dims(NEW.limitation_masks) IS DISTINCT FROM '[1:5]'
 THEN RAISE EXCEPTION 'Formula component shape/weights differ'; END IF;
 FOR i IN 1..5 LOOP
  IF NEW.fit[i] IS NULL THEN
   IF NEW.states[i] IS DISTINCT FROM 0 OR NEW.points[i] IS DISTINCT FROM 0 OR NEW.confidence[i] IS NOT NULL OR NEW.ref_groups[i] IS DISTINCT FROM 0 OR NEW.limitation_masks[i] IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Missing is not zero fit'; END IF;
  ELSE
   g:=CASE WHEN i=1 THEN 1 WHEN i=(CASE WHEN scope='WORKS' THEN 3 ELSE 2 END) THEN 2 WHEN i=4 THEN 3 ELSE 0 END;
   IF NEW.fit[i] NOT BETWEEN 0 AND 5 OR NEW.states[i] IS DISTINCT FROM 1 OR NEW.points[i] IS DISTINCT FROM NEW.max_points[i]*NEW.fit[i]/5 OR NEW.confidence[i] IS NULL OR NEW.confidence[i] NOT BETWEEN 0 AND 100
   OR g=0 OR NEW.ref_groups[i] IS DISTINCT FROM g OR coalesce(jsonb_array_length(s->'groups'->(CASE g WHEN 1 THEN 'technical' WHEN 2 THEN 'capacity' ELSE 'market' END)),0)=0 THEN RAISE EXCEPTION 'Criterion evidence/points mismatch'; END IF;
   mask:=(CASE WHEN NEW.confidence[i]<>100 THEN 4 ELSE 0 END) | (CASE g WHEN 1 THEN 16 | (CASE WHEN NEW.fit[i]=0 THEN 8 ELSE 0 END) WHEN 2 THEN 2 ELSE 32 END);
   IF NEW.limitation_masks[i] IS DISTINCT FROM mask THEN RAISE EXCEPTION 'Criterion limitation flags differ'; END IF;
   coverage:=coverage+NEW.max_points[i];conf:=conf+NEW.max_points[i]*NEW.confidence[i];
  END IF;
  pts:=pts+NEW.points[i];current_loss:=NEW.max_points[i]-NEW.points[i];
  IF current_loss>loss OR (current_loss=loss AND NEW.fit[i] IS NULL AND NEW.fit[best] IS NOT NULL) THEN best:=i;loss:=current_loss; END IF;
 END LOOP;
 IF NEW.pair_score<>pts OR NEW.data_coverage<>coverage OR NEW.assessed_fit<>(CASE WHEN coverage=0 THEN 0 ELSE round(pts*100.0/coverage)::int END) OR NEW.evidence_confidence<>(CASE WHEN coverage=0 THEN 0 ELSE round(conf*1.0/coverage)::int END) OR NEW.limitation<>best-1 THEN RAISE EXCEPTION 'Formula scalar/components differ'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER formula_pair_guard BEFORE INSERT ON tendermatch_retrieval.formula_pair FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.guard_formula_pair();
CREATE FUNCTION tendermatch_retrieval.check_formula_completion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual bigint;expected bigint;universe bigint; BEGIN
 SELECT expected_scored,supplier_count::bigint*tender_count INTO expected,universe FROM tendermatch_retrieval.formula_run WHERE tenant_id=NEW.tenant_id AND run_id=NEW.run_id;
 SELECT count(*) INTO actual FROM tendermatch_retrieval.formula_run r
 JOIN tendermatch_retrieval.formula_member s ON s.tenant_id=r.tenant_id AND s.run_id=r.run_id AND s.kind='supplier'
 JOIN tendermatch_retrieval.formula_pair p ON p.tenant_id=r.tenant_id AND p.policy_hash=r.policy_hash AND p.supplier_key=s.input_key
 JOIN tendermatch_retrieval.formula_member t ON t.tenant_id=r.tenant_id AND t.run_id=r.run_id AND t.kind='tender' AND t.input_key=p.tender_key
 WHERE r.tenant_id=NEW.tenant_id AND r.run_id=NEW.run_id;
 IF actual<>expected OR actual<>NEW.scored_count OR NEW.unscored_count<>universe-expected THEN RAISE EXCEPTION 'Incomplete unique Formula population'; END IF; RETURN NEW; END $$;
CREATE TRIGGER formula_complete BEFORE INSERT ON tendermatch_retrieval.formula_completion FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_formula_completion();
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['formula_input','formula_run','formula_member','formula_pair','formula_completion'] LOOP
  EXECUTE format('ALTER TABLE tendermatch_retrieval.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('CREATE POLICY tenant_isolation ON tendermatch_retrieval.%I USING (tenant_id=current_setting(''tendermatch.tenant_id'',true)) WITH CHECK (tenant_id=current_setting(''tendermatch.tenant_id'',true))',n);
  EXECUTE format('CREATE TRIGGER immutable_formula BEFORE UPDATE OR DELETE ON tendermatch_retrieval.%I FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change()',n);
  EXECUTE format('REVOKE ALL ON tendermatch_retrieval.%I FROM PUBLIC',n);
  EXECUTE format('GRANT SELECT,INSERT ON tendermatch_retrieval.%I TO tendermatch_result_writer',n);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION tendermatch_retrieval.guard_formula_member(),tendermatch_retrieval.check_formula_membership(),tendermatch_retrieval.guard_formula_pair(),tendermatch_retrieval.check_formula_completion() FROM PUBLIC;
INSERT INTO tendermatch_retrieval.schema_migration(version) VALUES('20260906-formula-stage4-v1');
