import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'packages/tender-access/dist/private');
// Only reproducible output is replaced, never saved browser cases or source.
fs.mkdirSync(output, {recursive: true});
const files = {};
const clientManifest = JSON.parse(fs.readFileSync(path.join(root, 'apps/tender-access-client/dist/.vite/manifest.json'), 'utf8'));
const guard = clientManifest['src/runtime-guard.js']?.file;
if (!guard || !/^access-public\/[A-Za-z0-9._-]+\.js$/.test(guard)) throw new Error('Build the runtime guard first');
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'};
const routes = {balance: ['/balance-sheet-review', '/tenderbalance'],
  logistics: ['/landed-cost', '/logistics-costing'],
  match: ['/tendermatch', '/tenderboost', '/tenderboost-ai', '/tendermatch/campaigns', '/tendermatch/followups',
    '/tenderboost/campaigns', '/tenderboost-ai/followups']};
for (const app of Object.keys(routes)) {
  const source = path.join(root, 'apps', `tender-${app}`, 'dist');
  function copy(relative = '') {
    for (const item of fs.readdirSync(path.join(source, relative), {withFileTypes: true})) {
      if (item.name.startsWith('.')) continue;
      const name = path.posix.join(relative, item.name);
      if (item.isSymbolicLink()) throw new Error('Symlink in release');
      if (item.isDirectory()) { copy(name); continue; }
      const contentType = name === 'ocr/eng.traineddata.gz' ? 'application/gzip' : types[path.extname(name)];
      if (!item.isFile() || !contentType) throw new Error(`Unreviewed artifact type: ${name}`);
      let bytes = fs.readFileSync(path.join(source, name));
      if (name === 'index.html') {
        const html = bytes.toString('utf8');
        const entry = html.match(/<script\b[^>]*\bsrc="(\/assets\/[^"]+\.js)"[^>]*><\/script>/);
        if (!entry) throw new Error('Application module entry required');
        bytes = Buffer.from(html.replace(entry[0], `<meta name="tenderapps-entry" content="${entry[1]}"><script type="module" src="/${guard}"></script>`));
      }
      const file = `${app}/${name}`;
      const target = path.join(output, file);
      fs.mkdirSync(path.dirname(target), {recursive: true}); fs.writeFileSync(target, bytes);
      const entry = {app, file, contentType, sha256: createHash('sha256').update(bytes).digest('hex')};
      if (name === 'index.html') { for (const route of routes[app]) files[route] = entry; }
      else {
        const url = '/' + name;
        if (files[url]) throw new Error(`Cross-app asset collision needs explicit ownership: ${url}`);
        files[url] = entry;
      }
    }
  }
  copy();
}
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify({schemaVersion: 1, sourceCommit, files}, null, 2));
console.log(`Prepared ${Object.keys(files).length} manifest-bound paths; not deployed`);
