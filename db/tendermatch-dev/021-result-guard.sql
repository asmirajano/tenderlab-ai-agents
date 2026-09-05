DO $$ BEGIN
 IF current_database()<>'tendermatch_results_dev' OR current_user<>'neondb_owner'
    OR current_setting('tendermatch.approved_branch_id',true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
 THEN RAISE EXCEPTION 'TenderMatch result target guard failed'; END IF;
 IF EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='registry') THEN
   RAISE EXCEPTION 'Result store must never contain the source registry'; END IF;
END $$;
