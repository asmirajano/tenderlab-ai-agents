-- Runner refuses non-empty business tables and revokes the new login first.
-- No CASCADE, no automatic DROP DATABASE or DROP EXTENSION.
DROP TABLE tendermatch_retrieval.criterion_audit;
DROP TABLE tendermatch_retrieval.universe_pair;
DROP TABLE tendermatch_retrieval.universe_snapshot;
DROP TABLE tendermatch_retrieval.human_disposition;
DROP TABLE tendermatch_retrieval.assessment_artifact;
DROP TABLE tendermatch_retrieval.assessment_job;
DROP TABLE tendermatch_retrieval.scoring_batch;
DROP TABLE tendermatch_retrieval.retrieval_result;
DROP TABLE tendermatch_retrieval.retrieval_request;
DROP TABLE tendermatch_retrieval.run_pair;
DROP TABLE tendermatch_retrieval.run_feature;
DROP TABLE tendermatch_retrieval.pair_score;
DROP TABLE tendermatch_retrieval.evaluation_run;
DROP TABLE tendermatch_retrieval.feature_embedding;
DROP TABLE tendermatch_retrieval.embedding_model;
DROP TABLE tendermatch_retrieval.normalized_feature;
DROP TABLE tendermatch_retrieval.schema_migration;
DROP FUNCTION tendermatch_retrieval.check_universe_score();
DROP FUNCTION tendermatch_retrieval.check_complete_criterion_audit();
DROP FUNCTION tendermatch_retrieval.check_criterion_extent();
DROP FUNCTION tendermatch_retrieval.reject_immutable_change();
DROP SCHEMA tendermatch_retrieval;
DROP ROLE tendermatch_result_writer;
