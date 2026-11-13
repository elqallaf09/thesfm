import { test, expect } from '@playwright/test';
import { historyImportFixture } from '../../src/__tests__/fixtures/portfolioRiskHistory';
import { inspectHistoryCandidate } from '../../src/lib/portfolio-risk/historyEvidence';

const file = () => ({ name: 'synthetic-history.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(historyImportFixture().candidate)) });
function preview(sourceName = 'Synthetic source A') {
  const { fixture, candidate } = historyImportFixture();
  candidate.history.sourceName = sourceName;
  const result = inspectHistoryCandidate({ ...fixture, candidate });
  if (!result.ok) throw new Error(result.code);
  return { ok: true, preview: { ...result.preview, sha256: 'a'.repeat(64) } };
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.route('**/api/portfolio/risk/history', route => route.fulfill({ status: 422, json: { code: 'HISTORY_NOT_IMPORTED' } }));
});

test('checks a file and shows only an explicitly unapproved summary', async ({ page }) => {
  let body = ''; let authorization = '';
  await page.route('**/api/portfolio/risk/history/preview', route => {
    body = route.request().postData() ?? '';
    authorization = route.request().headers().authorization;
    return route.fulfill({ json: preview() });
  });
  await page.goto('/');
  await page.locator('#history-import-file').setInputFiles(file());
  await page.getByRole('button', { name: 'فحص الملف', exact: true }).click();
  await expect(page.getByTestId('history-import-summary')).toContainText('يحتاج مراجعة مستقلة');
  expect(body).toBe(file().buffer.toString());
  expect(authorization).toBe('Bearer synthetic-a1');
  await expect(page.getByTestId('history-import-summary')).toContainText('KWD');
});

test('clears the selected private file and summary on account or credential changes and logout', async ({ page }) => {
  await page.route('**/api/portfolio/risk/history/preview', route => route.fulfill({ json: preview() }));
  await page.goto('/');
  for (const action of ['Rotate A credential', 'Switch to B', 'Sign out']) {
    await page.locator('#history-import-file').setInputFiles(file());
    await page.getByRole('button', { name: 'فحص الملف', exact: true }).click();
    await expect(page.getByTestId('history-import-summary')).toBeVisible();
    await page.getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByTestId('history-import-summary')).toHaveCount(0);
    await expect(page.locator('#history-import-file')).toHaveValue('');
  }
  await expect(page.locator('#history-import-file')).toBeDisabled();
});

test('rejects forged approval responses and oversized local files', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/portfolio/risk/history/preview', route => {
    requests++;
    const payload = preview(); payload.preview.status = 'approved' as typeof payload.preview.status;
    return route.fulfill({ json: payload });
  });
  await page.goto('/');
  await page.locator('#history-import-file').setInputFiles(file());
  await page.getByRole('button', { name: 'فحص الملف', exact: true }).click();
  await expect(page.getByTestId('history-import').getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('history-import-summary')).toHaveCount(0);
  await page.locator('#history-import-file').setInputFiles({ ...file(), buffer: Buffer.alloc(2 * 1024 * 1024 + 1) });
  await page.getByRole('button', { name: 'فحص الملف', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('2 MB');
  expect(requests).toBe(1);
});

test('a late file check cannot replace a newer account summary', async ({ page }) => {
  let release!: () => void; let requested = false; let finished = false;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/portfolio/risk/history/preview', async route => {
    const old = route.request().headers().authorization === 'Bearer synthetic-a1';
    if (old) { requested = true; await pending; }
    try { await route.fulfill({ json: preview(old ? 'Late private A' : 'Current B') }); }
    catch { /* Superseded upload is intentionally aborted. */ }
    finally { if (old) finished = true; }
  });
  try {
    await page.goto('/');
    await page.locator('#history-import-file').setInputFiles(file());
    await page.getByRole('button', { name: 'فحص الملف', exact: true }).click();
    await expect.poll(() => requested).toBe(true);
    await page.getByRole('button', { name: 'Switch to B' }).click();
    await page.locator('#history-import-file').setInputFiles(file());
    await page.getByRole('button', { name: 'فحص الملف', exact: true }).click();
    await expect(page.getByTestId('history-import-summary')).toContainText('Current B');
    release(); await expect.poll(() => finished).toBe(true);
    await expect(page.getByText('Late private A')).toHaveCount(0);
    await expect(page.getByTestId('history-import-summary')).toContainText('Current B');
  } finally { release(); }
});

for (const locale of ['ar', 'en', 'fr']) {
  test(`import form remains usable on mobile in ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.route('**/api/portfolio/risk/history/preview', route => route.fulfill({ json: preview() }));
    await page.goto('/?locale=' + locale);
    await page.locator('#history-import-file').setInputFiles(file());
    await page.getByTestId('history-import').getByRole('button').click();
    await expect(page.getByTestId('history-import-summary')).toBeVisible();
    await expect(page.getByTestId('history-import')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    expect(await page.getByTestId('history-import').evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
  });
}
