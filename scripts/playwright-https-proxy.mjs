import { readFile } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const hopHeaders = ['connection', 'keep-alive', 'proxy-connection', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'];

function endToEndHeaders(headers) {
  const forwarded = { ...headers };
  const connectionHeaders = String(headers.connection || '').split(',').map(value => value.trim().toLowerCase());
  for (const name of [...hopHeaders, ...connectionHeaders]) delete forwarded[name];
  return forwarded;
}

function forwardedHeaders(request, upgrade = false) {
  const headers = endToEndHeaders(request.headers);
  const values = { for: request.socket.remoteAddress || '',
    port: request.headers.host?.match(/:(\d+)$/)?.[1] || '443', proto: 'https' };
  for (const [suffix, value] of Object.entries(values)) {
    const name = `x-forwarded-${suffix}`;
    headers[name] = request.headers[name] ? `${request.headers[name]},${value}` : value;
  }
  if (request.headers.host) headers.host = request.headers.host;
  const forwardedHost = request.headers['x-forwarded-host'] || request.headers.host;
  if (forwardedHost) headers['x-forwarded-host'] = forwardedHost;
  if (upgrade) {
    headers.connection = 'Upgrade';
    headers.upgrade = request.headers.upgrade;
  } else if (request.headers['transfer-encoding']) {
    // Node decodes the incoming chunks; frame the outgoing body on its own hop.
    delete headers['content-length'];
    headers['transfer-encoding'] = 'chunked';
  }
  return headers;
}

function rewriteLocation(headers, request, upstreamPort) {
  const location = headers.location;
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
    headers.location = redirectUrl.toString();
  } catch {
    // Preserve malformed or non-URL Location values for the browser to reject.
  }
}

function rawResponseHead(response, headers) {
  const lines = [`HTTP/1.1 ${response.statusCode} ${response.statusMessage || ''}`];
  for (const [name, value] of Object.entries(headers)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) lines.push(`${name}: ${item}`);
    }
  }
  return `${lines.join('\r\n')}\r\n\r\n`;
}

export async function startHttpsLoopbackProxy({
  key,
  cert,
  upstreamHost = '127.0.0.1',
  upstreamPort,
  listenHost = '127.0.0.1',
  listenPort,
}) {
  const options = (request, upgrade = false) => ({ hostname: upstreamHost, port: upstreamPort,
    method: request.method, path: request.url, headers: forwardedHeaders(request, upgrade), agent: false });
  const upgradeSockets = new Set();
  const trackUpgradeSocket = socket => {
    upgradeSockets.add(socket);
    socket.once('close', () => upgradeSockets.delete(socket));
  };
  const server = https.createServer({ key, cert }, (request, response) => {
    let upstreamResponse;
    const fail = () => {
      if (response.destroyed || response.writableEnded) return;
      if (response.headersSent) response.destroy();
      else {
        response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('Upstream server is not ready.');
      }
    };
    const upstream = http.request(options(request), incoming => {
      upstreamResponse = incoming;
      if (response.destroyed) { incoming.destroy(); return; }
      const headers = endToEndHeaders(incoming.headers);
      rewriteLocation(headers, request, upstreamPort);
      incoming.on('error', fail);
      incoming.on('aborted', fail);
      response.writeHead(incoming.statusCode, incoming.statusMessage, headers);
      incoming.pipe(response);
    });
    const abort = () => { upstream.destroy(); upstreamResponse?.destroy(); };
    upstream.on('error', fail);
    request.on('aborted', abort);
    request.on('error', abort);
    response.on('error', abort);
    response.on('close', () => { if (!response.writableFinished) abort(); });
    request.pipe(upstream);
  });
  server.on('upgrade', (request, socket, head) => {
    socket.pause();
    trackUpgradeSocket(socket);
    let upstreamSocket, upstreamResponse, responseStarted = false, failed = false;
    const upstream = http.request(options(request, true));
    const abort = () => { upstream.destroy(); upstreamSocket?.destroy(); upstreamResponse?.destroy(); };
    const fail = () => {
      if (failed) return;
      failed = true; abort();
      if (socket.destroyed) return;
      if (responseStarted) socket.destroy();
      else {
        const body = 'Upstream server is not ready.';
        socket.end(`HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
      }
    };
    socket.on('error', abort);
    socket.on('close', abort);
    upstream.on('error', fail);
    upstream.on('upgrade', (incoming, target, upstreamHead) => {
      upstreamSocket = target;
      if (socket.destroyed) { target.destroy(); return; }
      target.pause();
      trackUpgradeSocket(target);
      target.on('error', () => socket.destroy());
      target.on('close', () => socket.end());
      responseStarted = true;
      let headers = `HTTP/1.1 ${incoming.statusCode} ${incoming.statusMessage || ''}\r\n`;
      for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
        headers += `${incoming.rawHeaders[index]}: ${incoming.rawHeaders[index + 1]}\r\n`;
      }
      socket.write(`${headers}\r\n`);
      if (upstreamHead.length) socket.write(upstreamHead);
      if (head.length) target.write(head);
      socket.pipe(target); target.pipe(socket);
    });
    upstream.on('response', incoming => {
      upstreamResponse = incoming;
      if (socket.destroyed) { incoming.destroy(); return; }
      const headers = endToEndHeaders(incoming.headers);
      headers.connection = 'close';
      rewriteLocation(headers, request, upstreamPort);
      incoming.on('error', fail);
      incoming.on('aborted', fail);
      responseStarted = true;
      // The upstream parser already decoded transfer framing. A close-delimited
      // rejection also works when an upgrade was refused with a streamed body.
      socket.write(rawResponseHead(incoming, headers));
      incoming.pipe(socket);
    });
    upstream.end();
  });
  const close = server.close;
  server.close = function (callback) {
    // Node's HTTP close helpers do not close connections after an upgrade.
    for (const socket of upgradeSockets) socket.destroy();
    return close.call(this, callback);
  };

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
