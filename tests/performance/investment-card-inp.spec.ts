import { expect, test, type Page } from '@playwright/test';
import type { Investment } from '@/types/investment';

// Browser tracing and video screencasts perturb presentation timing under CPU
// throttling. This spec emits its own JSON profile and failure screenshot.
test.use({ trace: 'off', video: 'off' });

type InteractionSample = {
  selector: string;
  startTime: number;
  duration: number;
  name?: string;
  interactionId?: number;
  inputType?: 'keyboard' | 'pointer' | 'other';
  inputDelay?: number;
  processingDuration?: number;
  presentationDelay?: number;
};

type LongTaskSample = {
  startTime: number;
  duration: number;
};

type InvestmentPerformanceMetrics = {
  clicks: InteractionSample[];
  events: InteractionSample[];
  longTasks: LongTaskSample[];
  renderCounts: Record<string, number>;
  commitCount: number;
};

const enforceBudgets = process.env.PERF_EXPECT_OPTIMIZED !== '0';
const baseURL = 'http://127.0.0.1:3002';
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

function investment(index: number): Investment {
  const price = 0.7 + index / 100;
  const quantity = 100 + index;
  const currentValue = price * quantity;
  const purchasePrice = price * 0.92;
  return {
    id: `inp-investment-${index}`,
    name: `Controlled investment ${String(index + 1).padStart(2, '0')}`,
    type: 'stocks',
    currentValue,
    displayValue: currentValue,
    displayValueStatus: 'valid',
    monthlyContribution: 25 + index,
    startDate: '2024-01-10',
    riskLevel: index % 3 === 0 ? 'high' : index % 2 === 0 ? 'medium' : 'low',
    expectedAnnualReturn: 7,
    symbol: `SFM${index}.KW`,
    providerSymbol: `SFM${index}.KW`,
    market: 'Boursa Kuwait',
    assetType: 'stock',
    currency: 'KWD',
    nativeCurrency: 'KWD',
    priceCurrency: 'KWD',
    quantity,
    purchasePrice,
    currentPrice: price,
    purchaseTotal: purchasePrice * quantity,
    currentMarketValue: currentValue,
    nativeMarketValue: currentValue,
    userCurrency: 'KWD',
    convertedMarketValue: currentValue,
    purchasePlatformId: 'inp-platform',
    purchasePlatformName: 'Interactive Brokers',
    purchasePlatformType: 'multi_asset_broker',
    purchasePlatformStatus: 'approved',
    notes: `Controlled performance holding ${index + 1}`,
    lastPriceUpdatedAt: '2026-07-18T08:00:00.000Z',
    createdAt: new Date(Date.UTC(2025, 0, index + 1)).toISOString(),
    updatedAt: '2026-07-18T08:00:00.000Z',
  };
}

async function preparePortfolio(page: Page) {
  const investments = Array.from({ length: 40 }, (_, index) => investment(index));
  await page.context().addCookies([{ name: 'sfm_guest', value: 'true', url: baseURL, sameSite: 'Lax' }]);
  await page.addInitScript(storedInvestments => {
    localStorage.setItem('sfm_lang', 'en');
    localStorage.setItem('the-sfm-theme', 'light');
    localStorage.setItem('sfm_guest_mode', 'true');
    localStorage.setItem('sfm_guest_investments', JSON.stringify(storedInvestments));

    const metrics: InvestmentPerformanceMetrics = { clicks: [], events: [], longTasks: [], renderCounts: {}, commitCount: 0 };
    Object.defineProperty(window, '__investmentPerformanceMetrics', { value: metrics, configurable: true });
    window.__captureInvestmentRenderCounts = false;

    let rendererId = 0;
    Object.defineProperty(globalThis, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
      configurable: true,
      value: {
        supportsFiber: true,
        renderers: new Map(),
        inject(renderer: unknown) {
          rendererId += 1;
          this.renderers.set(rendererId, renderer);
          return rendererId;
        },
        onCommitFiberRoot(_id: number, root: { current?: FiberLike }) {
          if (!window.__captureInvestmentRenderCounts) return;
          metrics.commitCount += 1;
          const visit = (fiber?: FiberLike | null) => {
            if (!fiber) return;
            if ((fiber.flags ?? 0) & 1) {
              const rawType = fiber.type;
              const elementType = fiber.elementType;
              const type = typeof rawType === 'object' && rawType && 'type' in rawType ? rawType.type : rawType;
              const named = [elementType, rawType, type].find(candidate => {
                if (typeof candidate === 'function') return Boolean((candidate as { displayName?: string; name?: string }).displayName || candidate.name);
                return Boolean(candidate && typeof candidate === 'object' && 'displayName' in candidate && candidate.displayName);
              });
              const name = typeof named === 'function'
                ? (named as { displayName?: string; name?: string }).displayName || named.name
                : named && typeof named === 'object' && 'displayName' in named
                  ? String(named.displayName || '')
                  : '';
              if (name) metrics.renderCounts[name] = (metrics.renderCounts[name] ?? 0) + 1;
            }
            visit(fiber.child);
            visit(fiber.sibling);
          };
          visit(root.current);
        },
        onCommitFiberUnmount() {},
        onPostCommitFiberRoot() {},
      },
    });

    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target.closest('button') : null;
      if (!target) return;
      const selector = target.className || target.getAttribute('aria-label') || target.textContent || 'button';
      const startTime = performance.now();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        metrics.clicks.push({
          selector,
          startTime,
          duration: performance.now() - startTime,
          inputType: event instanceof MouseEvent && event.detail === 0 ? 'keyboard' : 'pointer',
        });
      }));
    }, true);

    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const eventEntry = entry as PerformanceEntry & {
            interactionId?: number;
            target?: Element | null;
            processingStart?: number;
            processingEnd?: number;
          };
          if (!eventEntry.interactionId) continue;
          const target = eventEntry.target?.closest('button');
          const processingStart = eventEntry.processingStart ?? entry.startTime;
          const processingEnd = eventEntry.processingEnd ?? processingStart;
          metrics.events.push({
            selector: target?.className || target?.getAttribute('aria-label') || entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
            name: entry.name,
            interactionId: eventEntry.interactionId,
            inputType: entry.name.startsWith('pointer') || entry.name === 'click'
              ? 'pointer'
              : entry.name.startsWith('key') ? 'keyboard' : 'other',
            inputDelay: Math.max(0, processingStart - entry.startTime),
            processingDuration: Math.max(0, processingEnd - processingStart),
            presentationDelay: Math.max(0, entry.startTime + entry.duration - processingEnd),
          });
        }
      }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
    } catch {
      // Event Timing is not implemented by every browser project.
    }

    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          metrics.longTasks.push({ startTime: entry.startTime, duration: entry.duration });
        }
      }).observe({ type: 'longtask', buffered: true });
    } catch {
      // Long Tasks is Chromium-only; this benchmark runs in Chromium.
    }
  }, investments);

  await page.route('**/api/investment-platforms?**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, page: 1, limit: 50, total: 1, items: [{ id: 'inp-platform', logoUrl: null }] }),
  }));
  await page.route('**/api/market/history?**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ok: true,
      points: [
        { time: '2026-07-17T00:00:00.000Z', close: 0.75 },
        { time: '2026-07-18T00:00:00.000Z', close: 0.77 },
      ],
    }),
  }));
  await page.route('**google.com/s2/favicons**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
  await page.route('**cdn.simpleicons.org/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
  await page.route('**financialmodelingprep.com/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
  await page.goto('/invest', { waitUntil: 'networkidle' });
  await expect(page.locator('.invest-holding-card')).toHaveCount(5);
}

function interactionWindow(metrics: InvestmentPerformanceMetrics, sample: InteractionSample) {
  const end = sample.startTime + sample.duration;
  const tasks = metrics.longTasks.filter(task => task.startTime < end && task.startTime + task.duration > sample.startTime);
  return {
    longTaskCount: tasks.length,
    longestTask: Math.max(0, ...tasks.map(task => task.duration)),
    blockingTime: tasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0),
  };
}

function interactionWindows(metrics: InvestmentPerformanceMetrics, samples: InteractionSample[]) {
  const tasks = metrics.longTasks.filter(task => samples.some(sample => {
    const end = sample.startTime + sample.duration;
    return task.startTime < end && task.startTime + task.duration > sample.startTime;
  }));
  const windows = samples.map(sample => interactionWindow(metrics, sample));
  return {
    longTaskCount: tasks.length,
    longestTask: Math.max(0, ...tasks.map(task => task.duration)),
    blockingTime: Math.max(0, ...windows.map(window => window.blockingTime)),
    totalBlockingTime: tasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0),
  };
}

test('investment secondary and details interactions stay within the controlled INP budget', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'CDP CPU throttling is Chromium desktop only');

  const requests: string[] = [];
  const consoleProblems: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) requests.push(`${request.method()} ${url.pathname}${url.search}`);
  });
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') consoleProblems.push(`${message.type()}: ${message.text()}`);
  });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await preparePortfolio(page);

  const viewAll = page.locator('button.invest-secondary-btn', { hasText: 'View all assets' });
  await viewAll.click();
  await expect(page.locator('.invest-holding-card')).toHaveCount(40);
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  const firstCard = page.locator('.invest-holding-card').first();
  const detailsButton = firstCard.getByRole('button', { name: 'View details' });
  await detailsButton.focus();
  await detailsButton.click();
  await expect(page.locator('.invest-drawer')).toBeVisible();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

  const heapBeforeCycles = await cdp.send('Runtime.getHeapUsage');
  let focusRestored = true;
  for (let cycle = 0; cycle < 15; cycle += 1) {
    await page.locator('.invest-drawer .invest-icon-btn').click();
    await expect(page.locator('.invest-drawer')).toHaveCount(0);
    const cycleFocusRestored = await detailsButton.evaluate(element => document.activeElement === element);
    focusRestored &&= cycleFocusRestored;
    if (!cycleFocusRestored) await detailsButton.focus();
    await detailsButton.click();
    await expect(page.locator('.invest-drawer')).toBeVisible();
  }
  await page.locator('.invest-drawer .invest-icon-btn').click();
  await expect(page.locator('.invest-drawer')).toHaveCount(0);

  await detailsButton.focus();
  await detailsButton.press('Enter');
  await expect(page.locator('.invest-drawer')).toBeVisible();
  await page.locator('.invest-drawer .invest-icon-btn').focus();
  await page.locator('.invest-drawer .invest-icon-btn').press('Enter');
  await expect(page.locator('.invest-drawer')).toHaveCount(0);
  focusRestored &&= await detailsButton.evaluate(element => document.activeElement === element);

  await cdp.send('HeapProfiler.collectGarbage');
  const heapAfterCycles = await cdp.send('Runtime.getHeapUsage');
  const metrics = await page.evaluate(() => ({
    ...window.__investmentPerformanceMetrics,
    clicks: [...window.__investmentPerformanceMetrics.clicks],
    events: [...window.__investmentPerformanceMetrics.events],
    longTasks: [...window.__investmentPerformanceMetrics.longTasks],
    renderCounts: { ...window.__investmentPerformanceMetrics.renderCounts },
  }));

  await page.evaluate(() => { window.__captureInvestmentRenderCounts = true; });
  const rendersBeforeDetails = await page.evaluate(() => ({ ...window.__investmentPerformanceMetrics.renderCounts }));
  await detailsButton.click();
  await expect(page.locator('.invest-drawer .invest-drawer-section').first()).toBeVisible();
  const rendersAfterDetails = await page.evaluate(() => ({ ...window.__investmentPerformanceMetrics.renderCounts }));
  await page.locator('.invest-drawer .invest-icon-btn').click();
  await expect(page.locator('.invest-drawer')).toHaveCount(0);
  await page.evaluate(() => { window.__captureInvestmentRenderCounts = false; });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  const secondary = metrics.clicks.find(sample => sample.selector.includes('invest-secondary-btn'));
  expect(secondary).toBeDefined();
  const detailSamples = metrics.clicks.filter(sample => sample.selector.includes('invest-card-action--primary') && sample.inputType === 'pointer');
  // The secondary button unmounts when it switches tabs, so Chromium may clear
  // PerformanceEventTiming.target before the observer receives the entry.
  const secondaryEventSamples = metrics.events.filter(sample => sample.inputType === 'pointer'
    && sample.startTime >= secondary!.startTime - 200
    && sample.startTime <= secondary!.startTime + secondary!.duration);
  const detailEventSamples = metrics.events.filter(sample => sample.selector.includes('invest-card-action--primary') && sample.inputType === 'pointer');
  const detail = detailSamples[0];
  expect(detail).toBeDefined();
  const profile = {
    cpuThrottle: 4,
    portfolioSize: 40,
    secondary,
    secondaryMainThread: interactionWindow(metrics, secondary!),
    details: detail,
    detailsP95: percentile(detailSamples.map(sample => sample.duration), 0.95),
    detailsMainThread: interactionWindows(metrics, detailSamples),
    secondaryEventTimingP95: interactionPercentile(secondaryEventSamples, 'duration', 0.95),
    detailsEventTimingP95: interactionPercentile(detailEventSamples, 'duration', 0.95),
    detailsInputDelayP95: interactionPercentile(detailEventSamples, 'inputDelay', 0.95),
    detailsProcessingP95: interactionPercentile(detailEventSamples, 'processingDuration', 0.95),
    detailsPresentationDelayP95: interactionPercentile(detailEventSamples, 'presentationDelay', 0.95),
    detailsRenderDelta: renderDelta(rendersBeforeDetails, rendersAfterDetails),
    repeatedCycles: 15,
    focusRestored,
    heapDeltaAfterGC: heapAfterCycles.usedSize - heapBeforeCycles.usedSize,
    apiRequests: requests,
    consoleProblems,
  };
  await testInfo.attach('investment-interaction-profile', {
    body: JSON.stringify(profile, null, 2),
    contentType: 'application/json',
  });
  console.log(`INVESTMENT_INTERACTION_PROFILE ${JSON.stringify({
    cpuThrottle: profile.cpuThrottle,
    portfolioSize: profile.portfolioSize,
    secondary: profile.secondary,
    secondaryEventTimingP95: profile.secondaryEventTimingP95,
    secondaryMainThread: profile.secondaryMainThread,
    details: profile.details,
    detailsP95: profile.detailsP95,
    detailsEventTimingP95: profile.detailsEventTimingP95,
    detailsInputDelayP95: profile.detailsInputDelayP95,
    detailsProcessingP95: profile.detailsProcessingP95,
    detailsPresentationDelayP95: profile.detailsPresentationDelayP95,
    detailsMainThread: profile.detailsMainThread,
    unrelatedCardRenders: profile.detailsRenderDelta.InvestmentRow ?? 0,
    focusRestored: profile.focusRestored,
    heapDeltaAfterGC: profile.heapDeltaAfterGC,
  })}`);

  const duplicateRequests = [...new Set(requests)].filter(request => requests.filter(candidate => candidate === request).length > 1);
  expect(consoleProblems).toEqual([]);
  expect(duplicateRequests).toEqual([]);
  expect(profile.heapDeltaAfterGC).toBeLessThan(10 * 1024 * 1024);

  if (enforceBudgets) {
    expect(profile.focusRestored).toBe(true);
    expect(secondary!.duration).toBeLessThan(200);
    expect(profile.secondaryEventTimingP95).toBeLessThan(200);
    expect(detail!.duration).toBeLessThan(200);
    expect(profile.detailsP95).toBeLessThan(200);
    expect(profile.detailsEventTimingP95).toBeLessThan(200);
    expect(profile.secondaryMainThread.longestTask).toBeLessThan(150);
    expect(profile.detailsMainThread.longestTask).toBeLessThan(150);
    expect(profile.detailsRenderDelta.InvestmentRow ?? 0).toBe(0);
    expect(profile.detailsRenderDelta.DropdownMenu ?? 0).toBe(0);
    expect(profile.detailsRenderDelta.MenuProvider ?? 0).toBe(0);
  }
});

function percentile(values: number[], fraction: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function interactionPercentile(
  samples: InteractionSample[],
  field: 'duration' | 'inputDelay' | 'processingDuration' | 'presentationDelay',
  fraction: number,
) {
  const interactions = new Map<number, number>();
  for (const sample of samples) {
    if (!sample.interactionId) continue;
    interactions.set(sample.interactionId, Math.max(interactions.get(sample.interactionId) ?? 0, sample[field] ?? 0));
  }
  return percentile([...interactions.values()], fraction);
}

function renderDelta(before: Record<string, number>, after: Record<string, number>) {
  return Object.fromEntries(Object.entries(after)
    .map(([name, count]) => [name, count - (before[name] ?? 0)] as const)
    .filter(([, count]) => count > 0)
    .sort((left, right) => right[1] - left[1]));
}

type FiberLike = {
  flags?: number;
  type?: unknown;
  elementType?: unknown;
  child?: FiberLike | null;
  sibling?: FiberLike | null;
};

declare global {
  interface Window {
    __investmentPerformanceMetrics: InvestmentPerformanceMetrics;
    __captureInvestmentRenderCounts: boolean;
  }
}
