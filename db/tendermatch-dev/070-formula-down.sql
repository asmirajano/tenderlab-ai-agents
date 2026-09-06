-- Prepared rollback only. Never discard populated immutable scoring history.
DO $$ DECLARE n text;populated boolean; BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner' OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m' THEN RAISE EXCEPTION 'Stage 4 rollback target mismatch'; END IF;
 FOREACH n IN ARRAY ARRAY['formula_input','formula_run','formula_member','formula_pair','formula_completion'] LOOP
  IF EXISTS(SELECT FROM pg_class WHERE relname=n) THEN EXECUTE format('SELECT EXISTS(SELECT 1 FROM tendermatch_retrieval.%I LIMIT 1)',n) INTO populated;IF populated THEN RAISE EXCEPTION 'Populated Formula ledger requires separate retention decision'; END IF; END IF;
 END LOOP;
END $$;
DROP TABLE tendermatch_retrieval.formula_completion,tendermatch_retrieval.formula_pair,tendermatch_retrieval.formula_member,tendermatch_retrieval.formula_run,tendermatch_retrieval.formula_input;
DROP FUNCTION tendermatch_retrieval.check_formula_completion(),tendermatch_retrieval.guard_formula_pair(),tendermatch_retrieval.check_formula_membership(),tendermatch_retrieval.guard_formula_member();
DELETE FROM tendermatch_retrieval.schema_migration WHERE version='20260906-formula-stage4-v1';
