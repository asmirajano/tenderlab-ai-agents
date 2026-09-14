/** Stage 2A read-only source boundary. No tender connection or pair execution. */
import pg from 'pg';
import { secret } from '../tendermatch-input-manifest.mjs';
import { DEV_TARGET as T, guardUrl } from './tendermatch-dev-contract.mjs';
import { captureFeatureSource } from './tendermatch-normalization.mjs';
import { TENANT, sha, inventoryDigest } from './tendermatch-input-manifest.mjs';

export const STAGE2_MANIFEST = 'e928df5e6a432fa23c8ea95dbfbf1aee4f1c883646d5ed72fd2856d994102ac2';
export const STAGE2_BASE = 'c1cdb6fb7070d62602bc44d09abadec4e7c35581';

async function connect(kind) {
  const source = kind === 'source';
  const url = guardUrl(await secret(source ? T.consumerSecretFile : T.writerSecretFile,
    source ? T.consumerVariable : T.writerVariable), kind, source ? T.consumerLogin : T.writerLogin);
  const client = new pg.Client({ connectionString: url.href, enableChannelBinding: true,
    connectionTimeoutMillis: 15000, query_timeout: 30000 });
  client.on('error', () => {});
  try {
    await client.connect();
    const { rows: [identity] } = await client.query('SELECT current_database() database, current_user role');
    if (identity.database !== (source ? T.sourceDatabase : T.resultDatabase)
      || identity.role !== (source ? T.consumerLogin : T.writerLogin)) throw new Error('Target mismatch');
    return client;
  } catch { await client.end().catch(() => {}); throw new Error('Readiness source connection/identity failed'); }
}

export async function readPinnedSuppliers() {
  const source = await connect('source');
  let capture;
  try { capture = await captureFeatureSource(source, 'supplier'); }
  finally { await source.end(); }
  const results = await connect('results');
  try {
    await results.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await results.query("SELECT set_config('tendermatch.tenant_id',$1,true)", [TENANT]);
    const { rows: [header] } = await results.query('SELECT identity FROM tendermatch_retrieval.input_manifest WHERE tenant_id=$1 AND manifest_id=$2', [TENANT, STAGE2_MANIFEST]);
    const { rows: members } = await results.query("SELECT kind,entity_id::text,provenance FROM tendermatch_retrieval.input_member WHERE tenant_id=$1 AND manifest_id=$2 AND kind='supplier' ORDER BY entity_id", [TENANT, STAGE2_MANIFEST]);
    if (!header || sha(header.identity) !== STAGE2_MANIFEST || members.length !== 117
      || sha(inventoryDigest(members)) !== sha(header.identity.supplier)
      || sha(members) !== sha(capture.captured.members)) throw new Error('Supplier inputs differ from accepted Stage 2; no recapture adoption');
    return { schemaVersion: 'tendermatch-readiness-input/1.0.0', stage2Base: STAGE2_BASE,
      stage2ManifestId: STAGE2_MANIFEST, supplierInventoryHash: sha(inventoryDigest(members)),
      source: capture.source, sourceHash: sha(capture.source), metrics: capture.metrics,
      databaseWrites: 0, tenderConnections: 0 };
  } finally { await results.query('ROLLBACK'); await results.end(); }
}
