import { readFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);

function createForwardedHeaders(request, upstreamHost, upstreamPort) {
  const forwardedFor = [request.headers['x-forwarded-for'], request.socket.remoteAddress]
    .filter(Boolean)
    .join(', ');
  return {
    ...request.headers,
    host: `${upstreamHost}:${upstreamPort}`,
    'x-forwarded-for': forwardedFor,
    'x-forwarded-host': request.headers.host,
    'x-forwarded-proto': 'https',
  };
}

function rewriteRedirectLocation(location, forwardedHost, upstreamPort) {
  if (!location || !forwardedHost) return location;
  try {
    const redirectUrl = new URL(location);
    const loopbackHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
    const targetsForwardedHost = redirectUrl.host === forwardedHost;
    const targetsUpstream = loopbackHosts.has(redirectUrl.hostname)
      && Number(redirectUrl.port || (redirectUrl.protocol === 'https:' ? 443 : 80)) === upstreamPort;
    if (!targetsForwardedHost && !targetsUpstream) return location;
    redirectUrl.protocol = 'https:';
    if (targetsUpstream) redirectUrl.host = forwardedHost;
    return redirectUrl.toString();
  } catch {
    // Preserve malformed or non-URL Location values for the browser to reject.
    return location;
  }
}

export async function startHttpsLoopbackProxy({
  key,
  cert,
  upstreamHost = '127.0.0.1',
  upstreamPort,
  listenHost = '127.0.0.1',
  listenPort,
}) {
  const server = https.createServer({ key, cert }, (request, response) => {
    const forwardedHost = request.headers.host;
    const upstreamRequest = http.request({
      hostname: upstreamHost,
      port: upstreamPort,
      method: request.method,
      path: request.url,
      headers: createForwardedHeaders(request, upstreamHost, upstreamPort),
    }, upstreamResponse => {
      const headers = { ...upstreamResponse.headers };
      if (typeof headers.location === 'string') {
        headers.location = rewriteRedirectLocation(headers.location, forwardedHost, upstreamPort);
      }
      response.writeHead(
        upstreamResponse.statusCode ?? 502,
        upstreamResponse.statusMessage,
        headers,
      );
      upstreamResponse.pipe(response);
    });
    upstreamRequest.on('error', () => {
      if (!response.headersSent) response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Upstream server is not ready.');
    });
    request.on('aborted', () => upstreamRequest.destroy());
    request.pipe(upstreamRequest);
  });
  server.on('upgrade', (request, socket, head) => {
    const upstreamRequest = http.request({
      hostname: upstreamHost,
      port: upstreamPort,
      method: request.method,
      path: request.url,
      headers: createForwardedHeaders(request, upstreamHost, upstreamPort),
    });
    upstreamRequest.on('upgrade', (upstreamResponse, upstreamSocket, upstreamHead) => {
      const responseHeaders = upstreamResponse.rawHeaders
        .reduce((lines, value, index, values) => index % 2 === 0
          ? [...lines, `${value}: ${values[index + 1]}`]
          : lines, []);
      socket.write([
        `HTTP/${upstreamResponse.httpVersion} ${upstreamResponse.statusCode} ${upstreamResponse.statusMessage}`,
        ...responseHeaders,
        '',
        '',
      ].join('\r\n'));
      if (head.length > 0) upstreamSocket.write(head);
      if (upstreamHead.length > 0) socket.write(upstreamHead);
      socket.pipe(upstreamSocket).pipe(socket);
    });
    upstreamRequest.on('response', upstreamResponse => {
      upstreamResponse.resume();
      socket.destroy();
    });
    upstreamRequest.on('error', () => socket.destroy());
    upstreamRequest.end();
  });

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
