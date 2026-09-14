/** One-shot loopback intake for the explicitly approved, newly created Console key. */
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {saveOperatorSecret} from './lib/tendermatch-stage8-vault.mjs';

const nonce = randomBytes(24).toString('hex');
const route = '/' + nonce;
let accepting = true;
const server = createServer({maxHeaderSize: 8192}, async (req, res) => {
  const origin = `http://127.0.0.1:${server.address().port}`;
  const headers = {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'", 'Referrer-Policy': 'same-origin'};
  if (req.url !== route || req.headers.host !== new URL(origin).host) {res.writeHead(404, headers); res.end('Not found'); return;}
  if (req.method === 'GET') {res.writeHead(200, headers); res.end('<!doctype html><title>TenderMatch secure deployment-key intake</title><h1>Project-scoped Stage 8 deployment key</h1><p>Saved only in the Windows CurrentUser encrypted vault. Not sent to another service.</p><form method="post"><label>New Neon project API key <input name="key" type="password" autocomplete="off" required></label><button>Save encrypted key</button></form>'); return;}
  if (req.method !== 'POST' || req.headers.origin !== origin || !accepting) {res.writeHead(403, headers); res.end('Denied'); return;}
  accepting = false;
  try {
    let body = ''; for await (const chunk of req) {body += chunk; if (body.length > 4096) throw new Error('Size');}
    const key = new URLSearchParams(body).get('key');
    if (!key || !/^[A-Za-z0-9_-]{32,256}$/.test(key)) throw new Error('Format');
    await saveOperatorSecret('neon-project-deploy', {key, projectId: 'dry-union-87553313', branchId: 'br-polished-boat-b1qddx0m', purpose: 'Stage 8 isolated development Functions', savedAt: new Date().toISOString()});
    res.writeHead(200, headers); res.end('<!doctype html><title>Key saved</title><h1>Encrypted key saved</h1><p>No credential is displayed or retained in this page.</p>');
    console.log('Project key encrypted with Windows CurrentUser DPAPI; no credential output.');
    server.close();
  } catch {res.writeHead(400, headers); res.end('Key was not saved. Retry requires restarting the intake.'); server.close();}
});
server.requestTimeout = 5000; server.headersTimeout = 5000; server.maxConnections = 2;
server.listen(0, '127.0.0.1', () => console.log(`http://127.0.0.1:${server.address().port}${route}`));
setTimeout(() => server.close(), 600000).unref();
