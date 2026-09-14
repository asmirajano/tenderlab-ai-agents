-- Not executed by Stage 1. Later rollback needs explicit authority.
-- Refuse to erase registered input boundaries, and preserve all Stage 0 objects.
DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
 OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 THEN RAISE EXCEPTION 'Stage 1 rollback target mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM tendermatch_retrieval.input_manifest)
 OR EXISTS(SELECT 1 FROM tendermatch_retrieval.input_member)
 OR EXISTS(SELECT 1 FROM tendermatch_retrieval.input_capture)
 THEN RAISE EXCEPTION 'Input evidence exists; retention decision required'; END IF;
END $$;
DROP TABLE tendermatch_retrieval.input_capture;
DROP TABLE tendermatch_retrieval.input_member;
DROP TABLE tendermatch_retrieval.input_manifest;
DROP FUNCTION tendermatch_retrieval.guard_input_member_insert();
DROP FUNCTION tendermatch_retrieval.check_input_membership_complete();
DELETE FROM tendermatch_retrieval.schema_migration WHERE version='20260906-input-manifest-v1';
