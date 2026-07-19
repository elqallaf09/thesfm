import { expect, test } from '@playwright/test';
import { userAuthStatePath } from './auth-state';

const userAuthConfigured = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const legacyPath = '/market-analysis?symbol=AAPL&assetType=STOCK&horizon=SWING&autoRun=1&filters=%7B%22range%22%3A%221M%22%7D&return=%2Fwatchlist%3Fsort%3Dnewest';

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test.describe('authentication deep-link preservation', () => {
  test('a guest retains the full legacy destination and benign fragment at login', async ({ page }) => {
    await page.goto(`${legacyPath}#watchlist`, { waitUntil: 'domcontentloaded' });
    await expect.poll(() => new URL(page.url()).pathname).toBe('/login');

    const loginUrl = new URL(page.url());
    expect(loginUrl.searchParams.get('next')).toBe(legacyPath);
    expect(loginUrl.hash).toBe('#watchlist');
    expect(loginUrl.search).toBe(`?next=${encodeURIComponent(legacyPath)}`);
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
  });
});
