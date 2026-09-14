import test from 'node:test';
import assert from 'node:assert/strict';
import {createCipheriv} from 'node:crypto';
import {createCaseVault} from '../apps/tender-access-client/src/case-vault.js';
const keyHex = '01'.repeat(32);
function storage() {
  const map = new Map();
  return {map, getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value), removeItem: key => map.delete(key)};
}
test('case plaintext is encrypted, round-trips, and cannot be read by another account', () => {
  const store = storage();
  const owner = createCaseVault({storage: store, uid: 'owner', keyHex});
  owner.setItem('tenderapps:case', 'private financial case');
  assert.equal(owner.getItem('tenderapps:case'), 'private financial case');
  assert.equal([...store.map.values()].join('').includes('private financial case'), false);
  const other = createCaseVault({storage: store, uid: 'other', keyHex: '02'.repeat(32)});
  assert.equal(other.getItem('tenderapps:case'), null);
});
test('authorized legacy adoption verifies encrypted copy before removing plaintext', () => {
  const store = storage(); store.setItem('tenderapps:case', 'original case');
  const owner = createCaseVault({storage: store, uid: 'owner', keyHex, adoptLegacy: true});
  assert.equal(owner.getItem('tenderapps:case'), 'original case');
  assert.equal(store.getItem('tenderapps:case'), null);
  assert.equal(owner.getItem('tenderapps:case'), 'original case');
});
test('failed encrypted save preserves legacy original', () => {
  const store = storage(); store.setItem('tenderapps:case', 'original');
  store.setItem = () => { throw Error('quota'); };
  const owner = createCaseVault({storage: store, uid: 'owner', keyHex, adoptLegacy: true});
  assert.throws(() => owner.getItem('tenderapps:case'), /quota/);
  assert.equal(store.getItem('tenderapps:case'), 'original');
});
test('unapproved account cannot adopt plaintext; tampering fails', () => {
  const store = storage(); store.setItem('tenderapps:case', 'original');
  const owner = createCaseVault({storage: store, uid: 'owner', keyHex});
  assert.equal(owner.getItem('tenderapps:case'), null);
  owner.setItem('tenderapps:case', 'secure');
  const entry = [...store.map.keys()].find(key => key.includes(':vault:'));
  const record = JSON.parse(store.getItem(entry)); record.ciphertext = (parseInt(record.ciphertext.slice(0, 2), 16) ^ 1).toString(16).padStart(2, '0') + record.ciphertext.slice(2);
  store.setItem(entry, JSON.stringify(record));
  assert.throws(() => owner.getItem('tenderapps:case'));
});

function recovery() {
  const map = new Map();
  return {map, put: async record => map.set(record.key, {...record}), get: async key => map.get(key), list: async () => [...map.values()]};
}

test('full localStorage migration checkpoints before freeing space and preserves exact case', async () => {
  const store = storage(), backup = recovery();
  const original = JSON.stringify({notes: 'A substantial saved financial case. '.repeat(4000)});
  store.setItem('tenderapps:case', original);
  const limit = original.length + 10;
  store.setItem = (key, value) => {
    const size = [...store.map].filter(([existing]) => existing !== key).reduce((total, [, text]) => total + text.length, 0) + value.length;
    if (size > limit) throw new DOMException('Full', 'QuotaExceededError');
    store.map.set(key, value);
  };
  const owner = createCaseVault({storage: store, uid: 'owner', keyHex, adoptLegacy: true});
  await owner.prepare(['tenderapps:case'], backup);
  assert.equal(owner.getItem('tenderapps:case'), original);
  assert.equal(store.getItem('tenderapps:case'), null);
  assert.ok(backup.map.size === 1);
  assert.ok(!JSON.stringify([...backup.map.values()]).includes('substantial saved'));
});

test('failed checkpoint cannot remove the original case', async () => {
  const store = storage(), backup = recovery(); store.setItem('tenderapps:case', 'original');
  backup.put = async () => { throw Error('Disk full'); };
  const owner = createCaseVault({storage: store, uid: 'owner', keyHex, adoptLegacy: true});
  await assert.rejects(owner.prepare(['tenderapps:case'], backup), /Disk full/);
  assert.equal(store.getItem('tenderapps:case'), 'original');
});

test('interrupted primary write recovers from a verified encrypted checkpoint on next startup', async () => {
  const store = storage(), backup = recovery(); store.setItem('tenderapps:case', 'original');
  const write = store.setItem; store.setItem = () => { throw Error('Quota'); };
  const owner = createCaseVault({storage: store, uid: 'owner', keyHex, adoptLegacy: true});
  await assert.rejects(owner.prepare(['tenderapps:case'], backup), /Quota/);
  assert.equal(backup.map.size, 1);
  store.setItem = write;
  await owner.prepare([], backup);
  assert.equal(owner.getItem('tenderapps:case'), 'original');
});

test('old uncompressed vault records remain readable and compact without data change', async () => {
  const store = storage(), original = 'Legacy financial case. '.repeat(1000);
  const location = 'tenderapps:vault:1:owner:tenderapps:case';
  const cipher = createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), Buffer.alloc(12));
  cipher.setAAD(Buffer.from(location));
  const bytes = Buffer.concat([cipher.update(original), cipher.final(), cipher.getAuthTag()]);
  const old = JSON.stringify({version: 1, nonce: '00'.repeat(12), ciphertext: bytes.toString('hex')});
  store.setItem(location, old);
  const owner = createCaseVault({storage: store, uid: 'owner', keyHex, adoptLegacy: true});
  assert.equal(owner.getItem('tenderapps:case'), original);
  await owner.prepare(['tenderapps:case'], recovery());
  assert.equal(owner.getItem('tenderapps:case'), original);
  assert.ok(store.getItem(location).length < old.length / 4);
});

test('conflicting legacy and encrypted versions are preserved for review', async () => {
  const store = storage(), backup = recovery();
  const owner = createCaseVault({storage: store, uid: 'owner', keyHex, adoptLegacy: true});
  owner.setItem('tenderapps:case', 'encrypted version'); store.setItem('tenderapps:case', 'other version');
  await assert.rejects(owner.prepare(['tenderapps:case'], backup), /Conflicting/);
  assert.equal(store.getItem('tenderapps:case'), 'other version');
  assert.equal(owner.getItem('tenderapps:case'), 'encrypted version');
});

test('completed checkpoint does not resurrect a deliberately deleted case', async () => {
  const store = storage(), backup = recovery(); store.setItem('tenderapps:case', 'original');
  const owner = createCaseVault({storage: store, uid: 'owner', keyHex, adoptLegacy: true});
  await owner.prepare(['tenderapps:case'], backup);
  owner.removeItem('tenderapps:case');
  await owner.prepare([], backup);
  assert.equal(owner.getItem('tenderapps:case'), null);
});
