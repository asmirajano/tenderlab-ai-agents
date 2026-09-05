-- Runs in ONE transaction after the unchanged 20260905 retrieval schema body.
-- The fresh result DB is isolated; no PUBLIC revocation on any existing database.
DO $$ DECLARE v text; BEGIN
 SELECT extversion INTO v FROM pg_extension WHERE extname='vector';
 IF current_setting('server_version_num')::integer<160000 OR v IS NULL
    OR string_to_array(v,'.')::integer[] < ARRAY[0,8,0] THEN
  RAISE EXCEPTION 'PostgreSQL 16+ and pgvector 0.8+ required'; END IF;
END $$;
REVOKE ALL ON DATABASE tendermatch_results_dev FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE ROLE tendermatch_result_writer NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
CREATE TABLE tendermatch_retrieval.universe_snapshot (
 tenant_id text NOT NULL, run_id text NOT NULL, contract_version text NOT NULL,
 supplier_contract_version text NOT NULL, tender_contract_version text NOT NULL,
 supplier_count integer NOT NULL CHECK(supplier_count>=0), tender_count integer NOT NULL CHECK(tender_count>=0),
 supplier_ids_sha256 text NOT NULL CHECK(length(supplier_ids_sha256)=64),
 tender_ids_sha256 text NOT NULL CHECK(length(tender_ids_sha256)=64),
 source_as_of timestamptz NOT NULL, considered_pairs bigint GENERATED ALWAYS AS (supplier_count::bigint*tender_count::bigint) STORED,
 PRIMARY KEY(tenant_id,run_id), FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.evaluation_run(tenant_id,run_id)
);
-- All pairs considered, NOT all pairs scored. No zero default for unassessed rows.
CREATE TABLE tendermatch_retrieval.universe_pair (
 tenant_id text NOT NULL, run_id text NOT NULL, supplier_id text NOT NULL, tender_id text NOT NULL,
 eligibility text NOT NULL CHECK(eligibility IN ('ELIGIBLE','INELIGIBLE','OUTSIDE_SCORING_SCOPE','NEEDS_EVIDENCE')),
 reason_codes text[] NOT NULL CHECK(cardinality(reason_codes)>0),
 scoring_state text NOT NULL CHECK(scoring_state IN ('SCORED','NOT_SCORED')),
 cache_key text, pair_score smallint CHECK(pair_score BETWEEN 0 AND 100),
 PRIMARY KEY(tenant_id,run_id,supplier_id,tender_id),
 FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.universe_snapshot(tenant_id,run_id),
 FOREIGN KEY(tenant_id,cache_key) REFERENCES tendermatch_retrieval.pair_score(tenant_id,cache_key),
 CHECK((scoring_state='NOT_SCORED' AND cache_key IS NULL AND pair_score IS NULL) OR
       (scoring_state='SCORED' AND eligibility='ELIGIBLE' AND cache_key IS NOT NULL AND pair_score IS NOT NULL))
);
CREATE INDEX universe_supplier_rank ON tendermatch_retrieval.universe_pair(tenant_id,run_id,supplier_id,pair_score DESC NULLS LAST,tender_id);
CREATE INDEX universe_tender_rank ON tendermatch_retrieval.universe_pair(tenant_id,run_id,tender_id,pair_score DESC NULLS LAST,supplier_id);
CREATE FUNCTION tendermatch_retrieval.check_universe_score() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.scoring_state='SCORED' AND NOT EXISTS(SELECT 1 FROM tendermatch_retrieval.pair_score p
   WHERE p.tenant_id=NEW.tenant_id AND p.cache_key=NEW.cache_key AND p.supplier_id=NEW.supplier_id
    AND p.tender_id=NEW.tender_id AND p.pair_score=NEW.pair_score AND p.eligibility='ELIGIBLE')
 THEN RAISE EXCEPTION 'Universe score does not reconcile with immutable Formula record'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER check_universe_score BEFORE INSERT ON tendermatch_retrieval.universe_pair
 FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_universe_score();
CREATE TABLE tendermatch_retrieval.criterion_audit (
 tenant_id text NOT NULL, cache_key text NOT NULL, criterion_code text NOT NULL,
 weight smallint NOT NULL CHECK(weight>0 AND weight<=100), fit_level smallint CHECK(fit_level BETWEEN 0 AND 5),
 points numeric CHECK(points>=0 AND points<=weight), evidence_ids text[] NOT NULL, reason_codes text[] NOT NULL,
 value_class text NOT NULL CHECK(value_class IN ('CALCULATED','MISSING')), operands jsonb NOT NULL,
 PRIMARY KEY(tenant_id,cache_key,criterion_code), FOREIGN KEY(tenant_id,cache_key) REFERENCES tendermatch_retrieval.pair_score(tenant_id,cache_key),
 CHECK((fit_level IS NULL AND points IS NULL AND value_class='MISSING') OR
       (fit_level IS NOT NULL AND points IS NOT NULL AND points=weight*fit_level::numeric/5 AND value_class='CALCULATED' AND cardinality(evidence_ids)>0))
);
-- A scored universe row must have its complete, reconciled five-component audit
-- by commit. Missing components retain NULL points; their contribution is zero.
CREATE FUNCTION tendermatch_retrieval.check_complete_criterion_audit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer; weights integer; points numeric;
BEGIN
 IF NEW.scoring_state='SCORED' THEN
  SELECT count(*),sum(weight),sum(COALESCE(a.points,0)) INTO n,weights,points
   FROM tendermatch_retrieval.criterion_audit a WHERE a.tenant_id=NEW.tenant_id AND a.cache_key=NEW.cache_key;
  IF n<>5 OR weights<>100 OR round(points)<>NEW.pair_score THEN
   RAISE EXCEPTION 'Scored universe row needs five reconciled fixed-denominator criteria'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER complete_criterion_audit AFTER INSERT ON tendermatch_retrieval.universe_pair
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_complete_criterion_audit();
CREATE FUNCTION tendermatch_retrieval.check_criterion_extent() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE n integer; weights integer;
BEGIN
 SELECT count(*),sum(weight) INTO n,weights FROM tendermatch_retrieval.criterion_audit
  WHERE tenant_id=NEW.tenant_id AND cache_key=NEW.cache_key;
 IF n>5 OR weights>100 THEN RAISE EXCEPTION 'Criterion audit exceeds Formula contract'; END IF;
 RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER criterion_extent AFTER INSERT ON tendermatch_retrieval.criterion_audit
 DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.check_criterion_extent();
DO $$ DECLARE n text; BEGIN
 FOREACH n IN ARRAY ARRAY['universe_snapshot','universe_pair','criterion_audit'] LOOP
  EXECUTE format('ALTER TABLE tendermatch_retrieval.%I ENABLE ROW LEVEL SECURITY',n);
  EXECUTE format('CREATE POLICY tenant_isolation ON tendermatch_retrieval.%I USING (tenant_id=current_setting(''tendermatch.tenant_id'',true)) WITH CHECK (tenant_id=current_setting(''tendermatch.tenant_id'',true))',n);
  EXECUTE format('CREATE TRIGGER immutable_record BEFORE UPDATE OR DELETE ON tendermatch_retrieval.%I FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change()',n);
 END LOOP;
END $$;
INSERT INTO tendermatch_retrieval.schema_migration(version) VALUES ('20260906-all-to-all-dev-v1');
REVOKE ALL ON ALL TABLES IN SCHEMA tendermatch_retrieval FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA tendermatch_retrieval FROM PUBLIC;
GRANT USAGE ON SCHEMA tendermatch_retrieval TO tendermatch_result_writer;
GRANT SELECT ON ALL TABLES IN SCHEMA tendermatch_retrieval TO tendermatch_result_writer;
GRANT INSERT ON tendermatch_retrieval.normalized_feature,tendermatch_retrieval.feature_embedding,
 tendermatch_retrieval.evaluation_run,tendermatch_retrieval.run_feature,tendermatch_retrieval.pair_score,
 tendermatch_retrieval.run_pair,tendermatch_retrieval.retrieval_request,tendermatch_retrieval.retrieval_result,
 tendermatch_retrieval.scoring_batch,tendermatch_retrieval.assessment_job,tendermatch_retrieval.assessment_artifact,
 tendermatch_retrieval.human_disposition,tendermatch_retrieval.universe_snapshot,tendermatch_retrieval.universe_pair,
 tendermatch_retrieval.criterion_audit TO tendermatch_result_writer;
GRANT UPDATE(status) ON tendermatch_retrieval.evaluation_run TO tendermatch_result_writer;
GRANT UPDATE ON tendermatch_retrieval.scoring_batch,tendermatch_retrieval.assessment_job TO tendermatch_result_writer;
-- No DELETE, DDL, model registration, ownership, or schema-migration writes.
-- RLS tenant setting is a service trust boundary, not end-user authentication.
