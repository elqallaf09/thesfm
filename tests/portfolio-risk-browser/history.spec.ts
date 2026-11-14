import { test, expect } from '@playwright/test';
import { adaptVerifiedHistory } from '../../src/lib/portfolio-risk/historyEvidence';
import { historyFixture } from '../../src/__tests__/fixtures/portfolioRiskHistory';

function response(sourceName: string) {
  const fixture = historyFixture(); fixture.history.payload.sourceName = sourceName;
  const result = adaptVerifiedHistory(fixture); if (!result.ok) throw new Error(result.code);
  return result.snapshot;
}
function gate() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release: () => release() };
}

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
});

test('clears A before the pending B response and renders only B afterwards', async ({ page }) => {
  const pending = gate(); let bRequested = false;
  await page.route('**/api/portfolio/risk/history', async route => {
    const b = route.request().headers().authorization === 'Bearer synthetic-b1';
    if (b) { bRequested = true; await pending.promise; }
    await route.fulfill({ json: response(b ? 'Only owner B' : 'Only owner A') });
  });
  try {
    await page.goto('/'); await expect(page.getByText(/Only owner A/)).toBeVisible();
    await page.getByRole('button', { name: 'Switch to B' }).click();
    await expect.poll(() => bRequested).toBe(true);
    await expect(page.getByText(/Only owner A/)).toHaveCount(0);
    pending.release(); await expect(page.getByText(/Only owner B/)).toBeVisible();
    await expect(page.getByText(/Only owner A/)).toHaveCount(0);
  } finally { pending.release(); }
});

test('a late aborted A response cannot overwrite the B result', async ({ page }) => {
  const pending = gate(); let aRequested = false; let aFinished = false;
  await page.route('**/api/portfolio/risk/history', async route => {
    const a = route.request().headers().authorization === 'Bearer synthetic-a1';
    if (a) { aRequested = true; await pending.promise; }
    try { await route.fulfill({ json: response(a ? 'Late owner A' : 'Only owner B') }); }
    catch { /* The component intentionally aborts the superseded request. */ }
    finally { if (a) aFinished = true; }
  });
  try {
    await page.goto('/'); await expect.poll(() => aRequested).toBe(true);
    await page.getByRole('button', { name: 'Switch to B' }).click();
    await expect(page.getByText(/Only owner B/)).toBeVisible();
    pending.release(); await expect.poll(() => aFinished).toBe(true);
    await expect(page.getByText(/Late owner A/)).toHaveCount(0);
    await expect(page.getByText(/Only owner B/)).toBeVisible();
  } finally { pending.release(); }
});

test('logout removes historical values and does not fetch without an owner', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/portfolio/risk/history', async route => { requests += 1; await route.fulfill({ json: response('Only owner A') }); });
  await page.goto('/'); await expect(page.getByText(/Only owner A/)).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByText(/Only owner A/)).toHaveCount(0);
  await expect(page.getByText('سجّل الدخول لقراءة تاريخ محفظتك.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'إعادة فحص السجل التاريخي' })).toBeDisabled();
  expect(requests).toBe(1);
});

test('credential rotation hides the old response even for the same owner', async ({ page }) => {
  const pending = gate(); let rotated = false;
  await page.route('**/api/portfolio/risk/history', async route => {
    const newer = route.request().headers().authorization === 'Bearer synthetic-a2';
    if (newer) { rotated = true; await pending.promise; }
    await route.fulfill({ json: response(newer ? 'Fresh A session' : 'Old A session') });
  });
  try {
    await page.goto('/'); await expect(page.getByText(/Old A session/)).toBeVisible();
    await page.getByRole('button', { name: 'Rotate A credential' }).click();
    await expect.poll(() => rotated).toBe(true);
    await expect(page.getByText(/Old A session/)).toHaveCount(0);
    pending.release(); await expect(page.getByText(/Fresh A session/)).toBeVisible();
  } finally { pending.release(); }
});

test('invalid metrics and source errors never become a zero-risk display', async ({ page }) => {
  const invalid = response('Must not be displayed'); invalid.metrics.observations = 0;
  await page.route('**/api/portfolio/risk/history', route => route.fulfill({ json: invalid }));
  await page.goto('/');
  await expect(page.getByText('تعذّر التحقق من السجل التاريخي. لم تُعرض أرقام بديلة.')).toBeVisible();
  await expect(page.getByText(/Must not be displayed/)).toHaveCount(0);
  await expect(page.locator('dl')).toHaveCount(0);
});
