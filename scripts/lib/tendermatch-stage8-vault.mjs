/** Local operator secrets only. Windows DPAPI CurrentUser, outside Git/static assets. */
import {execFileSync} from 'node:child_process';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';

export const vaultRoot = path.join(process.env.LOCALAPPDATA ?? '', 'TenderMatch', 'stage8-dev');
function protectedBytes(value, decrypt = false) {
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) throw new Error('Windows operator vault required');
  const operation = decrypt ? 'Unprotect' : 'Protect';
  const command = `Add-Type -AssemblyName System.Security; $bytes=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $result=[Security.Cryptography.ProtectedData]::${operation}($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($result))`;
  return Buffer.from(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {input: value.toString('base64'), encoding: 'utf8', windowsHide: true, stdio: ['pipe', 'pipe', 'ignore']}), 'base64');
}
function secretPath(name) {
  if (!/^[a-z0-9-]{3,64}$/.test(name)) throw new Error('Invalid vault name');
  return path.join(vaultRoot, name + '.dpapi');
}
export async function saveOperatorSecret(name, value) {
  const target = secretPath(name);
  await mkdir(vaultRoot, {recursive: true});
  const sid = execFileSync('whoami.exe', ['/user', '/fo', 'csv', '/nh'], {encoding: 'utf8', windowsHide: true}).match(/S-1-[\d-]+/)?.[0];
  if (!sid) throw new Error('Cannot restrict operator vault');
  execFileSync('icacls.exe', [vaultRoot, '/inheritance:r', '/grant:r', `*${sid}:(OI)(CI)F`], {windowsHide: true, stdio: 'ignore'});
  await writeFile(target, protectedBytes(Buffer.from(JSON.stringify(value))), {flag: 'wx'});
  return target;
}
export async function loadOperatorSecret(name) {
  return JSON.parse(protectedBytes(await readFile(secretPath(name)), true).toString('utf8'));
}
