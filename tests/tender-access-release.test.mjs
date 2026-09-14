import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyDeploy, checkRuntime} from '../scripts/release-tender-access.mjs';

test('release does not hide arbitrary CLI failures', () => {
  assert.equal(classifyDeploy({status: 0}), 'success');
  for (const result of [{status: 1, stderr: 'Error: Permission denied'}, {status: null, signal: 'SIGTERM'},
    {status: 1, stdout: 'Functions successfully deployed but could not set up cleanup policy'}]) {
    assert.throws(() => classifyDeploy(result));
  }
});
test('nonzero exits are never softened into success', () => {
  const stdout = 'functions[tenderappsAccess(europe-west1)] Successful update operation.\n';
  const stderr = 'Error: Functions successfully deployed but could not set up cleanup policy in location europe-west1. Pass the --force option';
  assert.throws(() => classifyDeploy({status: 1, stdout, stderr}));
  assert.throws(() => classifyDeploy({status: 1, stdout, stderr: stderr + '\nError: Other failure'}));
  assert.throws(() => classifyDeploy({status: 1, stdout: '', stderr}));
});
test('release refuses unexpected runtime bounds and identity', () => {
  const value = {state: 'ACTIVE', buildConfig: {runtime: 'nodejs22'}, serviceConfig: {
    serviceAccountEmail: 'tenderapps-access@tenderlab-ai-agents.iam.gserviceaccount.com',
    maxInstanceCount: 1, maxInstanceRequestConcurrency: 20, timeoutSeconds: 30, availableMemory: '256Mi',
    uri: 'https://tenderappsaccess-qhihxd3c5q-ew.a.run.app',
  }};
  assert.doesNotThrow(() => checkRuntime(value));
  for (const patch of [{maxInstanceCount: 10}, {minInstanceCount: 1}, {serviceAccountEmail: 'other'}, {uri: 'https://wrong.example.com'}]) {
    assert.throws(() => checkRuntime({...value, serviceConfig: {...value.serviceConfig, ...patch}}));
  }
});
