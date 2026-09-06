-- DESTRUCTIVE rollback: separate explicit approval, only the five Stage 5 objects.
-- Do not execute to diagnose or refresh a run. No CASCADE; Formula history survives.
DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
 OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 THEN RAISE EXCEPTION 'Stage 5 rollback target mismatch'; END IF;
END $$;
DROP TABLE tendermatch_retrieval.ranking_completion;
DROP TABLE tendermatch_retrieval.ranking_pair;
DROP TABLE tendermatch_retrieval.ranking_member;
DROP TABLE tendermatch_retrieval.ranking_run;
DROP TABLE tendermatch_retrieval.ranking_profile;
DROP FUNCTION tendermatch_retrieval.guard_ranking_profile(),tendermatch_retrieval.guard_ranking_member(),tendermatch_retrieval.check_ranking_membership(),tendermatch_retrieval.guard_ranking_pair(),tendermatch_retrieval.check_ranking_completion();
DELETE FROM tendermatch_retrieval.schema_migration WHERE version='20260906-ranking-stage5-v1';
