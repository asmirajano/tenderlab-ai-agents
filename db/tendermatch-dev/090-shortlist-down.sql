-- DESTRUCTIVE owner-only rollback, not authorized by the Stage 6 handoff.
-- Requires separate explicit approval and exact development target verification.
DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner' OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m' THEN RAISE EXCEPTION 'Stage 6 rollback target mismatch'; END IF;
END $$;
DROP TABLE tendermatch_retrieval.shortlist_completion;
DROP TABLE tendermatch_retrieval.shortlist_pair;
DROP TABLE tendermatch_retrieval.shortlist_member;
DROP TABLE tendermatch_retrieval.shortlist_run;
DROP TABLE tendermatch_retrieval.shortlist_context;
DROP FUNCTION tendermatch_retrieval.check_shortlist_completion(),tendermatch_retrieval.guard_shortlist_pair(),tendermatch_retrieval.check_shortlist_members(),tendermatch_retrieval.guard_shortlist_member(),tendermatch_retrieval.guard_shortlist_context();
DROP FUNCTION tendermatch_retrieval.shortlist_focus_signature(text,text,text,uuid);
DROP FUNCTION tendermatch_retrieval.shortlist_focus_inputs(text,text,text,uuid);
DELETE FROM tendermatch_retrieval.schema_migration WHERE version='20260907-shortlist-stage6-v1';
