import { expect, test, type Page } from '@playwright/test';

test.setTimeout(60_000);

const DIRECTORY_RESPONSE = {
  ok: true,
  page: 1,
  limit: 25,
  total: 2,
  items: [
    { id: '10000000-0000-4000-8000-000000000001', canonicalName: 'XTB', normalizedName: 'xtb', slug: 'xtb', platformType: 'multi_asset_broker', websiteUrl: null, logoUrl: null, countryCode: null, aliases: [], status: 'approved', isSeeded: true },
    { id: '10000000-0000-4000-8000-000000000002', canonicalName: 'Interactive Brokers', normalizedName: 'interactive brokers', slug: 'interactive-brokers', platformType: 'multi_asset_broker', websiteUrl: null, logoUrl: null, countryCode: null, aliases: [], status: 'approved', isSeeded: true },
  ],
};

async function enterGuestInvestments(page: Page) {
  await page.addInitScript(() => window.localStorage.setItem('sfm_lang', 'en'));
  await page.route('**/api/investment-platforms?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DIRECTORY_RESPONSE) }));
  await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
  await page.locator('button.guest-btn').click();
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await page.goto('/invest', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main.invest-main')).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(async () => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
}

test('purchase platform remains distinct, keyboard-selectable, persistent, and visible at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await enterGuestInvestments(page);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: /Add Investment/i }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Add Investment' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Market / exchange', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Purchase and custody platform', { exact: true })).toBeVisible();

  const platformSearch = dialog.getByRole('combobox', { name: 'Broker or trading platform' });
  await platformSearch.focus();
  await expect(dialog.getByRole('listbox')).toBeVisible();
  await platformSearch.press('ArrowDown');
  await platformSearch.press('ArrowUp');
  await platformSearch.press('Enter');
  await expect(dialog.getByText('Selected purchase or custody platform')).toBeVisible();
  await expect(dialog.getByText('XTB', { exact: true })).toBeVisible();

  await dialog.getByRole('button', { name: 'Other', exact: true }).click();
  await dialog.getByRole('textbox', { name: /^Name/ }).fill('Platform smoke holding');
  await dialog.getByRole('spinbutton', { name: /^Invested amount/ }).fill('100');
  await dialog.getByRole('spinbutton', { name: /^Current value/ }).fill('125');
  await expectNoHorizontalOverflow(page);
  await dialog.getByRole('button', { name: 'Save Investment', exact: true }).click();
  await expect(dialog).toBeHidden();

  const holding = page.locator('.invest-holding-card').filter({ hasText: 'Platform smoke holding' });
  await expect(holding).toBeVisible();
  await expect(holding.locator('.invest-platform-identity').getByText('XTB', { exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  const restored = page.locator('.invest-holding-card').filter({ hasText: 'Platform smoke holding' });
  await expect(restored.locator('.invest-platform-identity').getByText('XTB', { exact: true })).toBeVisible();

  await restored.getByRole('button', { name: 'View details', exact: true }).click();
  const details = page.getByRole('dialog');
  await expect(details.getByText('Purchase or custody platform', { exact: true })).toBeVisible();
  await expect(details.getByText('XTB', { exact: true })).toBeVisible();
  await details.getByRole('button', { name: 'Close' }).click();

  await restored.getByRole('button', { name: 'More actions', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Edit', exact: true }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit Investment' });
  await expect(editDialog.getByText('XTB', { exact: true })).toBeVisible();
  await editDialog.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'View all assets' }).click();
  const platformFilter = page.getByRole('combobox', { name: 'Purchase or custody platform' });
  await expect(platformFilter).toBeVisible();
  await expect(platformFilter.getByRole('option', { name: 'XTB' })).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
});

const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

// Trading 212 (verified favicon), Binance (verified simpleicons), and an
// unknown crypto exchange (category-icon fallback, no logoUrl).
const VISUAL_DIRECTORY = {
  ok: true, page: 1, limit: 25, total: 3,
  items: [
    { id: '20000000-0000-4000-8000-000000000004', canonicalName: 'Trading 212', normalizedName: 'trading 212', slug: 'trading-212', platformType: 'multi_asset_broker', websiteUrl: null, logoUrl: null, countryCode: null, aliases: [], status: 'approved', isSeeded: true },
    { id: '20000000-0000-4000-8000-000000000011', canonicalName: 'Binance', normalizedName: 'binance', slug: 'binance', platformType: 'crypto_exchange', websiteUrl: null, logoUrl: null, countryCode: null, aliases: [], status: 'approved', isSeeded: true },
    { id: '20000000-0000-4000-8000-0000000000ff', canonicalName: 'Obscure Local Exchange', normalizedName: 'obscure local exchange', slug: 'obscure-local-exchange', platformType: 'crypto_exchange', websiteUrl: null, logoUrl: null, countryCode: null, aliases: [], status: 'approved', isSeeded: false },
  ],
};

async function openPlatformDirectory(page: Page, lang: 'en' | 'ar') {
  await page.addInitScript(l => window.localStorage.setItem('sfm_lang', l), lang);
  // Verified logo hosts return a real pixel; the resolver output is what we test.
  await page.route('**google.com/s2/favicons**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
  await page.route('**cdn.simpleicons.org/**', route => route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }));
  await page.route('**/api/investment-platforms?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(VISUAL_DIRECTORY) }));
  await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
  await page.locator('button.guest-btn').click();
  await page.waitForURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 });
  await page.goto('/invest', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('main.invest-main')).toBeVisible();
  // Language-independent selectors: the add trigger and platform combobox are
  // located structurally so the same flow works in English and Arabic. Platform
  // names in the results are data (never translated).
  await page.locator('button.invest-primary-btn').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const combobox = dialog.locator('.invest-platform-combobox input[role="combobox"]');
  await combobox.focus();
  await expect(dialog.locator('.invest-platform-results')).toBeVisible();
  return dialog;
}

for (const [lang, dir, width] of [['en', 'ltr', 1280], ['ar', 'rtl', 390]] as const) {
  test(`platform directory rows show a verified logo or a safe category icon (${lang} ${dir}, ${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const dialog = await openPlatformDirectory(page, lang);
    await expect(page.locator('html')).toHaveAttribute('dir', dir);
    const listbox = dialog.getByRole('listbox');

    const verifiedRow = listbox.getByRole('option', { name: /Trading 212/ });
    const cryptoVerifiedRow = listbox.getByRole('option', { name: /Binance/ });
    const unknownRow = listbox.getByRole('option', { name: /Obscure Local Exchange/ });

    // Every row starts with exactly one platform avatar.
    for (const row of [verifiedRow, cryptoVerifiedRow, unknownRow]) {
      await expect(row.locator('.platform-avatar')).toHaveCount(1);
    }

    // Verified platforms render exactly one loaded logo image, no fallback icon.
    for (const row of [verifiedRow, cryptoVerifiedRow]) {
      const avatar = row.locator('.platform-avatar');
      await expect(avatar.locator('img')).toHaveCount(1);
      await expect.poll(() => avatar.locator('img').evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      await expect(avatar.locator('svg')).toHaveCount(0);
      await expect(avatar).toHaveAttribute('data-fallback', 'false');
    }

    // Unknown platform shows a single semantic category icon, no broken image.
    const unknownAvatar = unknownRow.locator('.platform-avatar');
    await expect(unknownAvatar.locator('img')).toHaveCount(0);
    await expect(unknownAvatar.locator('svg')).toHaveCount(1);
    await expect(unknownAvatar).toHaveAttribute('data-category', 'crypto');

    // Consistent avatar size across rows, and no row/logo overlap with the label.
    const sizes = await listbox.locator('.platform-avatar').evaluateAll(nodes => nodes.map(n => {
      const r = n.getBoundingClientRect();
      return `${Math.round(r.width)}x${Math.round(r.height)}`;
    }));
    expect(new Set(sizes).size).toBe(1);

    await expectNoHorizontalOverflow(page);
  });
}
