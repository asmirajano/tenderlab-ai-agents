import fs from 'node:fs';
const origin = process.argv[2];
if (!origin || !/^https:\/\/[a-z0-9.-]+$/.test(origin)) throw Error('Exact HTTPS origin required');
const manifest = JSON.parse(fs.readFileSync('packages/tender-access/dist/private/manifest.json', 'utf8'));
const paths = [...Object.keys(manifest.files), '/__access/me', '/assets/nonexistent.js', '/data/nonexistent.json'];
const failures = [];
for (const path of paths) {
  const response = await fetch(origin + path, {redirect: 'manual', headers: {Cookie: '__session=invalid-canary-cookie'}});
  const body = await response.text();
  if (![401, 403, 404].includes(response.status) || !response.headers.get('cache-control')?.includes('no-store') ||
      body.length > 200 || body.includes('<script')) failures.push({path, status: response.status});
}
console.log(JSON.stringify({origin, sourceCommit: manifest.sourceCommit, checked: paths.length, failures}));
if (failures.length) process.exitCode = 1;
