// Encrypted, per-account migration checkpoints only. Never upload browser case contents.
export async function openCaseRecovery(uid) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('tenderapps-encrypted-case-recovery', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('checkpoints');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Recovery store blocked'));
  });
  const prefix = `${uid}:`;
  const transaction = (mode, operation) => new Promise((resolve, reject) => {
    const tx = db.transaction('checkpoints', mode);
    const request = operation(tx.objectStore('checkpoints'));
    tx.oncomplete = () => resolve(request.result);
    tx.onabort = () => reject(tx.error ?? new Error('Recovery transaction aborted'));
    tx.onerror = () => reject(tx.error);
  });
  return {
    put: record => transaction('readwrite', store => store.put(record, prefix + record.key)),
    get: key => transaction('readonly', store => store.get(prefix + key)),
    list: () => transaction('readonly', store => store.getAll(IDBKeyRange.bound(prefix, prefix + '\uffff'))),
    close: () => db.close(),
  };
}
