import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { localSmokeTarget } from '../smoke/local-auth-target.mjs';

test('PR smoke uses two fresh accounts and refuses a hosted Auth endpoint', t => {
  const dir = mkdtempSync(join(tmpdir(), 'sfm-pr-smoke-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const env = { GITHUB_EVENT_NAME: 'pull_request', RUNNER_TEMP: dir, GITHUB_OUTPUT: join(dir, 'outputs'), SFM_RLS_DISPOSABLE: '1' };
  for (const [key, value] of Object.entries(env)) {
    const previous = process.env[key];
    process.env[key] = value;
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
  const status = { API_URL: 'http://127.0.0.1:54321', ANON_KEY: 'test-anon-key-for-local-stack', SERVICE_ROLE_KEY: 'test-service-key-for-local-stack' };
  const configFile = join(dir, 'sfm-local-status.json');
  writeFileSync(configFile, JSON.stringify(status));
  const target = localSmokeTarget();
  assert.deepEqual(target.credentials.map(c => c.role), ['user', 'admin']);
  assert.notEqual(target.credentials[0].email, target.credentials[1].email);
  assert.notEqual(target.credentials[0].password, localSmokeTarget().credentials[0].password);
  writeFileSync(configFile, JSON.stringify({ ...status, API_URL: 'https://example.supabase.co' }));
  assert.throws(localSmokeTarget, /local HTTP/);
  process.env.GITHUB_EVENT_NAME = 'push';
  assert.throws(localSmokeTarget, /pull-request runner/);
});
