import assert from 'node:assert/strict';

export const LOCAL_API = 'http://127.0.0.1:54321';

export function assertDisposableConfiguration(status, enabled) {
  assert.equal(enabled, '1', 'Explicit disposable-local opt-in is required.');
  assert.equal(status?.API_URL, LOCAL_API, 'Refusing a non-local Supabase API.');
  for (const key of ['ANON_KEY', 'SERVICE_ROLE_KEY']) {
    assert.ok(typeof status[key] === 'string' && status[key].length > 20, `Missing local ${key}.`);
  }
}

export function assertLocalRequest(input) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  assert.equal(url.origin, LOCAL_API, 'The isolation probe cannot contact remote endpoints.');
  assert.equal(url.username, '', 'Credentials in an endpoint URL are forbidden.');
  assert.equal(url.password, '', 'Credentials in an endpoint URL are forbidden.');
  return url;
}

export function localOnlyFetch(input, init = {}) {
  assertLocalRequest(input);
  const timeout = AbortSignal.timeout(10_000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  return fetch(input, { ...init, signal, redirect: 'error' });
}
