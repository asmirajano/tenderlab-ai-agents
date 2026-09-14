import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthorizer, assertProductionConfiguration} from '../packages/tender-access/server-policy.mjs';

const identity = {uid: 'test-owner', email: 'owner@example.invalid', email_verified: true,
  aud: 'tenderlab-ai-agents', iss: 'https://session.firebase.google.com/tenderlab-ai-agents',
  firebase: {sign_in_provider: 'google.com'}};
const member = {uid: identity.uid, email: identity.email, enabled: true,
  apps: {balance: 'admin', logistics: 'user'}};
const setup = (claims = identity, membership = member) => createAuthorizer({
  verifySessionCookie: async (cookie, revoked) => { assert.equal(revoked, true); return claims; },
  getMembership: async () => membership,
});

test('authorized Google user gets only explicitly granted app roles', async () => {
  assert.deepEqual(await setup()('verified-test-cookie', 'balance', {admin: true}),
    {uid: identity.uid, app: 'balance', role: 'admin'});
  await assert.rejects(setup()('cookie', 'match'), {status: 403});
  await assert.rejects(setup()('cookie', 'logistics', {admin: true}), {status: 403});
});
test('unknown, disabled, mismatched and malformed memberships deny access', async () => {
  for (const record of [null, {}, {...member, enabled: false}, {...member, uid: 'other'},
    {...member, email: 'other@example.invalid'}, {...member, apps: {balance: 'owner'}}]) {
    await assert.rejects(setup(identity, record)('cookie', 'balance'), {status: 403});
  }
});
test('unverified, non-Google and wrong-project identity denied', async () => {
  for (const claims of [null, {...identity, uid: ''}, {...identity, email_verified: false},
    {...identity, aud: 'development'}, {...identity, iss: 'wrong'},
    {...identity, firebase: {sign_in_provider: 'password'}}]) {
    await assert.rejects(setup(claims)('cookie', 'balance'), {status: 401});
  }
});
test('missing, invalid and revoked sessions fail closed', async () => {
  await assert.rejects(setup()('', 'balance'), {status: 401});
  const auth = createAuthorizer({verifySessionCookie: async () => { throw Error('revoked'); },
    getMembership: async () => member});
  await assert.rejects(auth('cookie', 'balance'), {status: 401});
});
test('membership changes take effect on subsequent requests; outages deny', async () => {
  let enabled = true;
  const auth = createAuthorizer({verifySessionCookie: async () => identity,
    getMembership: async () => ({...member, enabled})});
  await auth('cookie', 'balance');
  enabled = false;
  await assert.rejects(auth('cookie', 'balance'), {status: 403});
  const outage = createAuthorizer({verifySessionCookie: async () => identity,
    getMembership: async () => { throw Error('unavailable'); }});
  await assert.rejects(outage('cookie', 'balance'), {status: 503});
});
test('unknown apps and production emulator/bypass settings are rejected', async () => {
  await assert.rejects(setup()('cookie', '__proto__'), {status: 403});
  assertProductionConfiguration({GCLOUD_PROJECT: 'tenderlab-ai-agents'});
  assert.throws(() => assertProductionConfiguration({GCLOUD_PROJECT: 'dev'}));
  for (const flag of ['FIREBASE_AUTH_EMULATOR_HOST', 'FIRESTORE_EMULATOR_HOST', 'AUTH_BYPASS', 'VITE_AUTH_BYPASS']) {
    assert.throws(() => assertProductionConfiguration({GCLOUD_PROJECT: 'tenderlab-ai-agents', [flag]: 'true'}));
  }
});
test('app-scoped logout denies older cookies without changing other Firebase applications', async () => {
  await assert.rejects(setup({...identity, iat: 100}, {...member, revokedBefore: 100})('cookie', 'balance'), {status: 401});
  assert.equal((await setup({...identity, iat: 101}, {...member, revokedBefore: 100})('cookie', 'balance')).role, 'admin');
});
