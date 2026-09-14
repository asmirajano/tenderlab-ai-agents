import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {onRequest} from 'firebase-functions/v2/https';
import {defineString} from 'firebase-functions/params';
import {createFirebaseAdapters} from './firebase-adapters.mjs';
import {createAccessHandler} from './http-handler.mjs';

const appId = defineString('TENDER_ACCESS_APP_ID');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist/private');
let handler;
async function initialize() {
  const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !manifest.files || !/^[a-f0-9]{40}$/.test(manifest.sourceCommit)) {
    throw new Error('Validated private release required');
  }
  const adapters = createFirebaseAdapters({...process.env, TENDER_ACCESS_APP_ID: appId.value()});
  return createAccessHandler({...adapters,
    resolveAsset: url => Object.hasOwn(manifest.files, url) ? manifest.files[url] : null,
    readAsset: async entry => {
      if (!/^(balance|logistics|match)$/.test(entry.app) ||
          typeof entry.file !== 'string' || entry.file.includes('..') || entry.file.includes('\\') || entry.file.startsWith('/')) {
        throw new Error('Invalid private asset');
      }
      const bytes = await fs.readFile(path.join(root, entry.file));
      if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error('Asset integrity failure');
      return bytes;
    },
  });
}

export const tenderappsAccess = onRequest({region: 'europe-west1', memory: '256MiB',
  minInstances: 0, maxInstances: 1, concurrency: 20, timeoutSeconds: 30,
  serviceAccount: 'tenderapps-access@tenderlab-ai-agents.iam.gserviceaccount.com',
  invoker: 'public', cors: false}, async (req, res) => {
  try { handler ??= await initialize(); await handler(req, res); }
  catch { res.set('Cache-Control', 'no-store').status(503).json({error: 'Service unavailable'}); }
});
