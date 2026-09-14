import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit } from '../scripts/check-product-boundaries.mjs';
import { validateDevelopmentSession } from '../apps/tender-match/src/tendermatch-all-to-all-api.ts';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8').replaceAll('\r\n','\n');
const contract = JSON.parse(read('docs/product-boundaries.json'));

test('Match preserves twenty selected UI files including the authenticated development interface', () => {
  const names = fs.readdirSync(path.join(root,'apps/tender-match/src')).filter(n=>n!=='main.tsx');
  assert.equal(names.length,20);
  for(const n of names) assert.equal(read('apps/tender-match/src/'+n),read('apps/tender-apps/src/'+n),n);
});
test('Match public snapshot and maps are exact copies, with no extra public files', () => {
  const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
  const source=path.join(root,'apps/tender-apps/public/tendermatch');
  const target=path.join(root,'apps/tender-match/public/tendermatch');
  const names=walk(source).map(f=>path.relative(source,f));
  assert.deepEqual(walk(target).map(f=>path.relative(target,f)),names);
  for(const n of names) assert.deepEqual(fs.readFileSync(path.join(target,n)),fs.readFileSync(path.join(source,n)),n);
  assert.deepEqual(fs.readdirSync(path.dirname(target)),['tendermatch']);
});
test('Match entry has no sibling-product or server-only imports', () => {
  const result=audit(root,contract);
  assert.deepEqual(result.errors,[]);
  const isolated=structuredClone(contract); isolated.domains=[]; isolated.logistics.entries=[]; isolated.products=isolated.products.filter(p=>p.name==='Match UI');
  assert.ok(audit(root,isolated).edges.every(e=>!e.to.startsWith('node:')&&!e.to.includes('/hosted-stage8')));
  isolated.products[0].files=isolated.products[0].files.filter(f=>!f.endsWith('/tendermatch-pair-api.ts'));
  assert.ok(audit(root,isolated).errors.some(e=>e.includes('forbidden dependency')));
});
test('Match authentication remains fail closed and extraction adds no session provisioning', () => {
  assert.throws(()=>validateDevelopmentSession(undefined),/DEVELOPMENT_SESSION_UNAVAILABLE/);
  const html=read('apps/tender-match/index.html');
  assert.doesNotMatch(html,/tendermatch-all-to-all-session|bearer|token/i);
  const config=read('apps/tender-match/vite.config.ts');
  assert.doesNotMatch(config,/proxy|4189|authorization/i);
  const main=read('apps/tender-match/src/main.tsx');
  assert.ok(main.includes('["/", "/tendermatch"]'));
  assert.ok(main.includes('Authenticated session required'));
  const pkg=JSON.parse(read('apps/tender-match/package.json'));
  assert.equal(pkg.scripts.dev,undefined); assert.equal(pkg.scripts.preview,undefined);
  assert.equal(pkg.dependencies.exceljs,'4.4.0');
});
