import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export const productionVault = path.join(process.env.LOCALAPPDATA ?? '', 'TenderMatch', 'production-results');
export async function secureDirectory(directory) {
  if (process.platform !== 'win32' || !process.env.LOCALAPPDATA) throw Error('Windows operator vault required');
  await fs.mkdir(directory, {recursive: true});
  const sid = execFileSync('whoami.exe', ['/user', '/fo', 'csv', '/nh'], {encoding:'utf8', windowsHide:true}).match(/S-1-[\d-]+/)?.[0];
  if (!sid) throw Error('Current user SID unavailable');
  execFileSync('icacls.exe', [directory, '/inheritance:r', '/grant:r', `*${sid}:(OI)(CI)F`], {windowsHide:true, stdio:'ignore'});
}
function crypt(bytes, decrypt = false) {
  const operation = decrypt ? 'Unprotect' : 'Protect';
  const command = `Add-Type -AssemblyName System.Security; $data=[Convert]::FromBase64String([Console]::In.ReadToEnd()); $out=[Security.Cryptography.ProtectedData]::${operation}($data,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write([Convert]::ToBase64String($out))`;
  return Buffer.from(execFileSync('powershell.exe', ['-NoProfile','-NonInteractive','-Command',command],
    {input:bytes.toString('base64'),encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','ignore']}), 'base64');
}
export async function saveProductionSecret(name, value) {
  if (!/^[a-z0-9-]+$/.test(name)) throw Error('Invalid production vault name');
  await secureDirectory(productionVault);
  const file = path.join(productionVault, name + '.dpapi');
  await fs.writeFile(file, crypt(Buffer.from(JSON.stringify(value))), {flag:'wx'});
  return file;
}
export async function loadProductionSecret(name) {
  if (!/^[a-z0-9-]+$/.test(name)) throw Error('Invalid production vault name');
  return JSON.parse(crypt(await fs.readFile(path.join(productionVault, name + '.dpapi')), true).toString('utf8'));
}
