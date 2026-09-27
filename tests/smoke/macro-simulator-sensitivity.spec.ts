import { expect, test } from '@playwright/test';
import { copy, templateLabels } from '../../src/components/macro-simulator/copy';
import { sensitivityCopy } from '../../src/components/macro-simulator/sensitivity-copy';
import { TR_MACRO_SIMULATOR } from '../../src/lib/translations/macro-simulator';

// Normal guest path; recordings exclude login, account data and browser storage.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

for (const locale of ['ar', 'en', 'fr'] as const) {
  test(`sensitivity varies one shock, preserves the draft boundary and translates navigation (${locale})`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const t = (key: keyof typeof sensitivityCopy) => sensitivityCopy[key][locale];
    await page.addInitScript(language => {
      localStorage.setItem('sfm_lang', language);
      localStorage.setItem('the-sfm-theme', 'light');
    }, locale);
    await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
    await page.locator('button.guest-btn').first().click();
    await page.waitForURL(/\/dashboard(?:\?|$)/);
    await page.goto('/economic-intelligence/simulator', { waitUntil: 'domcontentloaded' });
    const lab = page.getByTestId('macro-lab');
    await expect(lab).toHaveCount(1);
    await expect(lab).toHaveAttribute('data-hydrated', 'true');
    await expect(lab).toHaveAttribute('lang', locale);
    await expect(page.locator('.sfm-global-brand-copy')).toContainText(TR_MACRO_SIMULATOR.nav_macro_simulator[locale]);
    await expect(page.locator('.sfm-global-brand-copy')).not.toContainText('nav_macro_simulator');
    const panel = lab.getByTestId('macro-sensitivity');
    const run = lab.getByTestId('macro-run');
    await expect(panel).toHaveCount(0);
    await lab.getByRole('button', { name: templateLabels.compound[locale], exact: true }).click();
    await run.click();
    await expect(panel).toBeVisible();
    await expect(panel.locator('tbody tr')).toHaveCount(5);
    await expect(panel.locator('tr[data-baseline="true"]')).toHaveAttribute('data-magnitude', '50');
    await panel.getByLabel(t('path'), { exact: true }).selectOption('amplified');
    await panel.getByLabel(t('shock'), { exact: true }).selectOption('oilSupply');
    await expect(panel.locator('tr[data-baseline="true"]')).toHaveAttribute('data-magnitude', '25');
    const results = lab.getByTestId('macro-results');
    const scenarioCards = results.locator('article');
    await expect(scenarioCards).toHaveCount(3);
    const originalResults = await scenarioCards.allTextContents();
    await panel.locator('tr[data-magnitude="30"]').getByRole('button').click();
    await expect(lab.getByLabel(copy.magnitude[locale], { exact: false }).nth(1)).toHaveValue('30');
    await expect(lab.getByLabel(copy.expected[locale], { exact: false })).toHaveValue('25');
    await expect(panel.getByTestId('macro-sensitivity-stale')).toBeVisible();
    for (const button of await panel.getByRole('button').all()) await expect(button).toBeDisabled();
    await expect(lab.getByText(copy.stale[locale], { exact: true })).toBeVisible();
    // The intentional stale warning may change section text, but never its outcomes.
    await expect(scenarioCards).toHaveCount(3);
    expect(await scenarioCards.allTextContents()).toEqual(originalResults);
    await run.click();
    await expect(panel.getByTestId('macro-sensitivity-stale')).toHaveCount(0);
    await expect(panel.locator('tr[data-baseline="true"]')).toHaveAttribute('data-magnitude', '30');
    await expect(panel.getByLabel(t('path'), { exact: true })).toHaveValue('amplified');
    await expect(panel.getByRole('img', { name: t('chart'), exact: false })).toBeVisible();

    const widths = testInfo.project.name === 'chromium-desktop' ? [1440, 820] : [390, 360];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1000 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(4);
      await expect.poll(() => panel.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(4);
    }
    await testInfo.attach(`sensitivity-light-${locale}`, { body: await panel.screenshot(), contentType: 'image/png' });
    await page.evaluate(() => { document.documentElement.classList.remove('light'); document.documentElement.classList.add('dark'); });
    await testInfo.attach(`sensitivity-dark-${locale}`, { body: await panel.screenshot(), contentType: 'image/png' });

    await lab.getByRole('button', { name: copy.challenge[locale], exact: true }).click();
    await expect(panel).toHaveCount(0);
    await lab.getByLabel(copy.guess[locale], { exact: true }).selectOption('negative');
    await lab.getByLabel(copy.notes[locale], { exact: true }).fill('A recorded hypothesis before revealing an educational scenario.');
    await run.click();
    await expect(results).toBeVisible();
    await expect(panel).toHaveCount(0);
  });
}
