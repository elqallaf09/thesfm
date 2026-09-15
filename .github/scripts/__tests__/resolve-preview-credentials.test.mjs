import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolvePreviewCredentials, writePreviewCredentials } from '../resolve-preview-credentials.mjs';

const ref = 'a'.repeat(20);
const env = { SUPABASE_PREVIEW_REF: ref, SUPABASE_PRODUCTION_REF: 'b'.repeat(20),
  SUPABASE_PREVIEW_URL: `https://${ref}.supabase.co`, SUPABASE_ACCESS_TOKEN: 'synthetic-test-token' };
const jwt = (claims = {}) => `test.${Buffer.from(JSON.stringify({ ref, role: 'service_role', ...claims })).toString('base64url')}.test`;
const records = key => [{ name: 'service_role', type: 'legacy', api_key: key }];
const response = values => async () => ({ ok: true, json: async () => values });

test('retrieves only the resolved branch, with bounded non-redirecting requests', async () => {
  const key = jwt();
  assert.equal(await resolvePreviewCredentials(env, async (url, init) => {
    assert.equal(url, `https://api.supabase.com/v1/projects/${ref}/api-keys?reveal=true`);
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
    return { ok: true, json: async () => records(key) };
  }), key);
});
test('rejects Production, malformed refs, mismatched origins and missing tokens before fetching', async () => {
  for (const change of [{ SUPABASE_PREVIEW_REF: env.SUPABASE_PRODUCTION_REF },
    { SUPABASE_PREVIEW_REF: '../../elsewhere' }, { SUPABASE_PREVIEW_URL: 'https://wrong.example' },
    { SUPABASE_ACCESS_TOKEN: '' }]) {
    await assert.rejects(resolvePreviewCredentials({ ...env, ...change }, () => assert.fail('must not fetch')));
  }
});
test('never exposes an API error body or a network exception containing a credential', async () => {
  await assert.rejects(resolvePreviewCredentials(env, async () => ({ ok: false, status: 401 })), /HTTP 401\.$/);
  await assert.rejects(resolvePreviewCredentials(env, async () => { throw new Error('secret-body'); }), error => !error.message.includes('secret-body'));
});
test('rejects missing, disabled, ambiguous and non-JWT credentials', async () => {
  for (const values of [null, {}, [], [{ ...records(jwt())[0], disabled: true }],
    [...records(jwt()), ...records(jwt())], records('sb_secret_synthetic'), records('a.???.c')]) {
    await assert.rejects(resolvePreviewCredentials(env, response(values)));
  }
});
test('rejects wrong-branch, non-service-role, expired and newline-containing keys', async () => {
  for (const key of [jwt({ ref: env.SUPABASE_PRODUCTION_REF }), jwt({ role: 'anon' }), jwt({ exp: 1 }), `${jwt()}\nX=1`]) {
    await assert.rejects(resolvePreviewCredentials(env, response(records(key))));
  }
});
test('masks before writing only to the job environment', async () => {
  const calls = [];
  const key = jwt();
  await writePreviewCredentials({ ...env, GITHUB_ENV: '/tmp/synthetic-env' }, response(records(key)),
    value => calls.push(['log', value]), (...values) => calls.push(['append', ...values]));
  assert.deepEqual(calls[0], ['log', `::add-mask::${key}`]);
  assert.deepEqual(calls[1], ['append', '/tmp/synthetic-env', `SUPABASE_SERVICE_ROLE_KEY=${key}\n`, { encoding: 'utf8', mode: 0o600 }]);
  assert.ok(!calls[2][1].includes(key));
  await assert.rejects(writePreviewCredentials(env, () => assert.fail('must not fetch')), /GITHUB_ENV/);
});
test('CI resolves credentials after target isolation and before provisioning, never a static cross-branch key', () => {
  const workflow = readFileSync(new URL('../../workflows/ci.yml', import.meta.url), 'utf8');
  const job = workflow.slice(workflow.indexOf('\n  authenticated-preview:'));
  assert.ok(!job.includes('secrets.SUPABASE_PREVIEW_SERVICE_ROLE_KEY'));
  assert.ok(job.indexOf('Validate resolved isolated Supabase Preview target') < job.indexOf('Resolve branch-specific Preview credentials'));
  assert.ok(job.indexOf('Resolve branch-specific Preview credentials') < job.indexOf('Provision isolated Preview auth fixtures'));
  assert.match(job, /SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
  assert.match(job, /steps\.preview-credentials\.outcome != 'success'/);
});
test('unrelated local smoke validation still requires its own service-role key', () => {
  const workflow = readFileSync(new URL('../../workflows/ci.yml', import.meta.url), 'utf8');
  const job = workflow.slice(workflow.indexOf('\n  smoke:'), workflow.indexOf('\n  lighthouse:'));
  assert.match(job, /SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.SUPABASE_SERVICE_ROLE_KEY \}\}/);
  assert.match(job, /          SUPABASE_SERVICE_ROLE_KEY \\/);
  assert.ok(!job.includes('SUPABASE_ACCESS_TOKEN'));
});
