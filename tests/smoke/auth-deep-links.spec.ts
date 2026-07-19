import { expect, test } from '@playwright/test';
import { userAuthStatePath } from './auth-state';

const userAuthConfigured = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const legacyPath = '/market-analysis?symbol=AAPL&assetType=STOCK&horizon=SWING&autoRun=1&filters=%7B%22range%22%3A%221M%22%7D&return=%2Fwatchlist%3Fsort%3Dnewest';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test.describe('authentication deep-link preservation', () => {
  test('a guest resolves a legacy market-analysis link to its canonical public route with query and fragment intact', async ({ page }) => {
    const canonicalPath = '/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&autoRun=1&filters=%7B%22range%22%3A%221M%22%7D&return=%2Fwatchlist%3Fsort%3Dnewest#details';
    await page.goto(`${legacyPath}#details`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(url => `${url.pathname}${url.search}${url.hash}` === canonicalPath);
    await expect(page.getByTestId('ai-analyst-workspace')).toBeVisible();
  });

  test('a guest resolves a personal legacy alias to the canonical sign-in gate', async ({ page }) => {
    await page.goto('/watchlist?sort=newest#positions', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(url => `${url.pathname}${url.search}${url.hash}` === '/ai-analyst/watchlist?sort=newest#positions');
    await expect(page.getByTestId('ai-analyst-watchlist-locked')).toBeVisible();
  });

  test.describe('authenticated user', () => {
    test.use({ storageState: userAuthStatePath });

    test('returns through the legacy adapter with the full query and fragment intact', async ({ page }) => {
      test.skip(!userAuthConfigured, 'Real authenticated redirect coverage requires the configured Preview user fixture.');
      const canonicalPath = '/ai-analyst/analyze/AAPL?assetType=STOCK&horizon=SWING&autoRun=1&filters=%7B%22range%22%3A%221M%22%7D&return=%2Fwatchlist%3Fsort%3Dnewest#details';
      await page.goto(`/login?next=${encodeURIComponent(legacyPath)}#details`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForURL(url => `${url.pathname}${url.search}${url.hash}` === canonicalPath);
      await expect(page.getByTestId('ai-analyst-workspace')).toBeVisible();
    });

    test('returns to a genuinely protected destination without dropping nested query parameters', async ({ page }) => {
      test.skip(!userAuthConfigured, 'Real authenticated redirect coverage requires the configured Preview user fixture.');
      const protectedPath = '/settings?section=security&filters=%7B%22range%22%3A%221M%22%7D&return=%2Fwatchlist%3Fsort%3Dnewest';
      await page.goto(`/login?next=${encodeURIComponent(protectedPath)}`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL(url => `${url.pathname}${url.search}${url.hash}` === protectedPath);
    });
  });
});
