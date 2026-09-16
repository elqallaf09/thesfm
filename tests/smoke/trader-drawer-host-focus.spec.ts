import { expect, test } from '@playwright/test';
import { createTraderDrawerFixture, openTraderDrawerFixture } from './helpers/trader-drawer-fixture';

let fixture: Awaited<ReturnType<typeof createTraderDrawerFixture>>;
test.beforeAll(async () => { fixture = await createTraderDrawerFixture(); });
test.afterAll(async () => { await fixture.close(); });

for (const language of ['ar', 'en', 'fr']) {
  for (const theme of ['light', 'dark']) {
    test(`Trader drawer respects parent focus and nested dialog: ${language} ${theme}`, async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const frame = await openTraderDrawerFixture(page, fixture.origin, language, theme);
      await frame.locator('[data-symbol-details="AAPL"]').first().click();
      await frame.locator('[data-drawer-share]').focus();
      // Equivalent to a user focusing a global-shell control outside the iframe.
      await page.evaluate(() => {
        const control = document.createElement('button');
        control.id = 'parent-control'; control.textContent = 'Isolated host control';
        document.body.append(control); control.focus();
      });
      await expect(page.locator('#parent-control')).toBeFocused();
      expect(await frame.evaluate(() => document.hasFocus())).toBe(false);
      await frame.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'sfm_lang' })));
      await expect(page.locator('#parent-control')).toBeFocused();
      expect(await frame.evaluate(() => document.hasFocus())).toBe(false);
      await page.locator('#parent-control').evaluate(element => element.remove());
      await frame.locator('.drawer-close').focus();
      await frame.evaluate(() => {
        const dialog = document.createElement('dialog');
        dialog.id = 'nested-dialog'; dialog.innerHTML = '<button>Native dialog</button>';
        document.body.append(dialog); dialog.showModal();
      });
      await page.keyboard.press('Escape');
      await expect(frame.locator('#nested-dialog')).not.toBeVisible();
      await expect(frame.locator('[data-symbol-drawer]')).toBeVisible();
      await frame.locator('#nested-dialog').evaluate(element => element.remove());
      await frame.locator('.drawer-close').focus();
      await frame.evaluate(next => {
        const bridge = (window as Window & { SFMTraderTheme?: { apply: (preference: string, resolved: string) => void } }).SFMTraderTheme;
        if (!bridge) throw new Error('Missing production theme bridge');
        bridge.apply(next, next);
      }, theme === 'light' ? 'dark' : 'light');
      await expect(frame.locator('.drawer-close')).toBeFocused();
      await testInfo.attach('switched-drawer', { body: await page.screenshot({ scale: 'css' }), contentType: 'image/png' });
      await page.keyboard.press('Escape');
      await expect(frame.locator('[data-symbol-drawer]')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
}
