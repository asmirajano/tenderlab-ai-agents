import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const configuration = JSON.parse(fs.readFileSync(new URL('../firebase.tenderapps-access.json', import.meta.url), 'utf8'));
const csp = configuration.hosting.headers.flatMap(rule => rule.headers).find(header => header.key === 'Content-Security-Policy').value;
const directives = Object.fromEntries(csp.split(';').map(value => value.trim().split(/\s+/)).filter(([key]) => key).map(([key, ...values]) => [key, values]));

test('Google Auth and production App Check SDK endpoints are permitted explicitly', () => {
  // Firebase App Check uses content-firebaseappcheck, not the similarly named API origin alone.
  assert.ok(directives['script-src'].includes('https://apis.google.com'));
  for (const origin of ['https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://content-firebaseappcheck.googleapis.com']) {
    assert.ok(directives['connect-src'].includes(origin), `Missing SDK endpoint: ${origin}`);
  }
});

test('SDK compatibility does not introduce broad script or connection bypasses', () => {
  for (const directive of ['script-src', 'connect-src']) {
    assert.ok(!directives[directive].some(value => value === '*' || value === 'https:' || value.includes('*.')));
  }
  assert.ok(!directives['script-src'].includes("'unsafe-inline'"));
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
});
