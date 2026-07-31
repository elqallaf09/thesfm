import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);

// Next.js reports "Ready" as soon as it binds the listening socket, but the
// first request afterwards still pays a one-time cost (route/module
// evaluation, cold caches) that can run into the seconds on a loaded CI
// runner. Lighthouse's first collection run then measures that cold request
// instead of steady-state performance. This wrapper waits for the server to
// answer real HTTP requests and absorbs that one-time cost with a fixed,
// bounded number of warmup requests before telling Lighthouse the server is
// ready.
export const READY_MARKER = 'LHCI_SERVER_WARM_READY';

/** @typedef {(url: string) => Promise<{ status: number, arrayBuffer?: () => Promise<ArrayBuffer> }>} FetchImpl */

/**
 * @param {string} url
 * @param {{ timeoutMs: number, intervalMs?: number, fetchImpl?: FetchImpl }} options
 */
export async function waitForResponsive(url, { timeoutMs, intervalMs = 250, fetchImpl = fetch } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetchImpl(url);
      await response.arrayBuffer?.().catch(() => undefined);
      if (response.status === 200) return;
      lastError = new Error(`unexpected status ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Server at ${url} did not become responsive within ${timeoutMs}ms: ${lastError?.message ?? 'unknown error'}`);
}

/**
 * @param {string} url
 * @param {{ count: number, fetchImpl?: FetchImpl }} options
 */
export async function warmup(url, { count, fetchImpl = fetch } = {}) {
  for (let attempt = 1; attempt <= count; attempt += 1) {
    const response = await fetchImpl(url);
    await response.arrayBuffer?.().catch(() => undefined);
    if (response.status !== 200) {
      throw new Error(`Warmup request ${attempt}/${count} to ${url} returned HTTP ${response.status}, expected 200`);
    }
  }
}

async function main() {
  const host = process.env.LHCI_SERVER_HOST || '127.0.0.1';
  const port = process.env.LHCI_SERVER_PORT || '3100';
  const warmupRequests = Number(process.env.LHCI_WARMUP_REQUESTS || '3');
  const readyTimeoutMs = Number(process.env.LHCI_READY_TIMEOUT_MS || '60000');
  const url = `http://${host}:${port}/`;

  const nextCli = require.resolve('next/dist/bin/next');
  const server = spawn(
    process.execPath,
    [nextCli, 'start', '--hostname', host, '--port', String(port)],
    { env: process.env, stdio: 'inherit' },
  );

  let shuttingDown = false;
  const shutdown = signal => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (server.exitCode === null && server.signalCode === null) server.kill(signal);
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));

  server.once('error', error => {
    console.error(`[lighthouse-server] failed to start next: ${error.message}`);
    process.exitCode = 1;
  });
  server.once('exit', (code, signal) => {
    if (!shuttingDown) {
      console.error(`[lighthouse-server] next start exited unexpectedly (code=${code}, signal=${signal})`);
      process.exitCode = code ?? 1;
    }
  });

  try {
    await waitForResponsive(url, { timeoutMs: readyTimeoutMs });
    await warmup(url, { count: warmupRequests });
  } catch (error) {
    console.error(`[lighthouse-server] ${error instanceof Error ? error.message : String(error)}`);
    shutdown('SIGTERM');
    process.exitCode = 1;
    return;
  }

  // Only announced once the server has proven it can serve real requests
  // and absorbed the one-time cold-start cost.
  console.log(READY_MARKER);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && path.resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  main();
}
