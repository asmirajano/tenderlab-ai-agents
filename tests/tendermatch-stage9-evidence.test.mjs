import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const sha=v=>createHash('sha256').update(v).digest('hex');
test('Stage 9 actual browser evidence is bound to final source, screenshots and protected release DOM',{skip:process.env.TENDERMATCH_STAGE9_EVIDENCE!=='1'},async()=>{
  const read=path=>readFile(new URL('../'+path,import.meta.url));
  const evidence=JSON.parse(await read('docs/evidence/tendermatch-stage9-browser.json'));
  assert.equal(evidence.mode,'SYNTHETIC_LOCAL_POSTGRESQL_NOT_NEON');assert.equal(evidence.base,'ae466ae3f15b5e7eddf1a8dfab96b2d847321c4f');
  assert.equal(evidence.uiLineage,'d230590cf5ee99a679f162b2e3a19b65752c0f16');
  assert.ok(evidence.checks.length>=21);assert.equal(evidence.errors.length,0);assert.equal(evidence.modelCalls,0);assert.equal(evidence.neonConnections,0);assert.equal(evidence.sourceConnections,0);
  assert.deepEqual(evidence.fixture,{universe:240,candidates:182,unscored:58,shortlist:112});assert.ok(evidence.metrics.maxApiBytes<=524288);
  assert.deepEqual(Object.values(evidence.zeroExecution),[0,0,0]);assert.equal(evidence.protectedViews.length,2);assert.ok(evidence.screenshots.some(s=>s.viewport.width===390));
  for(const [path,expected] of Object.entries(evidence.sources))assert.equal(sha((await read(path)).toString().replaceAll('\r\n','\n')),expected,path);
  for(const screenshot of evidence.screenshots)assert.equal(sha(await read(screenshot.path)),screenshot.sha256,screenshot.path);
});
