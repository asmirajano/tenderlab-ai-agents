import {gcm} from '@noble/ciphers/aes.js';
import {bytesToHex, hexToBytes, randomBytes} from '@noble/ciphers/utils.js';

export const isCaseKey = key => /^tenderapps[.:]/.test(key) && !key.startsWith('tenderapps:vault:');
export function createCaseVault({storage, uid, keyHex, adoptLegacy = false}) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid) || !/^[a-f0-9]{64}$/.test(keyHex)) throw Error('Invalid case-vault identity');
  const secret = hexToBytes(keyHex);
  const encoder = new TextEncoder(), decoder = new TextDecoder();
  const location = key => `tenderapps:vault:1:${uid}:${key}`;
  const seal = (key, value) => {
    const nonce = randomBytes(12);
    const ciphertext = gcm(secret, nonce, encoder.encode(location(key))).encrypt(encoder.encode(value));
    return JSON.stringify({version: 1, nonce: bytesToHex(nonce), ciphertext: bytesToHex(ciphertext)});
  };
  const open = (key, value) => {
    const record = JSON.parse(value);
    if (record.version !== 1) throw Error('Unsupported case-vault version');
    return decoder.decode(gcm(secret, hexToBytes(record.nonce), encoder.encode(location(key))).decrypt(hexToBytes(record.ciphertext)));
  };
  return {
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
