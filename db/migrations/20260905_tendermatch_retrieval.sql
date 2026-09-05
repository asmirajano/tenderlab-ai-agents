-- TenderMatch retrieval/ranking v1. Apply only to an explicitly authorized database.
-- Requires PostgreSQL 16+ and pgvector >= 0.8.0 (iterative HNSW filtering).
-- No connection credentials, source data or grants to PUBLIC are installed here.
BEGIN;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS tendermatch_retrieval;
REVOKE ALL ON SCHEMA tendermatch_retrieval FROM PUBLIC;

CREATE TABLE tendermatch_retrieval.schema_migration (
  version text PRIMARY KEY, installed_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO tendermatch_retrieval.schema_migration(version) VALUES ('20260905-retrieval-v1');

CREATE TABLE tendermatch_retrieval.normalized_feature (
  tenant_id text NOT NULL, feature_key text NOT NULL, kind text NOT NULL CHECK (kind IN ('supplier','tender')),
  entity_id text NOT NULL, input_version text NOT NULL, feature_version text NOT NULL,
  evidence_snapshot text NOT NULL, content_hash text NOT NULL CHECK (length(content_hash)=64),
  procurement_type text NOT NULL, geography text[] NOT NULL, terms text[] NOT NULL, concepts text[] NOT NULL,
  feature jsonb NOT NULL, search_document tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(feature->>'title', feature->>'displayName','') || ' ' || coalesce(feature->>'terms',''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (tenant_id,feature_key),
  UNIQUE (tenant_id,kind,entity_id,input_version,feature_version,content_hash)
);
CREATE INDEX feature_entity_version ON tendermatch_retrieval.normalized_feature (tenant_id,kind,entity_id,input_version);
CREATE INDEX feature_lexical ON tendermatch_retrieval.normalized_feature USING gin (search_document);
CREATE INDEX feature_concepts ON tendermatch_retrieval.normalized_feature USING gin (concepts);
CREATE INDEX feature_geography ON tendermatch_retrieval.normalized_feature USING gin (geography);

CREATE TABLE tendermatch_retrieval.embedding_model (
  model_version text PRIMARY KEY, dimensions integer NOT NULL CHECK (dimensions=384),
  operator_class text NOT NULL DEFAULT 'vector_cosine_ops' CHECK (operator_class='vector_cosine_ops'),
  provider text NOT NULL, enabled boolean NOT NULL DEFAULT false, registered_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tendermatch_retrieval.feature_embedding (
  model_version text NOT NULL REFERENCES tendermatch_retrieval.embedding_model(model_version),
  tenant_id text NOT NULL, feature_key text NOT NULL, input_hash text NOT NULL CHECK(length(input_hash)=64),
  embedding vector(384) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (model_version,tenant_id,feature_key),
  FOREIGN KEY (tenant_id,feature_key) REFERENCES tendermatch_retrieval.normalized_feature(tenant_id,feature_key)
) PARTITION BY LIST (model_version);
-- Register a provider/model version, then explicitly create its LIST partition.
-- No default partition: vectors from different models never share an ANN index.
-- New partitions inherit this cosine HNSW index; m=16 / ef_construction=64 are
-- pgvector defaults. Measure filtered recall vs exact search before promotion.
-- Query tuning: hnsw.ef_search 40..1000, iterative_scan=strict_order; overfetch
-- each channel, then RRF. Neither cosine similarity nor RRF enters Formula points.
CREATE INDEX feature_embedding_hnsw ON tendermatch_retrieval.feature_embedding
  USING hnsw (embedding vector_cosine_ops) WITH (m=16,ef_construction=64);

CREATE TABLE tendermatch_retrieval.evaluation_run (
  tenant_id text NOT NULL, run_id text NOT NULL, formula_version text NOT NULL,
  feature_version text NOT NULL, input_identity text NOT NULL, evaluated_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'PREPARING' CHECK(status IN ('PREPARING','SCORING','COMPLETE','FAILED')),
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,run_id)
);
CREATE TABLE tendermatch_retrieval.run_feature (
  tenant_id text NOT NULL, run_id text NOT NULL, kind text NOT NULL, entity_id text NOT NULL, feature_key text NOT NULL,
  PRIMARY KEY(tenant_id,run_id,kind,entity_id),
  FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.evaluation_run(tenant_id,run_id),
  FOREIGN KEY(tenant_id,feature_key) REFERENCES tendermatch_retrieval.normalized_feature(tenant_id,feature_key)
);

CREATE TABLE tendermatch_retrieval.pair_score (
  tenant_id text NOT NULL, cache_key text NOT NULL, supplier_id text NOT NULL, tender_id text NOT NULL,
  pair_score smallint NOT NULL CHECK(pair_score BETWEEN 0 AND 100), denominator smallint NOT NULL DEFAULT 100 CHECK(denominator=100),
  data_coverage smallint NOT NULL CHECK(data_coverage BETWEEN 0 AND 100), evidence_confidence smallint NOT NULL CHECK(evidence_confidence BETWEEN 0 AND 100),
  assessed_fit_score smallint NOT NULL CHECK(assessed_fit_score BETWEEN 0 AND 100),
  supplier_version text NOT NULL, tender_version text NOT NULL, supplier_feature_hash text NOT NULL, tender_feature_hash text NOT NULL,
  formula_version text NOT NULL, policy_version text NOT NULL, feature_version text NOT NULL, evidence_snapshot text NOT NULL,
  main_limitation text NOT NULL, eligibility text NOT NULL CHECK(eligibility IN ('ELIGIBLE','OUTSIDE_SCORING_SCOPE','INELIGIBLE')),
  eligibility_reasons text[] NOT NULL, evaluated_at timestamptz NOT NULL,
  PRIMARY KEY(tenant_id,cache_key),
  UNIQUE(tenant_id,supplier_id,tender_id,supplier_feature_hash,tender_feature_hash,formula_version,policy_version)
);
-- Scores are immutable. Membership binds reusable results to a versioned run;
-- a formula/source change creates a new cache key and history is retained.
CREATE FUNCTION tendermatch_retrieval.reject_immutable_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Immutable TenderMatch history: insert a new version'; END $$;
CREATE TRIGGER immutable_pair_score BEFORE UPDATE OR DELETE ON tendermatch_retrieval.pair_score
  FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change();
CREATE TRIGGER immutable_feature BEFORE UPDATE OR DELETE ON tendermatch_retrieval.normalized_feature
  FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change();
CREATE TRIGGER immutable_embedding BEFORE UPDATE OR DELETE ON tendermatch_retrieval.feature_embedding
  FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change();

CREATE TABLE tendermatch_retrieval.run_pair (
  tenant_id text NOT NULL, run_id text NOT NULL, supplier_id text NOT NULL, tender_id text NOT NULL, cache_key text NOT NULL,
  -- Narrow duplicated sort columns avoid sorting/fetching the full verbose universe.
  pair_score smallint NOT NULL CHECK(pair_score BETWEEN 0 AND 100), eligibility text NOT NULL,
  PRIMARY KEY(tenant_id,run_id,supplier_id,tender_id),
  FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.evaluation_run(tenant_id,run_id),
  FOREIGN KEY(tenant_id,cache_key) REFERENCES tendermatch_retrieval.pair_score(tenant_id,cache_key)
);
CREATE INDEX run_pair_supplier_rank ON tendermatch_retrieval.run_pair(tenant_id,run_id,supplier_id,pair_score DESC,tender_id);
CREATE INDEX run_pair_tender_rank ON tendermatch_retrieval.run_pair(tenant_id,run_id,tender_id,pair_score DESC,supplier_id);
CREATE TRIGGER immutable_run_pair BEFORE UPDATE OR DELETE ON tendermatch_retrieval.run_pair
  FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change();
CREATE TRIGGER immutable_run_feature BEFORE UPDATE OR DELETE ON tendermatch_retrieval.run_feature
  FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change();

CREATE TABLE tendermatch_retrieval.retrieval_request (
  tenant_id text NOT NULL, run_id text NOT NULL, request_id text NOT NULL,
  policy_version text NOT NULL, model_version text REFERENCES tendermatch_retrieval.embedding_model(model_version),
  result_hash text NOT NULL CHECK(length(result_hash)=64), retrieved_at timestamptz NOT NULL,
  PRIMARY KEY(tenant_id,run_id,request_id),
  FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.evaluation_run(tenant_id,run_id)
);
CREATE TABLE tendermatch_retrieval.retrieval_result (
  tenant_id text NOT NULL, run_id text NOT NULL, request_id text NOT NULL, cache_key text NOT NULL,
  policy_version text NOT NULL, model_version text REFERENCES tendermatch_retrieval.embedding_model(model_version), relevance double precision NOT NULL CHECK(relevance>=0 AND relevance<1),
  semantic_similarity double precision CHECK(semantic_similarity BETWEEN -1 AND 1), channels jsonb NOT NULL,
  retrieved_at timestamptz NOT NULL, PRIMARY KEY(tenant_id,run_id,request_id,cache_key),
  FOREIGN KEY(tenant_id,run_id,request_id) REFERENCES tendermatch_retrieval.retrieval_request(tenant_id,run_id,request_id),
  FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.evaluation_run(tenant_id,run_id),
  FOREIGN KEY(tenant_id,cache_key) REFERENCES tendermatch_retrieval.pair_score(tenant_id,cache_key)
);
CREATE INDEX retrieval_result_rank ON tendermatch_retrieval.retrieval_result(tenant_id,run_id,request_id,relevance DESC,cache_key);
CREATE TRIGGER immutable_retrieval_request BEFORE UPDATE OR DELETE ON tendermatch_retrieval.retrieval_request
  FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change();
CREATE TRIGGER immutable_retrieval_result BEFORE UPDATE OR DELETE ON tendermatch_retrieval.retrieval_result
  FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change();

CREATE TABLE tendermatch_retrieval.scoring_batch (
  tenant_id text NOT NULL, run_id text NOT NULL, batch_id text NOT NULL, input_identity text NOT NULL,
  state text NOT NULL DEFAULT 'QUEUED' CHECK(state IN('QUEUED','LEASED','COMPLETE','FAILED')),
  cursor jsonb NOT NULL DEFAULT '{}', lease_token text, lease_owner text, lease_expires_at timestamptz,
  revision integer NOT NULL DEFAULT 1, attempts integer NOT NULL DEFAULT 0, error_code text,
  PRIMARY KEY(tenant_id,run_id,batch_id), FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.evaluation_run(tenant_id,run_id)
);
CREATE INDEX scoring_batch_ready ON tendermatch_retrieval.scoring_batch(tenant_id,run_id,state,lease_expires_at,batch_id);

CREATE TABLE tendermatch_retrieval.assessment_job (
  tenant_id text NOT NULL, run_id text NOT NULL, job_id text NOT NULL, idempotency_key text NOT NULL,
  cache_key text NOT NULL, identity jsonb NOT NULL, policy_version text NOT NULL, schema_version text NOT NULL,
  provider_version text, reasons text[] NOT NULL,
  state text NOT NULL CHECK(state IN('NOT_ESCALATED','DISABLED','QUEUED','LEASED','SUCCEEDED','RETRY_WAIT','FAILED','CANCELLED')),
  revision integer NOT NULL DEFAULT 1, attempts integer NOT NULL DEFAULT 0, max_attempts integer NOT NULL CHECK(max_attempts BETWEEN 1 AND 10),
  next_attempt_at timestamptz, lease_token text, lease_owner text, lease_expires_at timestamptz,
  last_error text, artifact_id text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
  PRIMARY KEY(tenant_id,job_id), UNIQUE(tenant_id,idempotency_key),
  FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.evaluation_run(tenant_id,run_id),
  FOREIGN KEY(tenant_id,cache_key) REFERENCES tendermatch_retrieval.pair_score(tenant_id,cache_key),
  CHECK(state IN('NOT_ESCALATED','DISABLED') OR provider_version IS NOT NULL)
);
CREATE INDEX assessment_job_ready ON tendermatch_retrieval.assessment_job(tenant_id,run_id,provider_version,state,next_attempt_at,lease_expires_at);
CREATE TABLE tendermatch_retrieval.assessment_artifact (
  tenant_id text NOT NULL, artifact_id text NOT NULL, job_id text NOT NULL, schema_version text NOT NULL,
  provider_version text NOT NULL, model_version text NOT NULL, prompt_version text NOT NULL, input_hash text NOT NULL,
  result jsonb NOT NULL, created_at timestamptz NOT NULL, PRIMARY KEY(tenant_id,artifact_id),
  FOREIGN KEY(tenant_id,job_id) REFERENCES tendermatch_retrieval.assessment_job(tenant_id,job_id)
);
CREATE TRIGGER immutable_assessment_artifact BEFORE UPDATE OR DELETE ON tendermatch_retrieval.assessment_artifact
  FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change();
CREATE TABLE tendermatch_retrieval.human_disposition (
  tenant_id text NOT NULL, run_id text NOT NULL, cache_key text NOT NULL, revision integer NOT NULL,
  disposition text NOT NULL CHECK(disposition IN('pending','hold','approved','rejected')),
  actor text NOT NULL, rationale text NOT NULL, decided_at timestamptz NOT NULL,
  PRIMARY KEY(tenant_id,run_id,cache_key,revision),
  FOREIGN KEY(tenant_id,run_id) REFERENCES tendermatch_retrieval.evaluation_run(tenant_id,run_id),
  FOREIGN KEY(tenant_id,cache_key) REFERENCES tendermatch_retrieval.pair_score(tenant_id,cache_key)
);
CREATE TRIGGER immutable_human_disposition BEFORE UPDATE OR DELETE ON tendermatch_retrieval.human_disposition
  FOR EACH ROW EXECUTE FUNCTION tendermatch_retrieval.reject_immutable_change();

-- Tenant identity must be server-authenticated before set_config; it must never
-- come from an untrusted query parameter. Table owners/superusers bypass RLS;
-- later production runtime must use an explicitly granted non-owner role.
DO $$ DECLARE name text; BEGIN
  FOREACH name IN ARRAY ARRAY['normalized_feature','feature_embedding','evaluation_run','run_feature','pair_score','run_pair','retrieval_request','retrieval_result','scoring_batch','assessment_job','assessment_artifact','human_disposition'] LOOP
    EXECUTE format('ALTER TABLE tendermatch_retrieval.%I ENABLE ROW LEVEL SECURITY',name);
    EXECUTE format('CREATE POLICY tenant_isolation ON tendermatch_retrieval.%I USING (tenant_id = current_setting(''tendermatch.tenant_id'',true)) WITH CHECK (tenant_id = current_setting(''tendermatch.tenant_id'',true))',name);
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA tendermatch_retrieval FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA tendermatch_retrieval FROM PUBLIC;
COMMIT;
