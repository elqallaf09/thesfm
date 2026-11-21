import { randomBytes } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertDisposableConfiguration } from '../../scripts/economic-intelligence/local-rls-guard.mjs';

export function localSmokeTarget() {
  if (process.env.GITHUB_EVENT_NAME !== 'pull_request' || !process.env.RUNNER_TEMP || !process.env.GITHUB_OUTPUT) {
    throw new Error('Local PR Auth provisioning requires a pull-request runner.');
  }
  const status = JSON.parse(readFileSync(join(process.env.RUNNER_TEMP, 'sfm-local-status.json'), 'utf8'));
  const origin = assertDisposableConfiguration(status, process.env.SFM_RLS_DISPOSABLE);
  const credentials = ['user', 'admin'].map(role => ({
    role,
    email: role + '@sfm-smoke.example.com',
    password: randomBytes(32).toString('base64url'),
  }));
  return { origin, previewRef: 'disposable-smoke', serviceRoleKey: status.SERVICE_ROLE_KEY, anonKey: status.ANON_KEY, credentials };
}

export function exportLocalSmokeTarget(config) {
  const [user, admin] = config.credentials;
  const outputs = {
    NEXT_PUBLIC_SUPABASE_URL: config.origin,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: config.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: config.serviceRoleKey,
    SUPER_ADMIN_EMAILS: admin.email,
    E2E_USER_EMAIL: user.email,
    E2E_USER_PASSWORD: user.password,
    E2E_ADMIN_EMAIL: admin.email,
    E2E_ADMIN_PASSWORD: admin.password,
  };
  for (const [key, value] of Object.entries(outputs)) {
    if (!value || /[\r\n]/.test(value)) throw new Error('Invalid local smoke output: ' + key);
    process.stdout.write('::add-mask::' + value + '\n');
    appendFileSync(process.env.GITHUB_OUTPUT, key + '=' + value + '\n');
  }
}
