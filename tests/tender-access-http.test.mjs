import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccessHandler, readSessionCookie} from '../packages/tender-access/http-handler.mjs';
import {AccessDenied} from '../packages/tender-access/server-policy.mjs';
function response() {
  return {headers: {}, statusCode: 200, setHeader(key, value) { this.headers[key] = value; }, end(value) { this.body = value; }};
}
test('cookie parser rejects absent, duplicate and malformed cookies', () => {
  assert.equal(readSessionCookie(), '');
  assert.equal(readSessionCookie('__session=abc; __session=def'), '');
  assert.equal(readSessionCookie('__session=abc%0d'), '');
  assert.equal(readSessionCookie('other=1; __session=abc.def'), 'abc.def');
});
test('private asset bytes never read before authorization', async () => {
  let reads = 0;
  const handler = createAccessHandler({authorize: async () => { throw new AccessDenied(401); },
    sessions: {}, resolveAsset: () => ({app: 'balance'}), readAsset: async () => { reads++; }});
  const res = response();
  await handler({url: '/assets/balance/private.js', method: 'GET', headers: {}}, res);
  assert.equal(res.statusCode, 401); assert.equal(reads, 0);
  assert.equal(res.headers['Cache-Control'], 'private, no-store');
});
test('manifest entitlement cannot be replaced by query parameter', async () => {
  let app;
  const handler = createAccessHandler({authorize: async (_, value) => { app = value; }, sessions: {},
    resolveAsset: () => ({app: 'match', contentType: 'text/javascript'}), readAsset: async () => 'verified bytes'});
  const res = response();
  await handler({url: '/assets/match/index.js?app=balance', method: 'GET', headers: {cookie: '__session=abc'}}, res);
  assert.equal(app, 'match'); assert.equal(res.body, 'verified bytes');
});
test('traversal and unknown files denied', async () => {
  const handler = createAccessHandler({authorize: async () => {}, sessions: {}, resolveAsset: () => null,
    readAsset: async () => { throw Error('must not read'); }});
  for (const url of ['/../secret', '/%2e%2e/secret', '//secret', '/unknown']) {
    const res = response(); await handler({url, method: 'GET', headers: {}}, res);
    assert.equal(res.statusCode, 404);
  }
});
test('login puts token only in secure HttpOnly cookie', async () => {
  const handler = createAccessHandler({authorize: async () => {}, resolveAsset: () => null, readAsset: async () => '',
    sessions: {login: async () => ({cookie: 'signed-cookie', maxAge: 86400, apps: ['balance']})}});
  const res = response();
  await handler({url: '/__access/login', method: 'POST', body: {}, headers: {'content-type': 'application/json'}}, res);
  assert.match(res.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=Strict/);
  assert.equal(res.body.includes('signed-cookie'), false);
});
