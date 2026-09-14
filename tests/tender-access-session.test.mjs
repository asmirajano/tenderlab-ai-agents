import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionService, SESSION_LIFETIME_MS} from '../packages/tender-access/session-service.mjs';
const now = 2_000_000_000_000;
const identity = {uid: 'synthetic-owner', email: 'owner@example.invalid', email_verified: true,
  aud: 'tenderlab-ai-agents', iss: 'https://securetoken.google.com/tenderlab-ai-agents',
  auth_time: now / 1000, firebase: {sign_in_provider: 'google.com'}};
const member = {uid: identity.uid, email: identity.email, enabled: true, apps: {balance: 'admin'}};
const input = {idToken: 'synthetic-token', appCheckToken: 'synthetic-proof',
  origin: 'https://tenderapps-ai.web.app', fetchSite: 'same-origin'};
function setup({claims = identity, membership = member, proof = {appId: 'test-app'}} = {}) {
  const calls = [];
  const service = createSessionService({expectedAppId: 'test-app', now: () => now,
    verifyAppCheck: async (_, options) => { assert.equal(options.consume, true); return proof; },
    getMembership: async () => membership,
    revokeAppSessions: async uid => { calls.push(uid); },
    auth: {
      verifyIdToken: async (_, revoked) => { assert.equal(revoked, true); return claims; },
      createSessionCookie: async (_, options) => { calls.push(options); return 'synthetic-cookie'; },
      verifySessionCookie: async () => claims,
      revokeRefreshTokens: async uid => { calls.push(uid); },
    }});
  return {service, calls};
}
test('fresh allowlisted Google login exchanges verified proof for bounded session', async () => {
  const {service, calls} = setup();
  assert.deepEqual(await service.login(input), {cookie: 'synthetic-cookie', maxAge: 86400, apps: ['balance']});
  assert.deepEqual(calls, [{expiresIn: SESSION_LIFETIME_MS}]);
});
test('cross-origin, absent-origin and localhost session creation denied', async () => {
  for (const origin of [undefined, 'https://attacker.invalid', 'http://127.0.0.1:6209']) {
    await assert.rejects(setup().service.login({...input, origin}), {status: 403});
  }
  await assert.rejects(setup().service.login({...input, fetchSite: 'cross-site'}), {status: 403});
});
test('replayed/wrong App Check proof denied', async () => {
  for (const proof of [{appId: 'other'}, {appId: 'test-app', alreadyConsumed: true}]) {
    await assert.rejects(setup({proof}).service.login(input), {status: 401});
  }
});
test('stale login, wrong issuer, unverified and non-Google identity denied', async () => {
  for (const claims of [{...identity, auth_time: now / 1000 - 301}, {...identity, auth_time: now / 1000 + 31},
    {...identity, iss: 'other'}, {...identity, email_verified: false}, {...identity, firebase: {sign_in_provider: 'password'}}]) {
    await assert.rejects(setup({claims}).service.login(input), {status: 401});
  }
});
test('Google success without matching enabled membership grants no cookie', async () => {
  for (const membership of [null, {...member, enabled: false}, {...member, uid: 'other'}, {...member, apps: {}}]) {
    const {service, calls} = setup({membership});
    await assert.rejects(service.login(input), {status: 403});
    assert.equal(calls.length, 0);
  }
});
test('logout verifies origin and revokes server sessions', async () => {
  const {service, calls} = setup();
  await assert.rejects(service.logout({cookie: 'cookie', origin: 'https://attacker.invalid'}), {status: 403});
  await service.logout({...input, cookie: 'cookie'});
  assert.deepEqual(calls, [identity.uid]);
});
