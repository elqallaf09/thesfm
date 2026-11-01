import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDisposableConfiguration, assertLocalRequest, createLocalOnlyFetch, LOCAL_API } from './local-rls-guard.mjs';

const status = { API_URL: LOCAL_API, ANON_KEY: 'local-test-anon-placeholder', SERVICE_ROLE_KEY: 'local-test-admin-placeholder' };
test('accepts only an explicitly opted-in local stack', () => {
  assert.doesNotThrow(() => assertDisposableConfiguration(status, '1'));
  assert.throws(() => assertDisposableConfiguration(status, undefined));
  assert.throws(() => assertDisposableConfiguration({ ...status, ANON_KEY: '' }, '1'));
});
for (const url of [
  'https://example.supabase.co',
  'https://127.0.0.1:54321',
  'http://127.0.0.1:80',
  'http://127.0.0.1.example.com:54321',
  'http://127.0.0.1:54321@evil.example',
  'http://user:password@127.0.0.1:54321',
]) {
  test(`rejects unsafe target ${url}`, () => {
    assert.throws(() => assertLocalRequest(url));
    assert.throws(() => assertDisposableConfiguration({ ...status, API_URL: url }, '1'));
  });
}
test('accepts local auth and database paths including Request objects', () => {
  assert.equal(assertLocalRequest(`${LOCAL_API}/auth/v1/token`).origin, LOCAL_API);
  assert.equal(assertLocalRequest(new Request(`${LOCAL_API}/rest/v1/user_decisions`)).origin, LOCAL_API);
});
test('pins a custom ephemeral local stack to its exact origin', () => {
  const customApi = 'http://127.0.0.1:61123';
  assert.equal(assertDisposableConfiguration({ ...status, API_URL: customApi }, '1'), customApi);
  assert.equal(assertLocalRequest(`${customApi}/auth/v1/token`, customApi).origin, customApi);
  assert.throws(() => assertLocalRequest(`${LOCAL_API}/auth/v1/token`, customApi));
  const guarded = createLocalOnlyFetch(customApi);
  assert.equal(typeof guarded, 'function');
});
