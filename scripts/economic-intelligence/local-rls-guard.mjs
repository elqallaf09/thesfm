import assert from 'node:assert/strict';

export const LOCAL_API = 'http://127.0.0.1:54321';

function localApiOrigin(value) {
  const url = new URL(value);
  assert.equal(url.protocol, 'http:', 'The disposable probe only permits local HTTP.');
  assert.equal(url.hostname, '127.0.0.1', 'The disposable probe only permits the IPv4 loopback host.');
  assert.equal(url.username, '', 'Credentials in a local endpoint URL are forbidden.');
  assert.equal(url.password, '', 'Credentials in a local endpoint URL are forbidden.');
  assert.equal(url.pathname, '/', 'The disposable API endpoint cannot include a path.');
  assert.equal(url.search, '', 'The disposable API endpoint cannot include a query.');
  assert.equal(url.hash, '', 'The disposable API endpoint cannot include a fragment.');
  const port = Number(url.port);
  assert.ok(Number.isInteger(port) && port >= 49152 && port <= 65535, 'The disposable API must use an ephemeral local port.');
  return url.origin;
}

export function assertDisposableConfiguration(status, enabled) {
  assert.equal(enabled, '1', 'Explicit disposable-local opt-in is required.');
  const api = localApiOrigin(status?.API_URL);
  for (const key of ['ANON_KEY', 'SERVICE_ROLE_KEY']) {
    assert.ok(typeof status[key] === 'string' && status[key].length > 20, `Missing local ${key}.`);
  }
  return api;
}

export function assertLocalRequest(input, api = LOCAL_API) {
  const allowed = localApiOrigin(api);
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  assert.equal(url.origin, allowed, 'The isolation probe cannot contact remote endpoints.');
  assert.equal(url.username, '', 'Credentials in an endpoint URL are forbidden.');
  assert.equal(url.password, '', 'Credentials in an endpoint URL are forbidden.');
  return url;
}

export function createLocalOnlyFetch(api = LOCAL_API) {
  const allowed = localApiOrigin(api);
  return function localOnlyFetch(input, init = {}) {
    assertLocalRequest(input, allowed);
    const timeout = AbortSignal.timeout(10_000);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetch(input, { ...init, signal, redirect: 'error' });
  };
}

export const localOnlyFetch = createLocalOnlyFetch();
