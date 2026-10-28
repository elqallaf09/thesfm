import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { startHttpsLoopbackProxy } from '../../scripts/playwright-https-proxy.mjs';

let directory;
let certificate;

before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'sfm-https-proxy-test-'));
  const keyPath = path.join(directory, 'key.pem');
  const certPath = path.join(directory, 'cert.pem');
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', keyPath,
    '-out', certPath, '-days', '1', '-subj', '/CN=localhost', '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore' });
  const [key, cert] = await Promise.all([readFile(keyPath), readFile(certPath)]);
  certificate = { key, cert };
});

after(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  return server.address().port;
}

async function close(server) {
  server.closeAllConnections?.();
  if (server.listening) await new Promise(resolve => server.close(resolve));
}

async function withProxy(handler, check, configure) {
  const upstream = http.createServer(handler);
  configure?.(upstream);
  const upstreamPort = await listen(upstream);
  const proxy = await startHttpsLoopbackProxy({ ...certificate, upstreamPort, listenPort: 0 });
  try { await check({ port: proxy.address().port, upstream, upstreamPort }); }
  finally { await close(proxy); await close(upstream); }
}

function request(port, url, { method = 'GET', headers = {}, chunks = [] } = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = https.request({ hostname: '127.0.0.1', port, path: url, method, headers,
      rejectUnauthorized: false, agent: false }, response => {
      const body = [];
      response.on('data', chunk => body.push(chunk));
      response.once('error', reject);
      response.once('end', () => resolve({ status: response.statusCode, statusMessage: response.statusMessage,
        headers: response.headers, body: Buffer.concat(body).toString() }));
    });
    outgoing.once('error', reject);
    for (const chunk of chunks) outgoing.write(chunk);
    outgoing.end();
  });
}

test('HTTPS proxy preserves streamed POST data, raw paths, forwarded origin and multiple cookies', { timeout: 10000 }, async () => {
  await withProxy(async (incoming, response) => {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    response.writeHead(201, 'Fixture created', { 'content-type': 'application/json',
      'set-cookie': ['first=1; HttpOnly; Secure; SameSite=Lax', 'second=2; HttpOnly; Secure; SameSite=Lax'],
      connection: 'close, x-private-hop', 'x-private-hop': 'remove-me' });
    response.write(JSON.stringify({ method: incoming.method, url: incoming.url, headers: incoming.headers,
      body: Buffer.concat(chunks).toString() }));
    response.end();
  }, async ({ port }) => {
    const host = `localhost:${port}`;
    const result = await request(port, '/echo?raw=%2F&space=a%20b', { method: 'POST',
      headers: { host, cookie: 'existing=kept', connection: 'close, x-private-hop', 'x-private-hop': 'remove-me' },
      chunks: ['first-', 'second'] });
    assert.equal(result.status, 201);
    assert.equal(result.statusMessage, 'Fixture created');
    assert.equal(result.headers['set-cookie'].length, 2);
    assert.equal(result.headers['x-private-hop'], undefined);
    const echoed = JSON.parse(result.body);
    assert.equal(echoed.method, 'POST');
    assert.equal(echoed.url, '/echo?raw=%2F&space=a%20b');
    assert.equal(echoed.body, 'first-second');
    assert.equal(echoed.headers.host, host);
    assert.equal(echoed.headers.cookie, 'existing=kept');
    assert.equal(echoed.headers['x-forwarded-host'], host);
    assert.equal(echoed.headers['x-forwarded-proto'], 'https');
    assert.equal(echoed.headers['x-forwarded-port'], String(port));
    assert.ok(echoed.headers['x-forwarded-for'].includes('127.0.0.1'));
    assert.equal(echoed.headers['x-private-hop'], undefined);
  });
});

test('HTTPS proxy rewrites only its own absolute loopback redirects', { timeout: 10000 }, async () => {
  await withProxy((incoming, response) => {
    const locations = { '/local': `http://localhost:${incoming.socket.localPort}/check?redirected=1`,
      '/external': 'https://example.com/keep?redirected=1', '/relative': '/keep-relative' };
    response.writeHead(302, { location: locations[incoming.url] });
    response.end();
  }, async ({ port }) => {
    assert.equal((await request(port, '/local')).headers.location, `https://127.0.0.1:${port}/check?redirected=1`);
    assert.equal((await request(port, '/external')).headers.location, 'https://example.com/keep?redirected=1');
    assert.equal((await request(port, '/relative')).headers.location, '/keep-relative');
  });
});

test('HTTPS proxy returns 502 when its upstream is unavailable and keeps accepting requests', { timeout: 10000 }, async () => {
  await withProxy((_incoming, response) => response.end('ready'), async ({ port, upstream }) => {
    await close(upstream);
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await request(port, '/unavailable');
      assert.equal(result.status, 502);
      assert.equal(result.body, 'Upstream server is not ready.');
    }
  });
});

test('HTTPS proxy streams response bytes and closes upstream work after a client abort', { timeout: 10000 }, async () => {
  let markClosed;
  const closed = new Promise(resolve => { markClosed = resolve; });
  await withProxy((incoming, response) => {
    if (incoming.url !== '/stream') { response.end('healthy'); return; }
    response.writeHead(200, { 'content-type': 'text/event-stream' });
    response.write('data: first\n\n');
    const interval = setInterval(() => response.write('data: next\n\n'), 20);
    response.once('close', () => { clearInterval(interval); markClosed(); });
  }, async ({ port }) => {
    await new Promise((resolve, reject) => {
      const outgoing = https.get({ hostname: '127.0.0.1', port, path: '/stream', rejectUnauthorized: false,
        agent: false }, response => {
        response.once('data', chunk => {
          assert.match(chunk.toString(), /data: first/);
          response.destroy(); outgoing.destroy(); resolve();
        });
        response.once('error', error => { if (error.code !== 'ECONNRESET') reject(error); });
      });
      outgoing.once('error', error => { if (error.code !== 'ECONNRESET') reject(error); });
    });
    let timeout;
    try {
      await Promise.race([closed, new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Aborted upstream response remained open')), 3000);
      })]);
    } finally { clearTimeout(timeout); }
    assert.equal((await request(port, '/healthy')).body, 'healthy');
  });
});

test('HTTPS proxy tunnels upgrade bytes in both directions, including handshake head data', { timeout: 10000 }, async () => {
  const clientHead = 'client-head';
  const serverHead = 'server-head';
  const upstreamSockets = new Set();
  try {
    await withProxy((_incoming, response) => response.end('ordinary'), async ({ port }) => {
      const socket = tls.connect({ host: '127.0.0.1', port, rejectUnauthorized: false });
      try {
        await new Promise((resolve, reject) => {
          let received = '';
          const timeout = setTimeout(() => reject(new Error('Upgrade tunnel did not relay its bytes')), 3000);
          const finish = error => {
            clearTimeout(timeout);
            if (error) reject(error);
            else resolve();
          };
          socket.once('error', finish);
          socket.once('secureConnect', () => socket.write(`GET /upgrade?kept=1 HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n${clientHead}`));
          socket.on('data', chunk => {
            received += chunk.toString();
            if (received.endsWith(serverHead + clientHead)) {
              assert.match(received, /^HTTP\/1\.1 101 Switching Protocols\r\n/);
              finish();
            }
          });
        });
      } finally {
        socket.destroy();
        for (const upstreamSocket of upstreamSockets) upstreamSocket.destroy();
      }
    }, upstream => upstream.on('upgrade', (incoming, socket, head) => {
      upstreamSockets.add(socket);
      assert.equal(incoming.url, '/upgrade?kept=1');
      assert.equal(incoming.headers['x-forwarded-proto'], 'https');
      socket.on('error', () => undefined);
      socket.once('close', () => upstreamSockets.delete(socket));
      socket.write(`HTTP/1.1 101 Switching Protocols\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n${serverHead}`);
      if (head.length) socket.write(head);
      socket.on('data', chunk => socket.write(chunk));
    }));
  } finally { for (const socket of upstreamSockets) socket.destroy(); }
});

test('HTTPS proxy completes a rejected upgrade as an ordinary HTTP response', { timeout: 10000 }, async () => {
  await withProxy((_incoming, response) => response.end('ordinary'), async ({ port }) => {
    const socket = tls.connect({ host: '127.0.0.1', port, rejectUnauthorized: false });
    try {
      const wire = await new Promise((resolve, reject) => {
        let received = '';
        const timeout = setTimeout(() => reject(new Error('Rejected upgrade did not finish')), 3000);
        socket.once('error', error => { clearTimeout(timeout); reject(error); });
        socket.once('secureConnect', () => socket.write(`GET /denied HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n`));
        socket.on('data', chunk => { received += chunk.toString(); });
        socket.once('end', () => { clearTimeout(timeout); resolve(received); });
      });
      assert.match(wire, /^HTTP\/1\.1 403 Forbidden\r\n/);
      assert.doesNotMatch(wire, /transfer-encoding:/i);
      assert.ok(wire.endsWith('\r\n\r\ndenied'));
    } finally { socket.destroy(); }
  }, upstream => upstream.on('upgrade', (_incoming, socket) => {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nTransfer-Encoding: chunked\r\n\r\n6\r\ndenied\r\n0\r\n\r\n');
  }));
});
