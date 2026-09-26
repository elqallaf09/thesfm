import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { ASSETS, defaultInput, readSnapshot, snapshot, template } from '../../src/domain/macro-simulator/engine';
import { assetLabels, copy, type CopyKey } from '../../src/components/macro-simulator/copy';

// Use the application's normal guest entry, never a production auth bypass.
// Record only the synthetic simulator canvas, not login DOM or account data.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });

for (const locale of ['ar', 'en', 'fr'] as const) {
  test(`macro simulator controls, challenge and snapshots (${locale})`, async ({ page }, testInfo) => {
    test.setTimeout(150_000);
    const t = (key: CopyKey) => copy[key][locale];
    await page.addInitScript(language => {
      localStorage.setItem('sfm_lang', language);
      localStorage.setItem('sfm_theme', 'light');
      localStorage.setItem('the-sfm-theme', 'light');
    }, locale);
    await page.goto('/login?mode=register', { waitUntil: 'domcontentloaded' });
    await page.locator('button.guest-btn').first().click();
    await page.waitForURL(/\/dashboard(?:\?|$)/);
    await page.goto('/economic-intelligence/simulator', { waitUntil: 'domcontentloaded' });
    const lab = page.getByTestId('macro-lab');
    const results = lab.getByTestId('macro-results');
    const run = lab.getByTestId('macro-run');
    const form = lab.locator('form');
    const button = (key: CopyKey) => lab.getByRole('button', { name: t(key), exact: true });
    const validForm = () => form.evaluate(element => (element as HTMLFormElement).checkValidity());
    await expect(lab).toBeVisible();
    await expect(lab).toHaveAttribute('lang', locale);
    await expect(lab).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
    await expect(lab.getByText(t('disclaimer'), { exact: true })).toBeVisible();
    await expect(results).toHaveCount(0);

    await test.step('explicit execution, allocations, stale output and comparison', async () => {
      await run.focus();
      await page.keyboard.press('Enter');
      await expect(results).toBeVisible();
      await expect(results.locator('article')).toHaveCount(3);
      const markets = lab.locator('section').filter({ has: lab.getByRole('heading', { name: t('markets'), exact: true }) });
      await expect(markets.locator('article')).toHaveCount(ASSETS.length);
      await expect(results.getByText(t('noProbability'), { exact: true })).toBeVisible();
      await button('pin').click();
      const goldWeight = lab.getByLabel(`${assetLabels.gold[locale]} (%)`, { exact: true });
      await goldWeight.fill(String(defaultInput().weights.gold + 1));
      await expect(run).toBeDisabled();
      await expect(lab.getByText(t('weights'), { exact: true })).toBeVisible();
      await goldWeight.fill(String(defaultInput().weights.gold));
      await lab.getByLabel(t('magnitude'), { exact: false }).first().fill('75');
      await expect(lab.getByText(t('stale'), { exact: true })).toBeVisible();
      await expect(button('pin')).toBeDisabled();
      await run.click();
      await expect(lab.getByText(t('stale'), { exact: true })).toHaveCount(0);
      await expect(lab.getByRole('heading', { name: t('comparison'), exact: true })).toBeVisible();
      await lab.getByLabel(t('capital'), { exact: true }).fill('200000');
      await run.click();
      await expect(lab.getByText(t('incomparable'), { exact: true })).toBeVisible();
      await lab.getByLabel(t('chartAsset'), { exact: true }).selectOption('portfolio');
      await lab.getByText(t('chartTable'), { exact: true }).click();
      await expect(lab.locator('details[open] table tbody tr')).toHaveCount(8);
    });

    await test.step('new oil shocks satisfy native input steps and compound limits', async () => {
      await button('reset').click();
      await lab.getByLabel(t('event'), { exact: true }).selectOption('oilSupply');
      await expect(lab.getByLabel(t('magnitude'), { exact: false })).toHaveValue('10');
      expect(await validForm()).toBe(true);
      await run.click();
      await expect(results).toBeVisible();
      await button('reset').click();
      const add = lab.getByRole('button', { name: `+ ${t('add')}`, exact: true });
      for (let count = 2; count <= 4; count += 1) {
        await add.click();
        await expect(form.locator('fieldset')).toHaveCount(count);
        expect(await validForm()).toBe(true);
      }
      await expect(add).toBeDisabled();
      const kinds = await form.locator('fieldset select').evaluateAll(elements => elements.map(element => (element as HTMLSelectElement).value));
      expect(new Set(kinds).size).toBe(4);
      await run.click();
      await expect(results).toBeVisible();
      const widths = testInfo.project.name === 'chromium-desktop' ? [1440, 820] : [390, 360];
      for (const width of widths) {
        await page.setViewportSize({ width, height: 1000 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(4);
        await expect.poll(() => lab.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(4);
      }
      await testInfo.attach(`macro-${locale}-${testInfo.project.name}`, { body: await lab.screenshot(), contentType: 'image/png' });
    });

    await test.step('challenge requires a recorded decision and hides edited results', async () => {
      await button('reset').click();
      await button('challenge').click();
      await expect(results).toHaveCount(0);
      await lab.getByLabel(t('guess'), { exact: true }).selectOption('negative');
      await run.click();
      await expect(lab.getByRole('alert')).toHaveText(t('challengeRequired'));
      await expect(results).toHaveCount(0);
      await lab.getByLabel(t('notes'), { exact: true }).fill('Hypothesis recorded before revealing the educational result.');
      await run.click();
      await expect(results).toBeVisible();
      await lab.getByLabel(t('magnitude'), { exact: false }).first().fill('25');
      await expect(results).toHaveCount(0);
      await run.click();
      await expect(results).toBeVisible();
      await button('lab').click();
      await button('reset').click();
    });

    await test.step('validated per-tab drafts, exported assumptions and untrusted imports', async () => {
      const title = lab.getByLabel(t('scenarioName'), { exact: true });
      const savedInput = { ...defaultInput(), title: `Macro QA ${locale}` };
      await title.fill(savedInput.title);
      await button('save').click();
      await expect(lab.getByRole('status')).toHaveText(t('saved'));
      await lab.getByLabel(t('capital'), { exact: true }).fill('');
      await button('save').click();
      await expect(lab.getByRole('alert')).toHaveText(t('invalid'));
      await button('load').click();
      await expect(title).toHaveValue(savedInput.title);
      await expect(lab.getByLabel(t('capital'), { exact: true })).toHaveValue('100000');
      await expect(lab.getByRole('alert')).toHaveCount(0);
      await expect(results).toHaveCount(0);
      const downloading = page.waitForEvent('download');
      await button('export').click();
      const download = await downloading;
      expect(download.suggestedFilename()).toBe('sfm-macro-scenario-v1.json');
      const path = await download.path();
      if (!path) throw new Error('Expected a local scenario download');
      const exported = await readFile(path, 'utf8');
      expect(readSnapshot(exported)).toEqual(savedInput);
      expect(exported).not.toContain('"scenarios"');
      const upload = lab.locator('input[type="file"]');
      await upload.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{') });
      await expect(lab.getByRole('alert')).toHaveText(t('invalid'));
      await expect(title).toHaveValue(savedInput.title);
      const imported = { ...template('compound'), title: `Imported QA ${locale}` };
      await upload.setInputFiles({ name: 'scenario.json', mimeType: 'application/json', buffer: Buffer.from(snapshot(imported)) });
      await expect(title).toHaveValue(imported.title);
      await expect(results).toHaveCount(0);
      await expect(lab.getByRole('alert')).toHaveCount(0);
      await run.click();
      await expect(results).toBeVisible();
      await button('method').click();
      await expect(results).toHaveCount(0);
      await expect(lab.getByText(t('noCalibration'), { exact: true })).toBeVisible();
    });
  });
}
