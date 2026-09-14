import {createCaseVault, isCaseKey} from './case-vault.js';
import {openCaseRecovery} from './case-recovery.js';
let startupStage = 'session';

async function start() {
  const response = await fetch('/__access/me', {cache: 'no-store', credentials: 'same-origin'});
  if (!response.ok) { location.replace('/'); return; }
  const account = await response.json();
  startupStage = 'case-vault';
  const storage = window.localStorage;
  const originalGet = Storage.prototype.getItem;
  const originalSet = Storage.prototype.setItem;
  const originalRemove = Storage.prototype.removeItem;
  const vault = createCaseVault({uid: account.uid, keyHex: account.caseKey,
    adoptLegacy: account.adoptLegacy === true,
    storage: {getItem: key => originalGet.call(storage, key), setItem: (key, value) => originalSet.call(storage, key, value),
      removeItem: key => originalRemove.call(storage, key)}});
  const ownPrefix = `tenderapps:vault:1:${account.uid}:`;
  const caseKeys = [...new Set(Object.keys(storage).flatMap(key => key.startsWith(ownPrefix) ? [key.slice(ownPrefix.length)] : isCaseKey(key) ? [key] : []))];
  startupStage = 'case-preservation';
  if (account.adoptLegacy) {
    // Explicitly visible conversion notice; never upload case content to the server.
    const notice = document.createElement('p');
    notice.textContent = 'Securing your existing local saved cases for this account. Case contents stay in this browser.';
    document.body.prepend(notice);
    const recovery = await openCaseRecovery(account.uid);
    try { await vault.prepare(caseKeys, recovery); } finally { recovery.close(); }
    notice.remove();
  }
  startupStage = 'storage-adapter';
  Storage.prototype.getItem = function (key) { return this === storage && isCaseKey(String(key)) ? vault.getItem(String(key)) : originalGet.call(this, key); };
  Storage.prototype.setItem = function (key, value) { return this === storage && isCaseKey(String(key)) ? vault.setItem(String(key), value) : originalSet.call(this, key, value); };
  Storage.prototype.removeItem = function (key) { return this === storage && isCaseKey(String(key)) ? vault.removeItem(String(key)) : originalRemove.call(this, key); };
  startupStage = 'session-events';
  const channel = new BroadcastChannel('tenderapps-access');
  const lock = () => { vault.lock(); location.replace('/'); };
  channel.onmessage = lock;
  const button = document.createElement('button');
  button.textContent = 'Sign out'; button.type = 'button';
  button.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;padding:10px 16px;background:#184d41;color:white;border:1px solid white;border-radius:9px;cursor:pointer';
  button.onclick = async () => {
    button.disabled = true;
    const result = await fetch('/__access/logout', {method: 'POST', credentials: 'same-origin'}).catch(() => null);
    if (result?.ok) { channel.postMessage('logout'); lock(); }
    else { button.disabled = false; button.textContent = 'Retry sign out'; }
  };
  document.body.append(button);
  addEventListener('pageshow', event => { if (event.persisted) lock(); });
  addEventListener('focus', async () => {
    const result = await fetch('/__access/me', {cache: 'no-store', credentials: 'same-origin'}).catch(() => null);
    if (!result?.ok || (await result.json()).uid !== account.uid) lock();
  });
  startupStage = 'application-entry';
  const entry = document.querySelector('meta[name="tenderapps-entry"]')?.content;
  if (!/^\/assets\/(balance|logistics|match)\/[A-Za-z0-9._-]+\.js$/.test(entry ?? '')) throw Error('Invalid application entry');
  await import(/* @vite-ignore */ entry);
}
start().catch(error => {
  document.body.replaceChildren();
  const message = document.createElement('p');
  const kind = ['Error', 'TypeError', 'ReferenceError', 'SecurityError', 'QuotaExceededError'].includes(error?.name) ? error.name : 'Error';
  message.textContent = `Application could not open safely (${startupStage}: ${kind}). Saved cases were not discarded. Return to sign-in and contact the administrator.`;
  const link = document.createElement('a'); link.href = '/'; link.textContent = 'Return to sign-in';
  document.body.append(message, link);
});
