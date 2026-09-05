-- Nontransactional, separate action; runner checks source DB/owner/branch/host
-- and refuses an existing database. Not part of source-up. No database cloning.
CREATE DATABASE tendermatch_results_dev OWNER neondb_owner;
