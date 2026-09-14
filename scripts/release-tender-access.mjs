import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync, spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const project = 'tenderlab-ai-agents';
const runtime = `tenderapps-access@${project}.iam.gserviceaccount.com`;
const config = 'firebase.tenderapps-access.json';
const api = `https://cloudfunctions.googleapis.com/v2/projects/${project}/locations/europe-west1/functions/tenderappsAccess`;
const origins = ['https://tenderapps-ai.web.app', 'https://tenderapps-ai.firebaseapp.com'];

// The pinned CLI reports this one post-success policy warning as exit 1.
// Never suppress a deployment error or enable destructive image cleanup to hide it.
export function classifyDeploy(result) {
  if (result.error || result.signal) throw Error('Deployment process failed');
  if (result.status === 0) return 'success';
  const output = (result.stdout || '') + (result.stderr || '');
  const errors = output.split(/\r?\n/).filter(line => /^Error:/.test(line));
  if (result.status === 1 && errors.length === 1 &&
      errors[0].startsWith('Error: Functions successfully deployed but could not set up cleanup policy in location europe-west1.') &&
      /tenderappsAccess\(europe-west1\)\]? Successful update operation/.test(output)) return 'cleanup-policy-warning';
  throw Error('Gateway deployment did not complete successfully; Hosting was not published');
}

export function checkRuntime(value) {
  const service = value.serviceConfig;
  if (value.state !== 'ACTIVE' || value.buildConfig?.runtime !== 'nodejs22' ||
      service?.serviceAccountEmail !== runtime || service.maxInstanceCount !== 1 ||
      (service.minInstanceCount ?? 0) !== 0 || service.maxInstanceRequestConcurrency !== 20 ||
      service.timeoutSeconds !== 30 || service.availableMemory !== '256Mi' ||
      !/^https:\/\/tenderappsaccess-[a-z0-9-]+\.a\.run\.app$/.test(service.uri)) {
    throw Error('Gateway runtime identity or safety bounds differ');
  }
}

async function main() {
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main') {
    throw Error('Use the controlled canonical-main GitHub release workflow');
  }
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  if (sha !== process.env.GITHUB_SHA) throw Error('Source identity differs');
  const manifest = JSON.parse(fs.readFileSync('packages/tender-access/dist/private/manifest.json', 'utf8'));
  if (manifest.sourceCommit !== sha || Object.keys(manifest.files).length < 10) throw Error('Exact built manifest required');
  const publicDir = 'apps/tender-access-client/dist';
  const publicFiles = fs.readdirSync(publicDir, {recursive: true}).filter(name =>
    !name.split(/[\\/]/).some(part => part.startsWith('.')) && fs.statSync(path.join(publicDir, name)).isFile());
  if (publicFiles.some(name => name !== 'index.html' && !/^access-public\/[\w.-]+\.(js|css)$/.test(name.replaceAll('\\', '/')))) {
    throw Error('Unexpected public artifact: refusing Hosting release');
  }
  const token = execFileSync('gcloud', ['auth', 'print-access-token'], {encoding: 'utf8'}).trim();
  const headers = {Authorization: `Bearer ${token}`, 'x-goog-user-project': project};
  async function readFunction() {
    const response = await fetch(api, {headers});
    if (!response.ok) throw Error(`Function inspection failed: ${response.status}`);
    return response.json();
  }
  const before = await readFunction(); checkRuntime(before);
  // Confirm the starting release is the approved access bootstrap, not maintenance or unknown content.
  for (const origin of origins) {
    const response = await fetch(origin, {redirect: 'manual'});
    const html = await response.text();
    if (response.status !== 200 || !html.includes('/access-public/') || !response.headers.get('content-security-policy')?.includes("object-src 'none'")) {
      throw Error('Unknown live Hosting profile; refusing release');
    }
  }
  const result = spawnSync('firebase', ['deploy', '--project', project, '--config', config,
    '--only', 'functions:tenderapps-access:tenderappsAccess', '--non-interactive'],
  {encoding: 'utf8', env: {...process.env, FUNCTIONS_DISCOVERY_TIMEOUT: '60', NO_COLOR: '1'}, maxBuffer: 8 * 1024 * 1024});
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  const outcome = classifyDeploy(result);
  const after = await readFunction(); checkRuntime(after);
  if (after.updateTime === before.updateTime || !after.buildConfig?.sourceProvenance?.resolvedStorageSource?.generation) {
    throw Error('New provider release was not verified; Hosting was not published');
  }
  execFileSync(process.execPath, ['scripts/check-tender-access-denial.mjs', after.serviceConfig.uri], {stdio: 'inherit'});
  execFileSync('firebase', ['deploy', '--project', project, '--config', config, '--only', 'hosting:tender-apps', '--non-interactive'], {stdio: 'inherit'});
  for (const origin of origins) {
    execFileSync(process.execPath, ['scripts/check-tender-access-denial.mjs', origin], {stdio: 'inherit'});
    for (const name of publicFiles) {
      const route = name === 'index.html' ? '/' : '/' + name.replaceAll('\\', '/');
      const response = await fetch(origin + route, {redirect: 'manual'});
      const bytes = Buffer.from(await response.arrayBuffer());
      if (response.status !== 200 || createHash('sha256').update(bytes).digest('hex') !==
          createHash('sha256').update(fs.readFileSync(path.join(publicDir, name))).digest('hex')) {
        throw Error('Live public artifact differs from tested release');
      }
    }
  }
  console.log(JSON.stringify({sourceCommit: sha, revision: after.serviceConfig.revision, outcome,
    hosting: 'Both domains verified by exact public hashes and protected-path denial',
    ownerCanary: 'Interactive authenticated hydration remains a separate verification'}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
