import { chromium } from '@playwright/test';

const baseURL = process.argv[2] || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
let ingestionRequests = 0;
page.on('request', request => {
  if (new URL(request.url()).pathname === '/api/observability') ingestionRequests += 1;
});
await page.goto(baseURL, { waitUntil: 'networkidle' });
const initialHeap = await page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);
await page.waitForTimeout(6_000);
const metrics = await page.evaluate(startHeap => {
  const resources = performance.getEntriesByType('resource');
  const observabilityResources = resources.filter(entry => entry.name.includes('/20999.') || entry.name.includes('observability'));
  const longTasks = performance.getEntriesByType('longtask');
  const start = performance.getEntriesByName('sfm-observability-init-start')[0];
  const complete = performance.getEntriesByName('sfm-observability-init-complete')[0];
  return {
    resourceCount: resources.length,
    observabilityResourceCount: observabilityResources.length,
    observabilityTransferBytes: observabilityResources.reduce((total, entry) => total + ((entry).transferSize || 0), 0),
    initializationProxyMs: start && complete ? Math.max(0, complete.startTime - start.startTime) : null,
    longTaskCount: longTasks.length,
    longTaskTotalMs: longTasks.reduce((total, entry) => total + entry.duration, 0),
    heapStartBytes: startHeap,
    heapEndBytes: performance.memory?.usedJSHeapSize ?? null,
  };
}, initialHeap);
await browser.close();
process.stdout.write(`${JSON.stringify({ ...metrics, ingestionRequests })}\n`);
