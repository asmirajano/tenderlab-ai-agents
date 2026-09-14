import {gcm} from '@noble/ciphers/aes.js';
import {bytesToHex, hexToBytes, randomBytes} from '@noble/ciphers/utils.js';
import {gzipSync, gunzipSync} from 'fflate';

export const isCaseKey = key => /^tenderapps[.:]/.test(key) && !key.startsWith('tenderapps:vault:');
export function createCaseVault({storage, uid, keyHex, adoptLegacy = false}) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !/^[a-f0-9]{64}$/.test(keyHex)) throw Error('Invalid case-vault identity');
  const secret = hexToBytes(keyHex);
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  const location = key => `tenderapps:vault:1:${uid}:${key}`;
  const seal = (key, value) => {
    const nonce = randomBytes(12);
    const ciphertext = gcm(secret, nonce, encoder.encode(location(key))).encrypt(gzipSync(encoder.encode(value), {mtime: 0}));
    return JSON.stringify({version: 2, nonce: bytesToHex(nonce), ciphertext: bytesToHex(ciphertext)});
  };
  const open = (key, value) => {
    const record = JSON.parse(value);
    if (![1, 2].includes(record.version)) throw Error('Unsupported case-vault version');
    const bytes = gcm(secret, hexToBytes(record.nonce), encoder.encode(location(key))).decrypt(hexToBytes(record.ciphertext));
    return decoder.decode(record.version === 2 ? gunzipSync(bytes) : bytes);
  };
  return {
    async prepare(keys, backup) {
      // Compact already encrypted entries in place before allocating another copy.
      for (const key of keys) {
        const current = storage.getItem(location(key));
        if (current !== null && JSON.parse(current).version === 1) {
          const plaintext = open(key, current);
          const compact = seal(key, plaintext);
          if (compact.length < current.length) storage.setItem(location(key), compact);
        }
      }
      // Recover an interrupted migration only when neither live form exists.
      for (const record of await backup.list()) {
        if (record.pending === false) continue;
        if (storage.getItem(location(record.key)) === null && storage.getItem(record.key) === null) {
          open(record.key, record.encrypted);
          storage.setItem(location(record.key), record.encrypted);
        }
        if (storage.getItem(location(record.key)) !== null && storage.getItem(record.key) === null) {
          open(record.key, storage.getItem(location(record.key)));
          await backup.put({...record, pending: false});
        }
      }
      if (!adoptLegacy) return;
      for (const key of keys) {
        const original = storage.getItem(key);
        if (original === null) continue;
        const existing = storage.getItem(location(key));
        if (existing !== null && open(key, existing) !== original) throw Error('Conflicting saved-case versions require review');
        const encrypted = existing ?? seal(key, original);
        // Commit + independent readback in a separate browser store before freeing localStorage.
        await backup.put({key, encrypted, pending: true});
        const verified = await backup.get(key);
        if (!verified || open(key, verified.encrypted) !== original) throw Error('Recovery checkpoint verification failed');
        if (storage.getItem(key) !== original) throw Error('Saved case changed during migration');
        storage.removeItem(key);
        // If this fails, the verified encrypted recovery checkpoint remains available.
        storage.setItem(location(key), encrypted);
        if (open(key, storage.getItem(location(key))) !== original) throw Error('Case preservation verification failed');
        await backup.put({key, encrypted, pending: false});
      }
    },
    getItem(key) {
      const encrypted = storage.getItem(location(key));
      if (encrypted !== null) return open(key, encrypted);
      if (!adoptLegacy) return null;
      const legacy = storage.getItem(key);
      if (legacy === null) return null;
      this.setItem(key, legacy);
      // Delete plaintext only after an exact decrypt/readback check succeeds.
      if (open(key, storage.getItem(location(key))) !== legacy) throw Error('Case preservation verification failed');
      storage.removeItem(key);
      return legacy;
    },
    setItem(key, value) { storage.setItem(location(key), seal(key, String(value))); },
    removeItem(key) { storage.removeItem(location(key)); if (adoptLegacy) storage.removeItem(key); },
    lock() { secret.fill(0); },
  };
}
