-- Stage 6 additive development shortlist. Owner only, inside an attested transaction.
DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
 OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 OR (SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()) IS DISTINCT FROM 'TenderMatch development result store; prepared contract 20260906; branch br-polished-boat-b1qddx0m'
 THEN RAISE EXCEPTION 'Stage 6 development target mismatch'; END IF;
 IF (SELECT array_agg(version ORDER BY version) FROM tendermatch_retrieval.schema_migration) IS DISTINCT FROM ARRAY['20260905-retrieval-v1','20260906-all-to-all-dev-v1','20260906-eligibility-v1','20260906-formula-stage4-v1','20260906-input-manifest-v1','20260906-normalization-v1','20260906-ranking-stage5-v1']::text[]
 THEN RAISE EXCEPTION 'Stage 6 base migration mismatch'; END IF;
 IF NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.ranking_completion WHERE run_id='b0ba6e965bc81ef5f3d53466d815c1c7c4c4596bd21b16ff9342b4098b484c7d' AND pair_count=707660 AND zero_count=683653 AND outcome_hash='1a7cc57af3cf1d06824700cfc4c367658b9abc67519d372a8e77fc1f4c123b47')
 OR NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.formula_completion WHERE run_id='8c60354ecfd613fab2edca21528fab8c22aeb275df7115590a5916847c78efc5' AND scored_count=707660 AND unscored_count=1320301 AND outcome_hash='b7a12c75afc68f241ce740eaf557ada12abb79159406c1ebf6471e69ed6e5df6')
 THEN RAISE EXCEPTION 'Approved prior completion absent'; END IF;
END $$;
CREATE TABLE tendermatch_retrieval.shortlist_context (
 tenant_id text NOT NULL,context_key bytea NOT NULL CHECK(octet_length(context_key)=32),policy_hash bytea NOT NULL CHECK(octet_length(policy_hash)=32),
 source_run_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('supplier','tender')),entity_id uuid NOT NULL,profile_key bytea NOT NULL,input_hash bytea NOT NULL CHECK(octet_length(input_hash)=32),
 context jsonb NOT NULL CHECK(pg_column_size(context)<262144),db_signature text NOT NULL CHECK(db_signature ~ '^[a-f0-9]{64}$'),
 PRIMARY KEY(tenant_id,context_key),UNIQUE(tenant_id,context_key,kind,entity_id),
 FOREIGN KEY(tenant_id,source_run_id) REFERENCES tendermatch_retrieval.ranking_completion(tenant_id,run_id),
 FOREIGN KEY(tenant_id,profile_key) REFERENCES tendermatch_retrieval.ranking_profile(tenant_id,profile_key)
);
CREATE TABLE tendermatch_retrieval.shortlist_run (
 tenant_id text NOT NULL,run_id text NOT NULL CHECK(run_id ~ '^[a-f0-9]{64}$'),ranking_run_id text NOT NULL,policy_hash bytea NOT NULL CHECK(octet_length(policy_hash)=32),
 identity jsonb NOT NULL CHECK(pg_column_size(identity)<16384),creation_xid xid8 NOT NULL DEFAULT pg_current_xact_id(),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,run_id),FOREIGN KEY(tenant_id,ranking_run_id) REFERENCES tendermatch_retrieval.ranking_completion(tenant_id,run_id)
);
CREATE TABLE tendermatch_retrieval.shortlist_member (
 tenant_id text NOT NULL,run_id text NOT NULL,kind text NOT NULL CHECK(kind IN ('supplier','tender')),entity_id uuid NOT NULL,context_key bytea NOT NULL,
 PRIMARY KEY(tenant_id,run_id,kind,entity_id),UNIQUE(tenant_id,run_id,kind,context_key),
 FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.shortlist_run(tenant_id,run_id),
 FOREIGN KEY(tenant_id,context_key,kind,entity_id) REFERENCES tendermatch_retrieval.shortlist_context(tenant_id,context_key,kind,entity_id)
);
CREATE TABLE tendermatch_retrieval.shortlist_pair (
 tenant_id text NOT NULL,pair_key bytea NOT NULL CHECK(octet_length(pair_key)=32),policy_hash bytea NOT NULL,
 supplier_context bytea NOT NULL,tender_context bytea NOT NULL,supplier_id uuid NOT NULL,tender_id uuid NOT NULL,
 method_hash bytea NOT NULL,formula_policy bytea NOT NULL,supplier_profile bytea NOT NULL,tender_profile bytea NOT NULL,
 tier smallint NOT NULL CHECK(tier IN (1,2)),selection jsonb NOT NULL CHECK(pg_column_size(selection)<2048),created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,pair_key),UNIQUE(tenant_id,policy_hash,supplier_context,tender_context),
 FOREIGN KEY(tenant_id,supplier_context) REFERENCES tendermatch_retrieval.shortlist_context(tenant_id,context_key),
 FOREIGN KEY(tenant_id,tender_context) REFERENCES tendermatch_retrieval.shortlist_context(tenant_id,context_key),
 FOREIGN KEY(tenant_id,method_hash,formula_policy,supplier_profile,tender_profile) REFERENCES tendermatch_retrieval.ranking_pair(tenant_id,method_hash,formula_policy,supplier_profile,tender_profile)
);
CREATE INDEX shortlist_pair_supplier ON tendermatch_retrieval.shortlist_pair(tenant_id,policy_hash,supplier_context,tier,tender_id,tender_context);
CREATE INDEX shortlist_pair_tender ON tendermatch_retrieval.shortlist_pair(tenant_id,policy_hash,tender_context,tier,supplier_id,supplier_context);
CREATE TABLE tendermatch_retrieval.shortlist_completion (
 tenant_id text NOT NULL,run_id text NOT NULL,outcome_hash text NOT NULL CHECK(outcome_hash ~ '^[a-f0-9]{64}$'),pair_count bigint NOT NULL CHECK(pair_count>=0),review_count bigint NOT NULL CHECK(review_count>=0),audit_count bigint NOT NULL CHECK(audit_count>=0),completed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,run_id),FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.shortlist_run(tenant_id,run_id),CHECK(pair_count=review_count+audit_count)
);
CREATE FUNCTION tendermatch_retrieval.shortlist_focus_inputs(tenant text,run text,focus_kind text,focus_id uuid)
RETURNS TABLE(supplier_id uuid,tender_id uuid,supplier_profile bytea,tender_profile bytea,units int,score smallint,coverage smallint,confidence smallint,mask smallint,limitation smallint)
LANGUAGE sql STABLE AS $$
 SELECT p.supplier_id,p.tender_id,p.supplier_profile,p.tender_profile,p.relevance_units,f.pair_score,f.data_coverage,f.evidence_confidence,p.limitation_mask,f.limitation
 FROM tendermatch_retrieval.ranking_run r JOIN tendermatch_retrieval.ranking_completion complete USING(tenant_id,run_id)
 JOIN tendermatch_retrieval.ranking_member focus ON focus.tenant_id=r.tenant_id AND focus.run_id=r.run_id AND focus.kind=focus_kind AND focus.entity_id=focus_id
 JOIN tendermatch_retrieval.ranking_pair p ON p.tenant_id=r.tenant_id AND p.method_hash=r.method_hash AND p.formula_policy=decode(r.identity->>'formulaPolicy','hex') AND p.supplier_profile=focus.profile_key
 JOIN tendermatch_retrieval.ranking_member other ON other.tenant_id=r.tenant_id AND other.run_id=r.run_id AND other.kind='tender' AND other.profile_key=p.tender_profile
 JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=p.tenant_id AND f.policy_hash=p.formula_policy AND f.supplier_key=p.supplier_key AND f.tender_key=p.tender_key
 WHERE r.tenant_id=tenant AND r.run_id=run AND focus_kind='supplier'
 UNION ALL
 SELECT p.supplier_id,p.tender_id,p.supplier_profile,p.tender_profile,p.relevance_units,f.pair_score,f.data_coverage,f.evidence_confidence,p.limitation_mask,f.limitation
 FROM tendermatch_retrieval.ranking_run r JOIN tendermatch_retrieval.ranking_completion complete USING(tenant_id,run_id)
 JOIN tendermatch_retrieval.ranking_member focus ON focus.tenant_id=r.tenant_id AND focus.run_id=r.run_id AND focus.kind=focus_kind AND focus.entity_id=focus_id
 JOIN tendermatch_retrieval.ranking_pair p ON p.tenant_id=r.tenant_id AND p.method_hash=r.method_hash AND p.formula_policy=decode(r.identity->>'formulaPolicy','hex') AND p.tender_profile=focus.profile_key
 JOIN tendermatch_retrieval.ranking_member other ON other.tenant_id=r.tenant_id AND other.run_id=r.run_id AND other.kind='supplier' AND other.profile_key=p.supplier_profile
 JOIN tendermatch_retrieval.formula_pair f ON f.tenant_id=p.tenant_id AND f.policy_hash=p.formula_policy AND f.supplier_key=p.supplier_key AND f.tender_key=p.tender_key
 WHERE r.tenant_id=tenant AND r.run_id=run AND focus_kind='tender';
$$;
CREATE FUNCTION tendermatch_retrieval.shortlist_focus_signature(tenant text,run text,focus_kind text,focus_id uuid) RETURNS text LANGUAGE sql STABLE AS $$
 SELECT encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.supplier_id,p.tender_id),'[]')::text,'UTF8')),'hex') FROM tendermatch_retrieval.shortlist_focus_inputs(tenant,run,focus_kind,focus_id) p;
$$;
CREATE FUNCTION tendermatch_retrieval.guard_shortlist_context() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected jsonb;n bigint;pos bigint;mh bytea;fp text; BEGIN
 SELECT r.method_hash,r.identity->>'formulaPolicy' INTO STRICT mh,fp FROM tendermatch_retrieval.ranking_run r JOIN tendermatch_retrieval.ranking_member m USING(tenant_id,run_id) WHERE r.tenant_id=NEW.tenant_id AND r.run_id=NEW.source_run_id AND m.kind=NEW.kind AND m.entity_id=NEW.entity_id AND m.profile_key=NEW.profile_key;
 WITH inputs AS MATERIALIZED (SELECT * FROM tendermatch_retrieval.shortlist_focus_inputs(NEW.tenant_id,NEW.source_run_id,NEW.kind,NEW.entity_id)),
 positive AS (SELECT *,row_number() OVER(ORDER BY units DESC,score DESC,coverage DESC,confidence DESC,CASE WHEN NEW.kind='supplier' THEN tender_id ELSE supplier_id END) rn,count(*) OVER(PARTITION BY units,score,coverage,confidence) ties FROM inputs WHERE units>0),
 audit AS (SELECT *,row_number() OVER(ORDER BY encode(sha256(convert_to('["tendermatch-directional-shortlist/1.0.0","blind-spot-audit","'||supplier_id::text||'","'||tender_id::text||'"]','UTF8')),'hex'),CASE WHEN NEW.kind='supplier' THEN tender_id ELSE supplier_id END) rn,count(*) OVER() ties FROM inputs WHERE units=0),
 chosen AS (SELECT supplier_id,tender_id,1 tier,rn,ties FROM positive WHERE rn<=CASE WHEN NEW.kind='supplier' THEN 100 ELSE 3 END UNION ALL SELECT supplier_id,tender_id,2,rn,ties FROM audit WHERE rn<=CASE WHEN NEW.kind='supplier' THEN 2 ELSE 1 END)
 SELECT (SELECT count(*) FROM inputs),(SELECT count(*) FROM positive),coalesce(jsonb_agg(jsonb_build_object('supplierId',supplier_id::text,'tenderId',tender_id::text,'tier',CASE WHEN tier=1 THEN 'REVIEW_CANDIDATE' ELSE 'AUDIT_ONLY' END,'rank',rn,'tieSize',ties,'reason',upper(NEW.kind)||CASE WHEN tier=1 THEN '_POSITIVE_BUDGET' ELSE '_ZERO_RETRIEVAL_AUDIT' END) ORDER BY tier,rn),'[]') INTO n,pos,expected FROM chosen;
 IF NEW.context->>'key' IS DISTINCT FROM encode(NEW.context_key,'hex') OR NEW.context->>'policyHash' IS DISTINCT FROM encode(NEW.policy_hash,'hex') OR NEW.context->>'inputHash' IS DISTINCT FROM encode(NEW.input_hash,'hex') OR NEW.context->>'methodHash' IS DISTINCT FROM encode(mh,'hex') OR NEW.context->>'formulaPolicy' IS DISTINCT FROM fp
 OR NEW.context->>'kind' IS DISTINCT FROM NEW.kind OR NEW.context->>'id' IS DISTINCT FROM NEW.entity_id::text OR NEW.context->>'profileKey' IS DISTINCT FROM encode(NEW.profile_key,'hex') OR (NEW.context->>'candidateCount')::bigint IS DISTINCT FROM n OR (NEW.context->>'positiveCount')::bigint IS DISTINCT FROM pos OR NEW.context->'nominations' IS DISTINCT FROM expected
 THEN RAISE EXCEPTION 'Shortlist context must preserve exact nomination policy and pinned operands'; END IF;
 NEW.db_signature:=tendermatch_retrieval.shortlist_focus_signature(NEW.tenant_id,NEW.source_run_id,NEW.kind,NEW.entity_id);RETURN NEW; END $$;
CREATE TRIGGER shortlist_context_guard BEFORE INSERT ON tendermatch_retrieval.shortlist_context FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.guard_shortlist_context();
CREATE FUNCTION tendermatch_retrieval.guard_shortlist_member() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c tendermatch_retrieval.shortlist_context;r tendermatch_retrieval.shortlist_run; BEGIN
 SELECT * INTO STRICT c FROM tendermatch_retrieval.shortlist_context WHERE tenant_id=NEW.tenant_id AND context_key=NEW.context_key AND kind=NEW.kind AND entity_id=NEW.entity_id;
 SELECT * INTO STRICT r FROM tendermatch_retrieval.shortlist_run WHERE tenant_id=NEW.tenant_id AND run_id=NEW.run_id AND creation_xid=pg_current_xact_id();
 IF c.policy_hash<>r.policy_hash OR NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.ranking_member m WHERE m.tenant_id=NEW.tenant_id AND m.run_id=r.ranking_run_id AND m.kind=NEW.kind AND m.entity_id=NEW.entity_id AND m.profile_key=c.profile_key)
 THEN RAISE EXCEPTION 'Shortlist membership sealed or unpinned'; END IF;
 IF c.source_run_id<>r.ranking_run_id AND c.db_signature<>tendermatch_retrieval.shortlist_focus_signature(NEW.tenant_id,r.ranking_run_id,NEW.kind,NEW.entity_id) THEN RAISE EXCEPTION 'Stale shortlist context dependency'; END IF;RETURN NEW; END $$;
CREATE TRIGGER shortlist_member_guard BEFORE INSERT ON tendermatch_retrieval.shortlist_member FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.guard_shortlist_member();
CREATE FUNCTION tendermatch_retrieval.check_shortlist_members() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n bigint;expected bigint;ranking_hash text;candidate_count bigint; BEGIN
 SELECT count(*) INTO n FROM tendermatch_retrieval.shortlist_member WHERE tenant_id=NEW.tenant_id AND run_id=NEW.run_id;
 SELECT count(*) INTO expected FROM tendermatch_retrieval.ranking_member WHERE tenant_id=NEW.tenant_id AND run_id=NEW.ranking_run_id;
 SELECT outcome_hash,pair_count INTO STRICT ranking_hash,candidate_count FROM tendermatch_retrieval.ranking_completion WHERE tenant_id=NEW.tenant_id AND run_id=NEW.ranking_run_id;
 IF NEW.identity->>'rankingOutcomeHash' IS DISTINCT FROM ranking_hash OR (NEW.identity->>'candidates')::bigint IS DISTINCT FROM candidate_count OR NEW.identity#>>'{policy,aiAuthorization}' IS DISTINCT FROM 'false' OR NEW.identity#>>'{policy,combination}' IS DISTINCT FROM 'UNION_OF_DIRECTIONAL_NOMINATIONS' THEN RAISE EXCEPTION 'Invalid shortlist upstream or authority identity'; END IF;
 IF n<>expected OR (NEW.identity->>'contexts')::bigint IS DISTINCT FROM expected OR NEW.identity->>'rankingRunId' IS DISTINCT FROM NEW.ranking_run_id OR NEW.identity->>'policyHash' IS DISTINCT FROM encode(NEW.policy_hash,'hex') OR NEW.identity#>>'{policy,version}' IS DISTINCT FROM 'tendermatch-directional-shortlist/1.0.0' OR NEW.identity#>>'{policy,name}' IS DISTINCT FROM 'balanced-100-3' OR (NEW.identity#>>'{policy,supplierReview}')::int IS DISTINCT FROM 100 OR (NEW.identity#>>'{policy,tenderReview}')::int IS DISTINCT FROM 3 OR (NEW.identity#>>'{policy,supplierAudit}')::int IS DISTINCT FROM 2 OR (NEW.identity#>>'{policy,tenderAudit}')::int IS DISTINCT FROM 1 OR NEW.identity->>'actualAiTorsReady' IS DISTINCT FROM '0'
 THEN RAISE EXCEPTION 'Incomplete or invalid shortlist run'; END IF;RETURN NEW; END $$;
CREATE CONSTRAINT TRIGGER shortlist_members_complete AFTER INSERT ON tendermatch_retrieval.shortlist_run DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_shortlist_members();
CREATE FUNCTION tendermatch_retrieval.guard_shortlist_pair() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE s tendermatch_retrieval.shortlist_context;t tendermatch_retrieval.shortlist_context;sn jsonb;tn jsonb;expected jsonb;mask int;u int; BEGIN
 SELECT * INTO STRICT s FROM tendermatch_retrieval.shortlist_context WHERE tenant_id=NEW.tenant_id AND context_key=NEW.supplier_context AND kind='supplier' AND entity_id=NEW.supplier_id AND profile_key=NEW.supplier_profile AND policy_hash=NEW.policy_hash;
 SELECT * INTO STRICT t FROM tendermatch_retrieval.shortlist_context WHERE tenant_id=NEW.tenant_id AND context_key=NEW.tender_context AND kind='tender' AND entity_id=NEW.tender_id AND profile_key=NEW.tender_profile AND policy_hash=NEW.policy_hash;
 IF s.context->>'methodHash'<>encode(NEW.method_hash,'hex') OR t.context->>'methodHash'<>encode(NEW.method_hash,'hex') OR s.context->>'formulaPolicy'<>encode(NEW.formula_policy,'hex') OR t.context->>'formulaPolicy'<>encode(NEW.formula_policy,'hex') OR NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.shortlist_run r JOIN tendermatch_retrieval.shortlist_member sm ON sm.tenant_id=r.tenant_id AND sm.run_id=r.run_id AND sm.kind='supplier' AND sm.context_key=NEW.supplier_context JOIN tendermatch_retrieval.shortlist_member tm ON tm.tenant_id=r.tenant_id AND tm.run_id=r.run_id AND tm.kind='tender' AND tm.context_key=NEW.tender_context WHERE r.tenant_id=NEW.tenant_id AND r.policy_hash=NEW.policy_hash)
 THEN RAISE EXCEPTION 'Shortlist pair not in pinned run'; END IF;
 SELECT n INTO sn FROM jsonb_array_elements(s.context->'nominations') n WHERE n->>'tenderId'=NEW.tender_id::text;
 SELECT n INTO tn FROM jsonb_array_elements(t.context->'nominations') n WHERE n->>'supplierId'=NEW.supplier_id::text;
 SELECT relevance_units INTO STRICT u FROM tendermatch_retrieval.ranking_pair WHERE tenant_id=NEW.tenant_id AND method_hash=NEW.method_hash AND formula_policy=NEW.formula_policy AND supplier_profile=NEW.supplier_profile AND tender_profile=NEW.tender_profile AND supplier_id=NEW.supplier_id AND tender_id=NEW.tender_id;
 IF (sn IS NULL AND tn IS NULL) OR NEW.tier<>(CASE WHEN u>0 THEN 1 ELSE 2 END) THEN RAISE EXCEPTION 'Pair not nominated or wrong audit tier'; END IF;
 mask:=(CASE WHEN sn IS NULL THEN 0 WHEN NEW.tier=1 THEN 1 ELSE 4 END) | (CASE WHEN tn IS NULL THEN 0 WHEN NEW.tier=1 THEN 2 ELSE 8 END);
 expected:=jsonb_build_object('reasonMask',mask,'supplierNominationRank',sn->'rank','tenderNominationRank',tn->'rank','supplierTieSize',sn->'tieSize','tenderTieSize',tn->'tieSize');
 IF NEW.selection IS DISTINCT FROM expected THEN RAISE EXCEPTION 'Shortlist reasons/ranks differ from nominations'; END IF;RETURN NEW; END $$;
CREATE TRIGGER shortlist_pair_guard BEFORE INSERT ON tendermatch_retrieval.shortlist_pair FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.guard_shortlist_pair();
CREATE FUNCTION tendermatch_retrieval.check_shortlist_completion() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE expected bigint;n bigint;reviews bigint;audits bigint; BEGIN
 SELECT count(*) INTO expected FROM (SELECT DISTINCT x->>'supplierId',x->>'tenderId' FROM tendermatch_retrieval.shortlist_member m JOIN tendermatch_retrieval.shortlist_context c USING(tenant_id,context_key) CROSS JOIN LATERAL jsonb_array_elements(c.context->'nominations') x WHERE m.tenant_id=NEW.tenant_id AND m.run_id=NEW.run_id) q;
 SELECT count(*),count(*) FILTER(WHERE p.tier=1),count(*) FILTER(WHERE p.tier=2) INTO n,reviews,audits FROM tendermatch_retrieval.shortlist_run r JOIN tendermatch_retrieval.shortlist_member s ON s.tenant_id=r.tenant_id AND s.run_id=r.run_id AND s.kind='supplier' JOIN tendermatch_retrieval.shortlist_pair p ON p.tenant_id=r.tenant_id AND p.policy_hash=r.policy_hash AND p.supplier_context=s.context_key JOIN tendermatch_retrieval.shortlist_member t ON t.tenant_id=r.tenant_id AND t.run_id=r.run_id AND t.kind='tender' AND t.context_key=p.tender_context WHERE r.tenant_id=NEW.tenant_id AND r.run_id=NEW.run_id;
 IF expected<>n OR NEW.pair_count<>n OR NEW.review_count<>reviews OR NEW.audit_count<>audits THEN RAISE EXCEPTION 'Incomplete shortlist nomination union'; END IF;RETURN NEW; END $$;
CREATE TRIGGER shortlist_complete BEFORE INSERT ON tendermatch_retrieval.shortlist_completion FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_shortlist_completion();
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['shortlist_context','shortlist_run','shortlist_member','shortlist_pair','shortlist_completion'] LOOP
  EXECUTE format('ALTER TABLE tendermatch_retrieval.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('CREATE POLICY tenant_isolation ON tendermatch_retrieval.%I USING (tenant_id=current_setting(''tendermatch.tenant_id'',true)) WITH CHECK (tenant_id=current_setting(''tendermatch.tenant_id'',true))',n);
  EXECUTE format('CREATE TRIGGER immutable_shortlist BEFORE UPDATE OR DELETE ON tendermatch_retrieval.%I FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change()',n);
  EXECUTE format('REVOKE ALL ON tendermatch_retrieval.%I FROM PUBLIC',n);
  EXECUTE format('GRANT SELECT,INSERT ON tendermatch_retrieval.%I TO tendermatch_result_writer',n);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION tendermatch_retrieval.shortlist_focus_inputs(text,text,text,uuid),tendermatch_retrieval.shortlist_focus_signature(text,text,text,uuid),tendermatch_retrieval.guard_shortlist_context(),tendermatch_retrieval.guard_shortlist_member(),tendermatch_retrieval.check_shortlist_members(),tendermatch_retrieval.guard_shortlist_pair(),tendermatch_retrieval.check_shortlist_completion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION tendermatch_retrieval.shortlist_focus_inputs(text,text,text,uuid),tendermatch_retrieval.shortlist_focus_signature(text,text,text,uuid) TO tendermatch_result_writer;
INSERT INTO tendermatch_retrieval.schema_migration(version) VALUES('20260907-shortlist-stage6-v1');
