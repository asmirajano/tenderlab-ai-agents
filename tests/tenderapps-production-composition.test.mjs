import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const read = name => fs.readFileSync(path.join(root, name));
const json = name => JSON.parse(read(name));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const manifest = json('dist/tenderapps-production/tenderapps-release.json');
test('all three production route families own distinct build artifacts', () => {
  assert.equal(manifest.products.length, 3);
  assert.equal(new Set(manifest.products.map(p => p.entry)).size, 3);
  const config = json('firebase.tenderapps.json').hosting;
  assert.deepEqual(json('firebase.json').hosting.find(h => h.target === 'tender-apps'), config);
  for (const p of manifest.products) {
    const html = read(`dist/tenderapps-production/${p.entry}`);
    assert.equal(sha(html), p.htmlSha256);
    assert.ok(html.toString().includes(`content="${p.id}"`));
    assert.ok(p.assets.length >= 2);
    for (const asset of p.assets) {
      assert.ok(asset.path.startsWith(`/assets/${p.id}/`));
      assert.equal(sha(read(`dist/tenderapps-production${asset.path}`)), asset.sha256);
    }
    for (const route of p.routes.slice(0, p.id === 'match' ? 3 : 2)) assert.equal(config.rewrites.find(r => r.source === route)?.destination, '/' + p.entry);
  }
});
test('composition preserves catalog, public snapshot and OCR bytes without credentials', () => {
  assert.deepEqual(read('dist/tenderapps-production/index.html'), read('apps/tender-apps/dist/index.html'));
  for (const relative of ['ocr/tesseract-worker.min.js', 'ocr/eng.traineddata.gz', 'tendermatch/data/pair-index-v2.json']) assert.deepEqual(read(`dist/tenderapps-production/${relative}`), read(`apps/tender-apps/dist/${relative}`));
  const paths = fs.readdirSync(path.join(root, 'dist/tenderapps-production'), {recursive:true});
  assert.ok(!paths.some(p => /(?:\.env|\.dpapi|session-pointer|\.map$)/.test(p)));
  const text = manifest.products.flatMap(p => p.assets.filter(a => a.path.endsWith('.js')).map(a => read(`dist/tenderapps-production${a.path}`).toString())).join('\n');
  assert.ok(!text.includes('ProtectedData') && !text.includes('LocalCache') && !text.includes('BEGIN PRIVATE KEY'));
  assert.equal(manifest.matchMode, 'static-pinned-snapshot');
});
