import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'packages/tender-access');
const output = path.join(root, 'build/tender-access-release');
fs.mkdirSync(output, {recursive: true});
for (const file of fs.readdirSync(source).filter(file => file.endsWith('.mjs'))) fs.copyFileSync(path.join(source, file), path.join(output, file));
fs.cpSync(path.join(source, 'dist'), path.join(output, 'dist'), {recursive: true});
const manifest = JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8'));
// Google runtime is a standalone npm package; repository installation remains pnpm.
delete manifest.packageManager;
delete manifest.files;
fs.writeFileSync(path.join(output, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.copyFileSync(path.join(source, 'package-lock.json'), path.join(output, 'package-lock.json'));
fs.writeFileSync(path.join(output, '.env.tenderlab-ai-agents'), 'TENDER_ACCESS_APP_ID=1:398180283651:web:57dd419ed20dbfc5322536\n');
console.log('Prepared standalone Functions package with its versioned runtime lockfile.');
