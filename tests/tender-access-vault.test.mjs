import test from 'node:test';
import assert from 'node:assert/strict';
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
