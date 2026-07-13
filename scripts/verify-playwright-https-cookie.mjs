import { readFile } from 'node:fs/promises';
import http from 'node:http';
import { webkit } from '@playwright/test';
import { startHttpsLoopbackProxy } from './playwright-https-proxy.mjs';

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve(server.address());
    });
  });
}

function close(server) {
  return new Promise(resolve => server.close(resolve));
}

const certPath = process.env.PLAYWRIGHT_TLS_CERT_PATH;
const keyPath = process.env.PLAYWRIGHT_TLS_KEY_PATH;
if (!certPath || !keyPath) throw new Error('Ephemeral Playwright TLS certificate paths are required.');

const upstream = http.createServer((request, response) => {
  if (request.url === '/slow') {
    setTimeout(() => response.end('slow'), 250);
    return;
  }
  if (request.url === '/redirect') {
    response.writeHead(302, { location: `https://localhost:${request.socket.localPort}/check?redirected=1` });
    response.end();
    return;
  }
  if (request.url === '/set') {
    response.setHeader('Set-Cookie', 'sfm_https_probe=diagnostic-only; Path=/; HttpOnly; Secure; SameSite=Lax');
    response.end('ok');
    return;
  }
  const cookieNames = String(request.headers.cookie || '')
    .split(';')
    .map(item => item.trim().split('=')[0])
    .filter(Boolean);
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({ cookieNames }));
});

let proxy;
let browser;
try {
  const upstreamAddress = await listen(upstream);
  const [cert, key] = await Promise.all([readFile(certPath), readFile(keyPath)]);
  proxy = await startHttpsLoopbackProxy({
    cert,
    key,
    upstreamPort: upstreamAddress.port,
    listenPort: 0,
  });
  const proxyAddress = proxy.address();
  browser = await webkit.launch({ headless: true });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const origin = `https://127.0.0.1:${proxyAddress.port}`;
  await page.goto(`${origin}/set`);
  await page.goto(`${origin}/check`);
  const result = JSON.parse(await page.textContent('body'));
  if (!Array.isArray(result.cookieNames) || !result.cookieNames.includes('sfm_https_probe')) {
    throw new Error('WebKit did not send the Secure cookie through the HTTPS loopback proxy.');
  }
  const interruptedNavigation = page.goto(`${origin}/slow`).catch(() => null);
  await new Promise(resolve => setTimeout(resolve, 25));
  await page.goto(`${origin}/check?after-abort=1`);
  await interruptedNavigation;
  await page.goto(`${origin}/redirect`);
  if (new URL(page.url()).protocol !== 'https:') {
    throw new Error('The HTTPS loopback proxy did not preserve HTTPS across an upstream redirect.');
  }
  for (let index = 0; index < 4; index += 1) {
    const freshContext = await browser.newContext({ ignoreHTTPSErrors: true });
    const freshPage = await freshContext.newPage();
    await freshPage.goto(`${origin}/check?connection=${index}`);
    await freshContext.close();
  }
  console.log('HTTPS loopback Secure-cookie probe passed in WebKit.');
} finally {
  await browser?.close();
  if (proxy) await close(proxy);
  await close(upstream);
}
