import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist', 'tenderapps-production');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const products = [
  { id: 'logistics', app: 'tender-logistics', routes: ['/landed-cost', '/logistics-costing'] },
  { id: 'balance', app: 'tender-balance', routes: ['/balance-sheet-review', '/tenderbalance'] },
  { id: 'match', app: 'tender-match', routes: ['/tendermatch', '/tenderboost', '/tenderboost-ai', '/tendermatch/campaigns', '/tendermatch/followups', '/tenderboost/campaigns', '/tenderboost-ai/followups'] },
];
// This directory contains only reproducible build output, never application data.
if (output !== path.resolve(root, 'dist/tenderapps-production')) throw new Error('Unsafe output');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
function copy(source, relative = '', omitIndex = false) {
  for (const entry of fs.readdirSync(path.join(source, relative), { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const name = path.join(relative, entry.name);
    if (omitIndex && name === 'index.html') continue;
    if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink: ${name}`);
    if (entry.isDirectory()) { copy(source, name, omitIndex); continue; }
    if (!entry.isFile() || /(?:\.map|\.dpapi|\.env|session-pointer\.json)$/.test(name)) throw new Error(`Forbidden artifact: ${name}`);
    const bytes = fs.readFileSync(path.join(source, name)), target = path.join(output, name);
    if (fs.existsSync(target) && hash(fs.readFileSync(target)) !== hash(bytes)) throw new Error(`Artifact collision: ${name}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
}
// Root/catalog and compatibility assets stay intact; product routes use their own entries.
copy(path.join(root, 'apps/tender-apps/dist'));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const entries = [];
for (const product of products) {
  const source = path.join(root, 'apps', product.app, 'dist');
  copy(source, '', true);
  const html = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
  if (!html.includes(`/assets/${product.id}/`)) throw new Error(`Unisolated entry: ${product.id}`);
  const entry = `__apps/${product.id}.html`;
  const titles = { logistics: 'Tender Logistics', balance: 'TenderBalance', match: 'TenderMatch' };
  const annotated = html.replace(/<title>.*?<\/title>/, `<title>${titles[product.id]}</title>`).replace('</head>', `<meta name="tenderapps-product" content="${product.id}"><meta name="tenderapps-source" content="${sourceCommit}"></head>`);
  fs.mkdirSync(path.dirname(path.join(output, entry)), { recursive: true });
  fs.writeFileSync(path.join(output, entry), annotated);
  const assets = [...annotated.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(match => ({ path: match[1], sha256: hash(fs.readFileSync(path.join(output, match[1].slice(1)))) }));
  entries.push({ ...product, entry, htmlSha256: hash(annotated), assets });
}
fs.writeFileSync(path.join(output, 'tenderapps-release.json'), JSON.stringify({ schemaVersion: 1, sourceCommit, delivery: 'independent-builds-same-origin', matchMode: 'static-pinned-snapshot', products: entries }, null, 2) + '\n');
console.log(`Composed ${entries.length} independent applications at ${sourceCommit}`);
