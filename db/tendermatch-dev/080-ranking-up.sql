-- Stage 5 ADDITIVE development fallback. Owner only; execute inside an attested transaction.
DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
 OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 OR (SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database())
 IS DISTINCT FROM 'TenderMatch development result store; prepared contract 20260906; branch br-polished-boat-b1qddx0m'
 THEN RAISE EXCEPTION 'Stage 5 development target mismatch'; END IF;
 IF (SELECT array_agg(version ORDER BY version) FROM tendermatch_retrieval.schema_migration)
 IS DISTINCT FROM ARRAY['20260905-retrieval-v1','20260906-all-to-all-dev-v1','20260906-eligibility-v1','20260906-formula-stage4-v1','20260906-input-manifest-v1','20260906-normalization-v1']::text[]
 THEN RAISE EXCEPTION 'Stage 5 base migration mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.formula_completion WHERE run_id='8c60354ecfd613fab2edca21528fab8c22aeb275df7115590a5916847c78efc5' AND scored_count=707660 AND unscored_count=1320301 AND outcome_hash='b7a12c75afc68f241ce740eaf557ada12abb79159406c1ebf6471e69ed6e5df6')
 THEN RAISE EXCEPTION 'Approved Stage 4 completion absent'; END IF;
END $$;
CREATE TABLE tendermatch_retrieval.ranking_profile (
 tenant_id text NOT NULL,profile_key bytea NOT NULL CHECK(octet_length(profile_key)=32),
 input_key bytea NOT NULL,kind text NOT NULL CHECK(kind IN ('supplier','tender')),entity_id uuid NOT NULL,
 profile jsonb NOT NULL CHECK(pg_column_size(profile)<65536),
 PRIMARY KEY(tenant_id,profile_key),UNIQUE(tenant_id,profile_key,input_key,kind,entity_id),
 FOREIGN KEY(tenant_id,input_key,kind,entity_id) REFERENCES tendermatch_retrieval.formula_input(tenant_id,input_key,kind,entity_id)
);
CREATE INDEX ranking_profile_input ON tendermatch_retrieval.ranking_profile(tenant_id,input_key);
CREATE TABLE tendermatch_retrieval.ranking_run (
 tenant_id text NOT NULL,run_id text NOT NULL CHECK(run_id ~ '^[a-f0-9]{64}$'),
 method_hash bytea NOT NULL CHECK(octet_length(method_hash)=32),formula_run_id text NOT NULL,
 identity jsonb NOT NULL CHECK(pg_column_size(identity)<16384),
 method_version text NOT NULL CHECK(method_version='tendermatch-pair-local-lexical-structured/1.0.0'),
 creation_xid xid8 NOT NULL DEFAULT pg_current_xact_id(),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,run_id),
 FOREIGN KEY(tenant_id,formula_run_id) REFERENCES tendermatch_retrieval.formula_completion(tenant_id,run_id)
);
CREATE TABLE tendermatch_retrieval.ranking_member (
 tenant_id text NOT NULL,run_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('supplier','tender')),
 entity_id uuid NOT NULL,profile_key bytea NOT NULL,input_key bytea NOT NULL,
 PRIMARY KEY(tenant_id,run_id,kind,entity_id),UNIQUE(tenant_id,run_id,kind,profile_key),
 FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.ranking_run(tenant_id,run_id),
 FOREIGN KEY(tenant_id,profile_key,input_key,kind,entity_id) REFERENCES tendermatch_retrieval.ranking_profile(tenant_id,profile_key,input_key,kind,entity_id)
);
CREATE TABLE tendermatch_retrieval.ranking_pair (
 tenant_id text NOT NULL,method_hash bytea NOT NULL CHECK(octet_length(method_hash)=32),formula_policy bytea NOT NULL,
 supplier_profile bytea NOT NULL,tender_profile bytea NOT NULL,supplier_key bytea NOT NULL,tender_key bytea NOT NULL,
 supplier_id uuid NOT NULL,tender_id uuid NOT NULL,
 lexical_overlap smallint NOT NULL CHECK(lexical_overlap BETWEEN 0 AND 256),lexical_union smallint NOT NULL CHECK(lexical_union BETWEEN 0 AND 512),
 structured_overlap smallint NOT NULL CHECK(structured_overlap BETWEEN 0 AND 128),structured_union smallint NOT NULL CHECK(structured_union BETWEEN 0 AND 256),
 relevance_units int NOT NULL CHECK(relevance_units BETWEEN 0 AND 1000000),limitation_mask smallint NOT NULL CHECK(limitation_mask BETWEEN 0 AND 7),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,method_hash,formula_policy,supplier_profile,tender_profile),
 FOREIGN KEY(tenant_id,supplier_profile) REFERENCES tendermatch_retrieval.ranking_profile(tenant_id,profile_key),
 FOREIGN KEY(tenant_id,tender_profile) REFERENCES tendermatch_retrieval.ranking_profile(tenant_id,profile_key),
 FOREIGN KEY(tenant_id,formula_policy,supplier_key,tender_key) REFERENCES tendermatch_retrieval.formula_pair(tenant_id,policy_hash,supplier_key,tender_key)
);
CREATE INDEX ranking_pair_supplier ON tendermatch_retrieval.ranking_pair(tenant_id,method_hash,formula_policy,supplier_profile,relevance_units DESC,tender_id,tender_profile);
CREATE INDEX ranking_pair_tender ON tendermatch_retrieval.ranking_pair(tenant_id,method_hash,formula_policy,tender_profile,relevance_units DESC,supplier_id,supplier_profile);
CREATE TABLE tendermatch_retrieval.ranking_completion (
 tenant_id text NOT NULL,run_id text NOT NULL,outcome_hash text NOT NULL CHECK(outcome_hash ~ '^[a-f0-9]{64}$'),
 pair_count bigint NOT NULL,zero_count bigint NOT NULL CHECK(zero_count>=0),completed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,run_id),FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.ranking_run(tenant_id,run_id)
);
CREATE FUNCTION tendermatch_retrieval.guard_ranking_profile() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f jsonb;terms jsonb;concepts jsonb;refs jsonb;scopes jsonb;term_count int;concept_count int;missing boolean; BEGIN
 SELECT projection INTO STRICT f FROM tendermatch_retrieval.formula_input WHERE tenant_id=NEW.tenant_id AND input_key=NEW.input_key AND kind=NEW.kind AND entity_id=NEW.entity_id;
 SELECT coalesce(jsonb_agg(v ORDER BY v COLLATE "C"),'[]') INTO terms FROM (SELECT DISTINCT v COLLATE "C" v FROM jsonb_array_elements_text(CASE WHEN NEW.kind='supplier' THEN f#>'{prepared,formulaEvidence,technical,terms}' ELSE f#>'{prepared,scoringTerms}' END) v ORDER BY v COLLATE "C" LIMIT 256) q;
 SELECT coalesce(jsonb_agg(v ORDER BY v COLLATE "C"),'[]') INTO concepts FROM (SELECT DISTINCT v COLLATE "C" v FROM jsonb_array_elements_text(CASE WHEN NEW.kind='supplier' THEN f#>'{prepared,formulaEvidence,technical,concepts}' ELSE f#>'{prepared,scoringConcepts}' END) v ORDER BY v COLLATE "C" LIMIT 128) q;
 SELECT count(DISTINCT v) INTO term_count FROM jsonb_array_elements_text(CASE WHEN NEW.kind='supplier' THEN f#>'{prepared,formulaEvidence,technical,terms}' ELSE f#>'{prepared,scoringTerms}' END) v;
 SELECT count(DISTINCT v) INTO concept_count FROM jsonb_array_elements_text(CASE WHEN NEW.kind='supplier' THEN f#>'{prepared,formulaEvidence,technical,concepts}' ELSE f#>'{prepared,scoringConcepts}' END) v;
 SELECT coalesce(jsonb_agg(v ORDER BY v COLLATE "C"),'[]') INTO scopes FROM (SELECT DISTINCT v FROM jsonb_array_elements_text(CASE WHEN NEW.kind='supplier' THEN f->'scopes' ELSE jsonb_build_array(f#>>'{prepared,procurementType}') END) v) q;
 missing:=CASE WHEN NEW.kind='supplier' THEN (f#>>'{prepared,formulaEvidence,technical,count}')::int=0 ELSE term_count=0 END;
 IF NEW.kind='supplier' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r->>'id','sourceRecordId',r->>'sourceRecordId','artifactId',r->'artifactId','sourceStatus',r->>'sourceStatus','valueClass',r->>'valueClass') ORDER BY r->>'id'),'[]') INTO refs FROM jsonb_array_elements(f->'references') r WHERE f#>'{groups,technical}' ? (r->>'id');
 ELSE refs:=jsonb_build_array(jsonb_build_object('id',NEW.entity_id::text,'sourceRecordId',NEW.entity_id::text,'artifactId',null,'sourceStatus','PINNED_NOTICE_RECORD','valueClass','SOURCE')); END IF;
 IF NEW.profile->>'version' IS DISTINCT FROM 'tendermatch-frozen-retrieval-profile/1.0.0'
 OR NEW.profile->>'key' IS DISTINCT FROM encode(NEW.profile_key,'hex') OR NEW.profile->>'formulaInputKey' IS DISTINCT FROM encode(NEW.input_key,'hex')
 OR NEW.profile->>'kind' IS DISTINCT FROM NEW.kind OR NEW.profile->>'id' IS DISTINCT FROM NEW.entity_id::text
 OR NEW.profile->'terms' IS DISTINCT FROM terms OR NEW.profile->'concepts' IS DISTINCT FROM concepts OR NEW.profile->'references' IS DISTINCT FROM refs
 OR NEW.profile->'scopes' IS DISTINCT FROM scopes OR (NEW.profile->>'missingTechnicalEvidence')::boolean IS DISTINCT FROM missing
 OR (NEW.profile->>'truncatedTerms')::int IS DISTINCT FROM greatest(0,term_count-256) OR (NEW.profile->>'truncatedConcepts')::int IS DISTINCT FROM greatest(0,concept_count-128)
 OR NEW.profile->>'sourceHash' IS DISTINCT FROM (CASE WHEN NEW.kind='supplier' THEN f->>'readinessHash' ELSE f->>'sourceFeatureHash' END)
 OR NEW.profile->>'sourceVersion' IS DISTINCT FROM f#>>'{prepared,sourceVersion}'
 OR NEW.profile->'semantic' IS DISTINCT FROM '{"state":"MISSING","model":null,"dimensions":null}'::jsonb
 THEN RAISE EXCEPTION 'Ranking profile must preserve frozen operands/references'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER ranking_profile_guard BEFORE INSERT ON tendermatch_retrieval.ranking_profile FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.guard_ranking_profile();
CREATE FUNCTION tendermatch_retrieval.guard_ranking_member() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.ranking_run r JOIN tendermatch_retrieval.formula_member f ON f.tenant_id=r.tenant_id AND f.run_id=r.formula_run_id WHERE r.tenant_id=NEW.tenant_id AND r.run_id=NEW.run_id AND r.creation_xid=pg_current_xact_id() AND f.kind=NEW.kind AND f.entity_id=NEW.entity_id AND f.input_key=NEW.input_key)
 THEN RAISE EXCEPTION 'Ranking membership sealed or not pinned'; END IF; RETURN NEW; END $$;
CREATE TRIGGER ranking_member_guard BEFORE INSERT ON tendermatch_retrieval.ranking_member FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.guard_ranking_member();
CREATE FUNCTION tendermatch_retrieval.check_ranking_membership() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n bigint;expected bigint; BEGIN
 SELECT count(*) INTO n FROM tendermatch_retrieval.ranking_member WHERE tenant_id=NEW.tenant_id AND run_id=NEW.run_id;
 SELECT supplier_count+tender_count INTO expected FROM tendermatch_retrieval.formula_run WHERE tenant_id=NEW.tenant_id AND run_id=NEW.formula_run_id;
 IF n<>expected THEN RAISE EXCEPTION 'Ranking membership incomplete'; END IF; RETURN NEW; END $$;
CREATE CONSTRAINT TRIGGER ranking_members_complete AFTER INSERT ON tendermatch_retrieval.ranking_run DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_ranking_membership();
CREATE FUNCTION tendermatch_retrieval.guard_ranking_pair() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s jsonb;t jsonb;lo int;lu int;co int;cu int;units int;mask int; BEGIN
 SELECT profile INTO STRICT s FROM tendermatch_retrieval.ranking_profile WHERE tenant_id=NEW.tenant_id AND profile_key=NEW.supplier_profile AND input_key=NEW.supplier_key AND entity_id=NEW.supplier_id AND kind='supplier';
 SELECT profile INTO STRICT t FROM tendermatch_retrieval.ranking_profile WHERE tenant_id=NEW.tenant_id AND profile_key=NEW.tender_profile AND input_key=NEW.tender_key AND entity_id=NEW.tender_id AND kind='tender';
 IF NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.ranking_run r JOIN tendermatch_retrieval.formula_run f ON f.tenant_id=r.tenant_id AND f.run_id=r.formula_run_id JOIN tendermatch_retrieval.ranking_member sm ON sm.tenant_id=r.tenant_id AND sm.run_id=r.run_id AND sm.kind='supplier' AND sm.profile_key=NEW.supplier_profile JOIN tendermatch_retrieval.ranking_member tm ON tm.tenant_id=r.tenant_id AND tm.run_id=r.run_id AND tm.kind='tender' AND tm.profile_key=NEW.tender_profile WHERE r.tenant_id=NEW.tenant_id AND r.method_hash=NEW.method_hash AND f.policy_hash=NEW.formula_policy)
 THEN RAISE EXCEPTION 'Ranking pair not a pinned run candidate'; END IF;
 SELECT count(*) INTO lo FROM jsonb_array_elements_text(s->'terms') v WHERE t->'terms' ? v;
 SELECT count(*) INTO co FROM jsonb_array_elements_text(s->'concepts') v WHERE t->'concepts' ? v;
 lu:=jsonb_array_length(s->'terms')+jsonb_array_length(t->'terms')-lo;cu:=jsonb_array_length(s->'concepts')+jsonb_array_length(t->'concepts')-co;
 units:=(CASE WHEN lu=0 THEN 0 ELSE 800000*lo/lu END)+(CASE WHEN cu=0 THEN 0 ELSE 200000*co/cu END);
 mask:=(CASE WHEN (s->>'missingTechnicalEvidence')::boolean OR (t->>'missingTechnicalEvidence')::boolean THEN 1 ELSE 0 END) | (CASE WHEN lo+co=0 THEN 2 ELSE 0 END) | (CASE WHEN (s->>'truncatedTerms')::int+(s->>'truncatedConcepts')::int+(t->>'truncatedTerms')::int+(t->>'truncatedConcepts')::int>0 THEN 4 ELSE 0 END);
 IF NEW.lexical_overlap<>lo OR NEW.lexical_union<>lu OR NEW.structured_overlap<>co OR NEW.structured_union<>cu OR NEW.relevance_units<>units OR NEW.limitation_mask<>mask THEN RAISE EXCEPTION 'Ranking components differ from profile operands'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER ranking_pair_guard BEFORE INSERT ON tendermatch_retrieval.ranking_pair FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.guard_ranking_pair();
CREATE FUNCTION tendermatch_retrieval.check_ranking_completion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n bigint;z bigint;expected bigint; BEGIN
 SELECT c.scored_count INTO expected FROM tendermatch_retrieval.ranking_run r JOIN tendermatch_retrieval.formula_completion c ON c.tenant_id=r.tenant_id AND c.run_id=r.formula_run_id WHERE r.tenant_id=NEW.tenant_id AND r.run_id=NEW.run_id;
 SELECT count(*),count(*) FILTER(WHERE p.relevance_units=0) INTO n,z FROM tendermatch_retrieval.ranking_run r
 JOIN tendermatch_retrieval.formula_run f ON f.tenant_id=r.tenant_id AND f.run_id=r.formula_run_id
 JOIN tendermatch_retrieval.ranking_member s ON s.tenant_id=r.tenant_id AND s.run_id=r.run_id AND s.kind='supplier'
 JOIN tendermatch_retrieval.ranking_pair p ON p.tenant_id=r.tenant_id AND p.method_hash=r.method_hash AND p.formula_policy=f.policy_hash AND p.supplier_profile=s.profile_key
 JOIN tendermatch_retrieval.ranking_member t ON t.tenant_id=r.tenant_id AND t.run_id=r.run_id AND t.kind='tender' AND t.profile_key=p.tender_profile
 WHERE r.tenant_id=NEW.tenant_id AND r.run_id=NEW.run_id;
 IF n<>expected OR n<>NEW.pair_count OR z<>NEW.zero_count THEN RAISE EXCEPTION 'Incomplete ranking candidate population'; END IF; RETURN NEW; END $$;
CREATE TRIGGER ranking_complete BEFORE INSERT ON tendermatch_retrieval.ranking_completion FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_ranking_completion();
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['ranking_profile','ranking_run','ranking_member','ranking_pair','ranking_completion'] LOOP
  EXECUTE format('ALTER TABLE tendermatch_retrieval.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('CREATE POLICY tenant_isolation ON tendermatch_retrieval.%I USING (tenant_id=current_setting(''tendermatch.tenant_id'',true)) WITH CHECK (tenant_id=current_setting(''tendermatch.tenant_id'',true))',n);
  EXECUTE format('CREATE TRIGGER immutable_ranking BEFORE UPDATE OR DELETE ON tendermatch_retrieval.%I FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change()',n);
  EXECUTE format('REVOKE ALL ON tendermatch_retrieval.%I FROM PUBLIC',n);
  EXECUTE format('GRANT SELECT,INSERT ON tendermatch_retrieval.%I TO tendermatch_result_writer',n);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION tendermatch_retrieval.guard_ranking_profile(),tendermatch_retrieval.guard_ranking_member(),tendermatch_retrieval.check_ranking_membership(),tendermatch_retrieval.guard_ranking_pair(),tendermatch_retrieval.check_ranking_completion() FROM PUBLIC;
INSERT INTO tendermatch_retrieval.schema_migration(version) VALUES('20260906-ranking-stage5-v1');
