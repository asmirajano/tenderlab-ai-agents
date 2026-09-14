-- Operator-reviewed rollback only. NOT executed. Export development evidence first.
-- Exact target guard; no source, normalization, readiness, scoring or role changes.
DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
 OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 THEN RAISE EXCEPTION 'Stage 3 rollback target mismatch'; END IF;
END $$;
DROP TABLE tendermatch_retrieval.eligibility_completion;
DROP TABLE tendermatch_retrieval.eligibility_pair;
DROP TABLE tendermatch_retrieval.eligibility_member;
DROP TABLE tendermatch_retrieval.eligibility_run;
DROP TABLE tendermatch_retrieval.eligibility_input;
DROP FUNCTION tendermatch_retrieval.guard_eligibility_member(),tendermatch_retrieval.check_eligibility_membership(),tendermatch_retrieval.check_eligibility_completion();
DELETE FROM tendermatch_retrieval.schema_migration WHERE version='20260906-eligibility-v1';
