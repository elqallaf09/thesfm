import { expect, test } from '@playwright/test';
import { createTraderDrawerFixture, openTraderDrawerFixture } from './helpers/trader-drawer-fixture';

let fixture: Awaited<ReturnType<typeof createTraderDrawerFixture>>;
test.beforeAll(async () => { fixture = await createTraderDrawerFixture(); });
test.afterAll(async () => { await fixture.close(); });

for (const language of ['ar', 'en', 'fr']) {
  for (const theme of ['light', 'dark']) {
    test.describe(`Trader drawer ${language} ${theme}`, () => {
      test('open and close own focus synchronously, with no delayed focus theft', async ({ page }, testInfo) => {
        const frame = await openTraderDrawerFixture(page, fixture.origin, language, theme);
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        const result = await frame.evaluate(() => {
          const trigger = document.querySelector<HTMLButtonElement>('[data-symbol-details="AAPL"]')!;
          trigger.focus(); trigger.click();
          const focusedAtOpen = document.activeElement?.id;
          document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
          const returnedAtClose = document.activeElement === trigger;
          const closed = !document.querySelector('[data-symbol-drawer]');
          trigger.click();
          const share = document.querySelector<HTMLButtonElement>('[data-drawer-share]')!;
          share.focus();
          return { focusedAtOpen, returnedAtClose, closed };
        });
        await testInfo.attach('synchronous-focus', { body: JSON.stringify(result), contentType: 'application/json' });
        // Allow actual pending animation frames to run, without adding a retry workaround.
        await frame.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        expect.soft(result.focusedAtOpen).toBe('drawer-tab-summary');
        expect.soft(result.returnedAtClose).toBe(true);
        expect.soft(result.closed).toBe(true);
        await expect(frame.locator('[data-drawer-share]')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(frame.locator('[data-symbol-drawer]')).toHaveCount(0);
        expect(errors).toEqual([]);
      });

      test('compare and watchlist redraw preserve the activated action and panel position', async ({ page }, testInfo) => {
        const frame = await openTraderDrawerFixture(page, fixture.origin, language, theme);
        await frame.locator('[data-symbol-details="AAPL"]').first().click();
        const result = await frame.evaluate(() => {
          const compare = document.querySelector<HTMLButtonElement>('[data-drawer-compare]')!;
          compare.focus(); compare.click();
          const compareFocus = document.activeElement?.hasAttribute('data-drawer-compare');
          const compareActive = document.querySelector('[data-drawer-compare]')?.classList.contains('is-active');
          const watch = document.querySelector<HTMLButtonElement>('[data-drawer-watch]')!;
          watch.focus(); watch.click();
          const watchFocus = document.activeElement?.hasAttribute('data-drawer-watch');
          return { compareFocus, compareActive, watchFocus };
        });
        await testInfo.attach('redraw-focus', { body: JSON.stringify(result), contentType: 'application/json' });
        expect.soft(result.compareFocus).toBe(true);
        expect.soft(result.compareActive).toBe(true);
        expect.soft(result.watchFocus).toBe(true);
        // Real keyboard tab switching remains RTL-aware and selects only one tab.
        await frame.locator('#drawer-tab-summary').focus();
        await page.keyboard.press(language === 'ar' ? 'ArrowLeft' : 'ArrowRight');
        await expect(frame.locator('#drawer-tab-technical')).toBeFocused();
        await expect(frame.locator('#drawer-tab-technical')).toHaveAttribute('aria-selected', 'true');
        await expect(frame.locator('[data-drawer-tab][aria-selected="true"]')).toHaveCount(1);
        expect(await frame.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await frame.evaluate(() => innerWidth) + 1);
        await testInfo.attach('drawer-after-actions', { body: await page.screenshot({ scale: 'css' }), contentType: 'image/png' });
      });

      test('Tab ignores negative/hidden controls and Escape respects a consumed key', async ({ page }, testInfo) => {
        const frame = await openTraderDrawerFixture(page, fixture.origin, language, theme);
        await frame.locator('[data-symbol-details="AAPL"]').first().click();
        const result = await frame.evaluate(() => {
          const drawer = document.querySelector<HTMLElement>('[data-symbol-drawer]')!;
          // Adversarial DOM controls: never become part of the modal tab order.
          const hidden = document.createElement('div'); hidden.hidden = true;
          hidden.innerHTML = '<button>Hidden child</button>';
          const negative = document.createElement('button'); negative.tabIndex = -1; negative.textContent = 'Programmatic only';
          drawer.append(hidden, negative);
          const close = drawer.querySelector<HTMLButtonElement>('.drawer-close')!; close.focus();
          close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
          const wrapsToShare = document.activeElement?.hasAttribute('data-drawer-share');
          hidden.remove(); negative.remove();
          const consumed = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
          consumed.preventDefault(); document.activeElement?.dispatchEvent(consumed);
          return { wrapsToShare, retainedAfterConsumedEscape: !!document.querySelector('[data-symbol-drawer]') };
        });
        await testInfo.attach('keyboard-guards', { body: JSON.stringify(result), contentType: 'application/json' });
        expect.soft(result.wrapsToShare).toBe(true);
        expect.soft(result.retainedAfterConsumedEscape).toBe(true);
      });
    });
  }
}
