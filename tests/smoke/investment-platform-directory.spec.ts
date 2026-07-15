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
  await expect(holding.getByText('XTB', { exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  const restored = page.locator('.invest-holding-card').filter({ hasText: 'Platform smoke holding' });
  await expect(restored.getByText('XTB', { exact: true })).toBeVisible();

  await restored.getByRole('button', { name: 'Details', exact: true }).click();
  const details = page.getByRole('dialog');
  await expect(details.getByText('Purchase or custody platform', { exact: true })).toBeVisible();
  await expect(details.getByText('XTB', { exact: true })).toBeVisible();
  await details.getByRole('button', { name: 'Close' }).click();

  await restored.getByRole('button', { name: 'Edit' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Edit Investment' });
  await expect(editDialog.getByText('XTB', { exact: true })).toBeVisible();
  await editDialog.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'View all assets' }).click();
  const platformFilter = page.getByRole('combobox', { name: 'Purchase or custody platform' });
  await expect(platformFilter).toBeVisible();
  await expect(platformFilter.getByRole('option', { name: 'XTB' })).toHaveCount(1);
  await expectNoHorizontalOverflow(page);
});
