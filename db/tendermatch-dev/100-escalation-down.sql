-- Destructive Stage 7 history removal. Separate explicit approval required; never auto-run.
DO $$ BEGIN IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
 OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 OR current_setting('tendermatch.allow_destructive_stage7_rollback',true) IS DISTINCT FROM 'yes'
 THEN RAISE EXCEPTION 'Explicit Stage 7 destructive rollback approval required';END IF;END $$;
DROP TABLE tendermatch_retrieval.escalation_event;
DROP TABLE tendermatch_retrieval.escalation_artifact;
DROP TABLE tendermatch_retrieval.escalation_job;
DROP TABLE tendermatch_retrieval.escalation_authorization;
DROP TABLE tendermatch_retrieval.escalation_request;
DROP TABLE tendermatch_retrieval.escalation_decision;
DROP TABLE tendermatch_retrieval.escalation_plan;
DROP FUNCTION tendermatch_retrieval.check_escalation_artifact_completion(),tendermatch_retrieval.guard_escalation_artifact(),tendermatch_retrieval.log_escalation_job(),tendermatch_retrieval.guard_escalation_job(),tendermatch_retrieval.guard_escalation_request(),tendermatch_retrieval.check_escalation_plan(),tendermatch_retrieval.guard_escalation_decision();
DELETE FROM tendermatch_retrieval.schema_migration WHERE version='20260907-escalation-stage7-v1';
