import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { parseOptions, runStage, summarize } from '../../scripts/performance/load-profile.mjs';

test('capacity plan defaults to dry-run with all requested levels', () => {
  const plan = parseOptions([]);
  assert.equal(plan.execute, false);
  assert.deepEqual(plan.users, [100, 500, 1000]);
});

test('refuses remote, credentialed, malformed and unbounded load plans', () => {
  for (const target of ['https://www.the-sfm.com', 'http://localhost:3000', 'http://127.0.0.1@evil.test',
    'http://127.0.0.1/?token=secret', 'http://127.0.0.1/api', 'http://user:secret@127.0.0.1']) {
    assert.throws(() => parseOptions(['--base-url', target]));
  }
  for (const args of [['--users', '100,100'], ['--users', '10000'], ['--duration-seconds', 'NaN'],
    ['--max-requests', '1000000'], ['--think-ms', '0'], ['--execute=false']]) {
    assert.throws(() => parseOptions(args));
  }
});

test('quantiles use observed samples and zero traffic is not success', () => {
  const result = summarize([10, 40, 20, 30], 1000, { 200: 3, 503: 1 }, 1);
  assert.equal(result.latencyMs.p95, 40);
  assert.equal(result.errorRate, 0.25);
  assert.equal(result.requestsPerSecond, 4);
  assert.equal(summarize([], 0, {}, 0).errorRate, null);
});

test('measures real local HTTP failures and never follows a redirect', async () => {
  let redirected = 0;
  const server = createServer((request, response) => {
    if (request.url === '/not-allowed') redirected += 1;
    response.writeHead(request.url === '/privacy' ? 503 : 302, { location: '/not-allowed' });
    response.end('test fixture, not application capacity evidence');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const plan = { ...parseOptions([]), baseUrl: `http://127.0.0.1:${server.address().port}`,
      durationSeconds: 5, maxRequests: 6, thinkMs: 10 };
    const result = await runStage(plan, 2);
    assert.equal(result.requests, 6);
    assert.equal(result.failures, 6);
    assert.equal(result.statuses['503'], 2);
    assert.equal(result.statuses['302'], 4);
    assert.equal(result.durationCovered, false);
    assert.equal(result.passed, false);
    assert.equal(redirected, 0);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('healthy sustained local requests pass while stalled bodies time out', async () => {
  let stall = false;
  const server = createServer((_request, response) => {
    response.writeHead(200);
    response.write('fixture');
    if (!stall) response.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const plan = { ...parseOptions([]), baseUrl: `http://127.0.0.1:${server.address().port}`,
      durationSeconds: 0.15, timeoutMs: 100, thinkMs: 10, maxRequests: 100 };
    const healthy = await runStage(plan, 1);
    assert.equal(healthy.passed, true);
    assert.equal(healthy.durationCovered, true);
    assert.equal(healthy.failures, 0);
    stall = true;
    const stalled = await runStage(plan, 1);
    assert.equal(stalled.passed, false);
    assert.equal(stalled.errorRate, 1);
    assert.ok(stalled.statuses.transport_or_body_error > 0);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
