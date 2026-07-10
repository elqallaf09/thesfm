import { expect, test } from '@playwright/test';

test.describe('Arabic Sharia screening and documented research page', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test('keeps stocks and news visible and embeds research without horizontal overflow', async ({ page }) => {
    await page.goto('/sharia-stocks');
    const main = page.locator('[data-news-page-shell][dir="rtl"] main');
    await expect(main).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByTestId('sharia-stock-results')).toBeVisible();
    await expect(page.getByTestId('sharia-news-section')).toBeVisible();
    await expect(page.getByTestId('sharia-deep-research-entry')).toBeVisible();
    await page.screenshot({ path: 'artifacts/sharia-integrated-overview-mobile-ar.png', fullPage: true });
    await page.getByRole('button', { name: 'البحث الموثق', exact: true }).click();
    await expect(page.getByTestId('sharia-deep-research-tool')).toBeVisible();
    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      mainPaddingBottom: Number.parseFloat(getComputedStyle(document.querySelector('[data-news-page-shell][dir="rtl"] main')!).paddingBottom),
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.mainPaddingBottom).toBeGreaterThanOrEqual(100);
    await page.screenshot({ path: 'artifacts/sharia-integrated-mobile-ar.png', fullPage: true });
  });

  test('handles an HTML API failure safely and retries the same NVDA search', async ({ page }) => {
    let attempts = 0;
    await page.route('**/api/sharia-research/search', async route => {
      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({ status: 500, contentType: 'text/html', body: '<!DOCTYPE html><title>private server error</title>' });
        return;
      }
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, ok: true, jobId: 'job-test', status: 'queued', progress: 5, currentStep: 'identifying_security' }),
      });
    });
    await page.route('**/api/sharia-research/jobs/job-test', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        ok: true,
        job: { id: 'job-test', status: 'running', progress: 25, currentStep: 'searching_official_sources', candidates: [], partialErrors: [], resultId: null, error: null, expiresAt: '2099-01-01T00:00:00.000Z' },
      }),
    }));

    await page.goto('/sharia-stocks?tab=research');
    await page.getByRole('textbox', { name: 'اسم الشركة أو الرمز أو ISIN' }).fill('NVDA');
    await page.getByRole('button', { name: 'ابدأ البحث الموثق' }).click();
    await expect(page.getByText('تعذر الاتصال بخدمة البحث. يرجى المحاولة مرة أخرى.')).toBeVisible();
    await expect(page.getByText(/Unexpected token|<!DOCTYPE/)).toHaveCount(0);
    await page.getByRole('button', { name: 'إعادة المحاولة' }).click();
    await expect(page.getByText('تقدم البحث')).toBeVisible();
    expect(attempts).toBe(2);
  });
});
