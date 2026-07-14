import { readFile } from 'node:fs/promises';
import https from 'node:https';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const httpProxy = require('next/dist/compiled/http-proxy');

export async function startHttpsLoopbackProxy({
  key,
  cert,
  upstreamHost = '127.0.0.1',
  upstreamPort,
  listenHost = '127.0.0.1',
  listenPort,
}) {
  const proxy = httpProxy.createProxyServer({
    target: `http://${upstreamHost}:${upstreamPort}`,
    xfwd: true,
    ws: true,
  });
  const server = https.createServer({ key, cert }, (request, response) => {
    proxy.web(request, response);
  });
  proxy.on('error', (_error, _request, response) => {
    if (response && typeof response.writeHead === 'function') {
      if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Upstream server is not ready.');
      return;
    }
    response?.destroy();
  });
  proxy.on('proxyRes', (proxyResponse, request) => {
    const location = proxyResponse.headers.location;
    const forwardedHost = request.headers.host;
    if (!location || !forwardedHost) return;
    try {
      const redirectUrl = new URL(location);
      const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
      const targetsForwardedHost = redirectUrl.host === forwardedHost;
      const targetsUpstream = loopbackHosts.has(redirectUrl.hostname)
        && Number(redirectUrl.port || (redirectUrl.protocol === 'https:' ? 443 : 80)) === upstreamPort;
      if (!targetsForwardedHost && !targetsUpstream) return;
      redirectUrl.protocol = 'https:';
      if (targetsUpstream) redirectUrl.host = forwardedHost;
      proxyResponse.headers.location = redirectUrl.toString();
    } catch {
      // Preserve malformed or non-URL Location values for the browser to reject.
    }
  });
  server.on('upgrade', (request, socket, head) => proxy.ws(request, socket, head));
  server.once('close', () => proxy.removeAllListeners());

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(listenPort, listenHost, () => {
      server.off('error', reject);
      resolve();
    });
  });
  return server;
}

async function main() {
  if (process.env.CI !== 'true' || process.env.PLAYWRIGHT_HTTPS_LOOPBACK !== '1') {
    throw new Error('The Playwright HTTPS proxy may only run in an explicitly enabled CI job.');
  }

  const certPath = process.env.PLAYWRIGHT_TLS_CERT_PATH;
  const keyPath = process.env.PLAYWRIGHT_TLS_KEY_PATH;
  if (!certPath || !keyPath) throw new Error('Ephemeral Playwright TLS certificate paths are required.');

  const upstreamHost = '127.0.0.1';
  const upstreamPort = 3000;
  const listenHost = '127.0.0.1';
  const listenPort = 3443;
  const [cert, key] = await Promise.all([readFile(certPath), readFile(keyPath)]);
  const nextCli = require.resolve('next/dist/bin/next');
  const proxy = await startHttpsLoopbackProxy({
    cert,
    key,
    upstreamHost,
    upstreamPort,
    listenHost,
    listenPort,
  });
  let nextServer;
  try {
    nextServer = spawn(
      process.execPath,
      [nextCli, 'start', '--hostname', upstreamHost, '--port', String(upstreamPort)],
      { env: process.env, stdio: 'inherit' },
    );
  } catch (error) {
    await new Promise(resolve => proxy.close(resolve));
    throw error;
  }

  let shuttingDown = false;
  const shutdown = signal => {
    if (shuttingDown) return;
    shuttingDown = true;
    proxy.close(() => undefined);
    if (nextServer.exitCode === null && nextServer.signalCode === null) nextServer.kill(signal);
  };
  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  nextServer.once('error', error => {
    proxy.close(() => undefined);
    if (!shuttingDown) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  });
  nextServer.once('exit', code => {
    proxy.close(() => {
      if (!shuttingDown) process.exitCode = code === 0 ? 1 : code ?? 1;
    });
  });
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && path.resolve(fileURLToPath(import.meta.url)) === invokedPath) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
