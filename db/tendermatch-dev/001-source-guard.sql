-- Execute inside the same transaction as source apply/rollback. The runner also
-- verifies the exact direct TLS host: PostgreSQL cannot prove Neon branch identity.
DO $$ BEGIN
  IF current_database() <> 'tender_entity_registry' OR current_user <> 'neondb_owner'
     OR current_setting('tendermatch.approved_branch_id', true) IS DISTINCT FROM 'br-polished-boat-b1qddx0m'
  THEN RAISE EXCEPTION 'TenderMatch source target guard failed'; END IF;
  IF (SELECT count(*) FROM registry.entities WHERE entity_type_code='company') <> 117
     OR EXISTS(SELECT 1 FROM registry.entities WHERE entity_type_code='company' AND verification_status IS DISTINCT FROM 'under_review')
     OR (SELECT count(*) FROM tendermatch_supplier_api.current_supplier_profiles) <> 17
  THEN RAISE EXCEPTION 'Approved source population or preserved 17-profile contract drifted'; END IF;
END $$;
