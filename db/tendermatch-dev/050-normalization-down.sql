-- Operator-reviewed rollback only; runner never invokes this automatically.
-- Preserves normalized features and Stage 1 manifests. Archive outcomes first.
BEGIN;
DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
 OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 THEN RAISE EXCEPTION 'Wrong rollback target'; END IF;
END $$;
DROP TABLE tendermatch_retrieval.normalization_member;
DROP TABLE tendermatch_retrieval.normalization_snapshot;
DROP FUNCTION tendermatch_retrieval.guard_normalization_member();
DROP FUNCTION tendermatch_retrieval.check_normalization_complete();
DELETE FROM tendermatch_retrieval.schema_migration WHERE version='20260906-normalization-v1';
COMMIT;
